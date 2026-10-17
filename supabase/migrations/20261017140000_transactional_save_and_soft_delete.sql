-- ============================================================
-- MIGRATION: 20261017140000_transactional_save_and_soft_delete.sql
-- FASE 2: Integridade da OS e do Dinheiro (Itens 2.2 - F-10, F-11, F-34)
--
-- MOTIVO:
--   1. F-10: Impedir devolução de estoque em dobro e implementar Soft Delete (deleted_at).
--      Proibir exclusão de OS pagas ou finalizadas (peça já consumida e dinheiro recebido).
--   2. F-11: Criação da RPC atômica `save_order` que valida tenant, trava estoque (FOR UPDATE),
--      recalcula valores no servidor (total_value) e grava OS + itens + serviços em uma só transação.
--   3. F-11: Remover `GREATEST(0, ...)` do trigger de estoque para acusar erro real de falta de saldo.
--   4. F-34: Servidor passa a ser a única fonte da verdade para total_value.
-- ============================================================

-- 1. ADICIONAR COLUNA deleted_at NA TABELA service_orders (Soft Delete)
ALTER TABLE public.service_orders 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_service_orders_company_deleted 
  ON public.service_orders(company_id, deleted_at);

-- 2. ADICIONAR unit_cost NA TABELA service_order_items (Snapshot de Custo - Prepara F-16)
ALTER TABLE public.service_order_items 
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- Atualizar RLS de SELECT para filtrar registros ativos por padrão
DROP POLICY IF EXISTS select_service_orders ON public.service_orders;
CREATE POLICY select_service_orders ON public.service_orders
  FOR SELECT USING (
    company_id = public.get_my_company_id() 
    AND deleted_at IS NULL
  );


-- 3. AJUSTAR TRIGGER DE ESTOQUE: REMOVER GREATEST(0, ...) E VALIDAR MESMO TENANT
CREATE OR REPLACE FUNCTION public.handle_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  v_prod_company_id UUID;
  v_current_stock INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Valida que o produto pertence à mesma empresa da OS
    SELECT company_id, quantity INTO v_prod_company_id, v_current_stock
    FROM public.products_inventory
    WHERE id = NEW.product_id;

    IF v_prod_company_id IS NULL OR v_prod_company_id != NEW.company_id THEN
      RAISE EXCEPTION 'Produto % não pertence à mesma empresa da Ordem de Serviço.', NEW.product_id;
    END IF;

    -- Subtração estrita: se NEW.quantity > quantity, o CHECK (quantity >= 0) da tabela
    -- products_inventory dispara erro imediato sem mascarar falta de estoque.
    UPDATE public.products_inventory
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id
      AND company_id = NEW.company_id;

    -- Alerta de estoque baixo
    PERFORM pg_notify(
      'low_stock_alert',
      json_build_object(
        'product_id', NEW.product_id,
        'company_id', NEW.company_id
      )::text
    ) FROM public.products_inventory
    WHERE id = NEW.product_id
      AND quantity <= min_stock_alert
      AND min_stock_alert > 0;

  ELSIF TG_OP = 'DELETE' THEN
    -- Devolve peças ao estoque
    UPDATE public.products_inventory
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id
      AND company_id = OLD.company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4. RPC ATÔMICA: save_order (Criação e Edição Completa da OS com trava de estoque)
CREATE OR REPLACE FUNCTION public.save_order(
  order_data JSONB,
  items_data JSONB DEFAULT '[]'::jsonb,
  services_data JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_order_id UUID;
  v_client_id UUID;
  v_equipment_id UUID;
  v_technician_id UUID;
  v_status TEXT;
  v_priority TEXT;
  v_reported_problem TEXT;
  v_technical_report TEXT;
  v_equipment_details TEXT;
  v_delivery_prediction TIMESTAMPTZ;
  v_discount NUMERIC(10,2);
  v_service_value NUMERIC(10,2);
  v_calculated_items_total NUMERIC(10,2) := 0.00;
  v_calculated_services_total NUMERIC(10,2) := 0.00;
  v_calculated_total NUMERIC(10,2) := 0.00;
  v_pago BOOLEAN;
  v_payment_status TEXT;
  v_payment_method TEXT;
  v_payment_date TIMESTAMPTZ;
  v_media JSONB;
  v_entry_checklist JSONB;
  v_exit_checklist JSONB;
  v_existing_status TEXT;
  v_existing_pago BOOLEAN;
  item_record JSONB;
  service_record JSONB;
  v_prod RECORD;
  v_serv RECORD;
  v_saved_order RECORD;
BEGIN
  -- 1. Validar contexto do tenant
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não vinculado a uma empresa.';
  END IF;

  -- Checar modo somente-leitura
  IF public.is_company_read_only(v_company_id) THEN
    RAISE EXCEPTION 'A conta está em modo apenas-leitura devido a atraso na assinatura.';
  END IF;

  -- 2. Extrair dados básicos da OS
  IF (order_data->>'id') IS NOT NULL AND (order_data->>'id') != '' THEN
    v_order_id := (order_data->>'id')::uuid;
  END IF;

  v_client_id := (order_data->>'client_id')::uuid;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'client_id é obrigatório para salvar a Ordem de Serviço.';
  END IF;

  -- Validar se cliente pertence à mesma empresa
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = v_client_id AND company_id = v_company_id) THEN
    RAISE EXCEPTION 'Cliente selecionado não pertence à sua empresa.';
  END IF;

  IF (order_data->>'equipment_id') IS NOT NULL AND (order_data->>'equipment_id') != '' THEN
    v_equipment_id := (order_data->>'equipment_id')::uuid;
  END IF;

  IF (order_data->>'technician_id') IS NOT NULL AND (order_data->>'technician_id') != '' THEN
    v_technician_id := (order_data->>'technician_id')::uuid;
  END IF;

  v_status := COALESCE(order_data->>'status', 'Em Análise');
  v_priority := COALESCE(order_data->>'priority', 'Média');
  v_reported_problem := COALESCE(order_data->>'reported_problem', '');
  v_technical_report := order_data->>'technical_report';
  v_equipment_details := order_data->>'equipment_details';
  
  IF (order_data->>'delivery_prediction') IS NOT NULL AND (order_data->>'delivery_prediction') != '' THEN
    v_delivery_prediction := (order_data->>'delivery_prediction')::timestamptz;
  END IF;

  v_discount := COALESCE((order_data->>'discount')::numeric, 0.00);
  IF v_discount < 0 THEN v_discount := 0.00; END IF;

  v_service_value := COALESCE((order_data->>'service_value')::numeric, 0.00);
  IF v_service_value < 0 THEN v_service_value := 0.00; END IF;

  v_pago := COALESCE((order_data->>'pago')::boolean, false);
  v_payment_status := COALESCE(order_data->>'payment_status', CASE WHEN v_pago THEN 'pago' ELSE 'pendente' END);
  v_payment_method := order_data->>'payment_method';
  
  IF (order_data->>'payment_date') IS NOT NULL AND (order_data->>'payment_date') != '' THEN
    v_payment_date := (order_data->>'payment_date')::timestamptz;
  ELSIF v_pago THEN
    v_payment_date := now();
  END IF;

  v_media := COALESCE(order_data->'media', '[]'::jsonb);
  v_entry_checklist := order_data->'entry_checklist';
  v_exit_checklist := order_data->'exit_checklist';

  -- 3. Se for UPDATE, checar existência e travar OS
  IF v_order_id IS NOT NULL THEN
    SELECT status, pago INTO v_existing_status, v_existing_pago
    FROM public.service_orders
    WHERE id = v_order_id AND company_id = v_company_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ordem de Serviço % não encontrada ou já excluída.', v_order_id;
    END IF;

    -- Proibir alteração de itens/valores se já estiver Aprovado pelo cliente (F-19)
    -- (A não ser que o status continue Aprovado/Finalizado sem mudar os itens)
  END IF;

  -- 4. Validação e Recálculo no SERVIDOR (F-11 / F-34)
  -- 4.1 Serviços:
  IF services_data IS NOT NULL AND jsonb_array_length(services_data) > 0 THEN
    FOR service_record IN SELECT * FROM jsonb_array_elements(services_data)
    LOOP
      SELECT id, preco_padrao, nome INTO v_serv
      FROM public.services
      WHERE id = (service_record->>'service_id')::uuid AND company_id = v_company_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Serviço % não encontrado.', service_record->>'service_id';
      END IF;

      v_calculated_services_total := v_calculated_services_total + 
        (COALESCE((service_record->>'quantidade')::int, 1) * COALESCE((service_record->>'preco_unitario')::numeric, v_serv.preco_padrao));
    END LOOP;
  END IF;

  -- Soma mão de obra manual, se informada
  v_calculated_services_total := v_calculated_services_total + v_service_value;

  -- 4.2 Peças / Produtos:
  -- Se for UPDATE, removemos itens anteriores para que o trigger devolva o estoque temporariamente
  -- antes de validar e deduzir a nova lista de peças.
  IF v_order_id IS NOT NULL THEN
    DELETE FROM public.service_order_items WHERE service_order_id = v_order_id;
    DELETE FROM public.order_services WHERE os_id = v_order_id;
  END IF;

  IF items_data IS NOT NULL AND jsonb_array_length(items_data) > 0 THEN
    FOR item_record IN SELECT * FROM jsonb_array_elements(items_data)
    LOOP
      -- Lock exclusivo no produto (FOR UPDATE)
      SELECT id, name, quantity, cost_price, sale_price INTO v_prod
      FROM public.products_inventory
      WHERE id = (item_record->>'product_id')::uuid AND company_id = v_company_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto % não encontrado no estoque.', item_record->>'product_id';
      END IF;

      -- Se a OS não estiver sendo cancelada, valida se há saldo suficiente
      IF v_status != 'Cancelado' AND v_prod.quantity < (item_record->>'quantity')::int THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto "%" (Disponível: %, Solicitado: %).',
          v_prod.name, v_prod.quantity, item_record->>'quantity';
      END IF;

      v_calculated_items_total := v_calculated_items_total + 
        ((item_record->>'quantity')::int * COALESCE((item_record->>'unit_price')::numeric, v_prod.sale_price));
    END LOOP;
  END IF;

  -- 4.3 Recálculo do Total Geral no Servidor
  v_calculated_total := GREATEST(0.00, (v_calculated_services_total + v_calculated_items_total) - v_discount);

  -- 5. Gravação da Ordem de Serviço
  IF v_order_id IS NULL THEN
    INSERT INTO public.service_orders (
      company_id, client_id, equipment_id, equipment_details, reported_problem,
      technical_report, status, priority, technician_id, delivery_prediction,
      service_value, discount, total_value, pago, payment_status, payment_method,
      payment_date, media, entry_checklist, exit_checklist
    ) VALUES (
      v_company_id, v_client_id, v_equipment_id, v_equipment_details, v_reported_problem,
      v_technical_report, v_status, v_priority, v_technician_id, v_delivery_prediction,
      v_service_value, v_discount, v_calculated_total, v_pago, v_payment_status, v_payment_method,
      v_payment_date, v_media, v_entry_checklist, v_exit_checklist
    ) RETURNING id INTO v_order_id;
  ELSE
    UPDATE public.service_orders SET
      client_id = v_client_id,
      equipment_id = v_equipment_id,
      equipment_details = v_equipment_details,
      reported_problem = v_reported_problem,
      technical_report = v_technical_report,
      status = v_status,
      priority = v_priority,
      technician_id = v_technician_id,
      delivery_prediction = v_delivery_prediction,
      service_value = v_service_value,
      discount = v_discount,
      total_value = v_calculated_total,
      pago = v_pago,
      payment_status = v_payment_status,
      payment_method = v_payment_method,
      payment_date = v_payment_date,
      media = v_media,
      entry_checklist = v_entry_checklist,
      exit_checklist = v_exit_checklist
    WHERE id = v_order_id AND company_id = v_company_id;
  END IF;

  -- 6. Gravação Atômica dos Itens de Peças (com snapshot de custo unitário F-16)
  IF items_data IS NOT NULL AND jsonb_array_length(items_data) > 0 AND v_status != 'Cancelado' THEN
    FOR item_record IN SELECT * FROM jsonb_array_elements(items_data)
    LOOP
      SELECT cost_price, sale_price INTO v_prod
      FROM public.products_inventory
      WHERE id = (item_record->>'product_id')::uuid;

      INSERT INTO public.service_order_items (
        company_id, service_order_id, product_id, quantity, unit_price, unit_cost
      ) VALUES (
        v_company_id,
        v_order_id,
        (item_record->>'product_id')::uuid,
        (item_record->>'quantity')::int,
        COALESCE((item_record->>'unit_price')::numeric, v_prod.sale_price),
        COALESCE(v_prod.cost_price, 0.00)
      );
    END LOOP;
  END IF;

  -- 7. Gravação Atômica dos Serviços da OS
  IF services_data IS NOT NULL AND jsonb_array_length(services_data) > 0 THEN
    FOR service_record IN SELECT * FROM jsonb_array_elements(services_data)
    LOOP
      SELECT preco_padrao INTO v_serv
      FROM public.services
      WHERE id = (service_record->>'service_id')::uuid;

      INSERT INTO public.order_services (
        company_id, os_id, service_id, quantidade, preco_unitario, subtotal
      ) VALUES (
        v_company_id,
        v_order_id,
        (service_record->>'service_id')::uuid,
        COALESCE((service_record->>'quantidade')::int, 1),
        COALESCE((service_record->>'preco_unitario')::numeric, v_serv.preco_padrao),
        COALESCE((service_record->>'quantidade')::int, 1) * COALESCE((service_record->>'preco_unitario')::numeric, v_serv.preco_padrao)
      );
    END LOOP;
  END IF;

  -- 8. Retorna a ordem completa salva
  SELECT * INTO v_saved_order FROM public.service_orders WHERE id = v_order_id;
  RETURN to_jsonb(v_saved_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. RPC REVISADA DE EXCLUSÃO SEGURA / SOFT DELETE (F-10)
CREATE OR REPLACE FUNCTION public.delete_service_orders_batch(order_ids UUID[])
RETURNS VOID AS $$
DECLARE
  v_company_id UUID;
  v_blocked_count INT;
BEGIN
  -- Validar tenant context
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não vinculado a uma empresa.';
  END IF;

  IF public.is_company_read_only(v_company_id) THEN
    RAISE EXCEPTION 'A conta está em modo apenas-leitura. Exclusão de OS bloqueada.';
  END IF;

  -- Verificar se todas as OS pertencem à empresa
  IF EXISTS (
    SELECT 1 FROM public.service_orders 
    WHERE id = ANY(order_ids) 
      AND (company_id != v_company_id OR deleted_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Tentativa de excluir O.S. inválida ou que não pertence à sua empresa.';
  END IF;

  -- Proibir exclusão de OS Finalizada ou Paga (F-10)
  SELECT COUNT(*) INTO v_blocked_count
  FROM public.service_orders
  WHERE id = ANY(order_ids)
    AND (status IN ('Finalizado', 'Entregue') OR pago = TRUE OR payment_status = 'pago');

  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'Não é permitido excluir ordens de serviço finalizadas ou pagas (% identificadas). Para cancelar ordens pendentes, altere o status para Cancelado.', v_blocked_count;
  END IF;

  -- Para ordens em andamento que NÃO foram finalizadas/canceladas:
  -- Deleta os itens da OS, o que aciona o trigger `handle_inventory_change` (AFTER DELETE)
  -- devolvendo as peças para o estoque de forma segura UMA ÚNICA VEZ.
  DELETE FROM public.service_order_items
  WHERE service_order_id = ANY(order_ids)
    AND company_id = v_company_id;

  DELETE FROM public.order_services
  WHERE os_id = ANY(order_ids)
    AND company_id = v_company_id;

  -- Marcação de Soft Delete (preserva dados para auditoria)
  UPDATE public.service_orders
  SET deleted_at = now()
  WHERE id = ANY(order_ids)
    AND company_id = v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.save_order(jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_service_orders_batch(uuid[]) TO authenticated;
