-- ============================================================
-- MIGRATION: 20261026190000_out_of_stock_custom_parts.sql
-- OBJETIVO: Suporte a peças sob encomenda / para pedido na OS
-- 1. Permite peças sem vínculo a estoque prévio (product_id NULL)
-- 2. Campos de status da peça, link do fornecedor, rastreio e custo real
-- 3. Atualização segura de save_order, triggers de estoque e aprovação de orçamento
-- 4. Função RPC para atualização ágil de peças a comprar / recebimento
-- ============================================================

-- 1. Alterar tabela service_order_items para suportar peças sob encomenda
ALTER TABLE public.service_order_items 
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.service_order_items
  ADD COLUMN IF NOT EXISTS custom_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_link TEXT,
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS part_status TEXT NOT NULL DEFAULT 'em_estoque',
  ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(10,2) CHECK (actual_cost >= 0);

ALTER TABLE public.service_order_items DROP CONSTRAINT IF EXISTS service_order_items_part_status_check;
ALTER TABLE public.service_order_items ADD CONSTRAINT service_order_items_part_status_check 
  CHECK (part_status IN ('em_estoque', 'pendente', 'a_comprar', 'pedido_realizado', 'recebido'));

ALTER TABLE public.service_order_items DROP CONSTRAINT IF EXISTS service_order_items_product_or_custom_check;
ALTER TABLE public.service_order_items ADD CONSTRAINT service_order_items_product_or_custom_check 
  CHECK (product_id IS NOT NULL OR (custom_name IS NOT NULL AND length(trim(custom_name)) > 0));

CREATE INDEX IF NOT EXISTS idx_service_order_items_part_status 
  ON public.service_order_items(company_id, part_status);

-- 2. Atualizar trigger de movimentação de estoque para ignorar peças sem product_id
CREATE OR REPLACE FUNCTION public.handle_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  v_prod_company_id UUID;
  v_current_stock INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Se for peça avulsa / sob encomenda, não decrementa estoque
    IF NEW.product_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Valida que o produto pertence à mesma empresa da OS
    SELECT company_id, quantity INTO v_prod_company_id, v_current_stock
    FROM public.products_inventory
    WHERE id = NEW.product_id;

    IF v_prod_company_id IS NULL OR v_prod_company_id != NEW.company_id THEN
      RAISE EXCEPTION 'Produto % não pertence à mesma empresa da Ordem de Serviço.', NEW.product_id;
    END IF;

    -- Subtração estrita: se NEW.quantity > quantity, CHECK dispara erro
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
    -- Se for peça avulsa / sob encomenda, não devolve ao estoque
    IF OLD.product_id IS NULL THEN
      RETURN OLD;
    END IF;

    UPDATE public.products_inventory
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id
      AND company_id = OLD.company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Atualizar trigger de snapshot padrão para não buscar produto caso product_id seja NULL
CREATE OR REPLACE FUNCTION public.set_service_order_item_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_prod RECORD;
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT cost_price, sale_price INTO v_prod
    FROM public.products_inventory
    WHERE id = NEW.product_id;

    IF FOUND THEN
      IF NEW.unit_cost IS NULL OR NEW.unit_cost = 0.00 THEN
        NEW.unit_cost := COALESCE(v_prod.cost_price, 0.00);
      END IF;
      IF NEW.unit_price IS NULL OR NEW.unit_price = 0.00 THEN
        NEW.unit_price := COALESCE(v_prod.sale_price, 0.00);
      END IF;
    END IF;
  ELSE
    -- Para peças avulsas sem estoque prévio
    IF NEW.part_status = 'em_estoque' THEN
      NEW.part_status := 'pendente';
    END IF;
    IF NEW.unit_cost IS NULL THEN
      NEW.unit_cost := 0.00;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Atualizar trigger de cancelamento para ignorar itens sem product_id
CREATE OR REPLACE FUNCTION public.handle_os_cancel_restock()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_prod RECORD;
BEGIN
  -- Ao cancelar OS: estorna itens com released = false e marca released = true
  IF NEW.status = 'Cancelado' AND OLD.status IS DISTINCT FROM 'Cancelado' THEN
    FOR v_item IN 
      SELECT id, product_id, quantity, company_id
      FROM public.service_order_items
      WHERE service_order_id = NEW.id 
        AND released = FALSE 
        AND product_id IS NOT NULL
    LOOP
      UPDATE public.products_inventory
      SET quantity = quantity + v_item.quantity
      WHERE id = v_item.product_id AND company_id = v_item.company_id;

      UPDATE public.service_order_items
      SET released = TRUE
      WHERE id = v_item.id;
    END LOOP;

  -- Ao reabrir OS cancelada: re-reserva itens que estavam com released = true
  ELSIF OLD.status = 'Cancelado' AND NEW.status IS DISTINCT FROM 'Cancelado' THEN
    FOR v_item IN 
      SELECT id, product_id, quantity, company_id
      FROM public.service_order_items
      WHERE service_order_id = NEW.id 
        AND released = TRUE 
        AND product_id IS NOT NULL
    LOOP
      SELECT id, name, quantity INTO v_prod
      FROM public.products_inventory
      WHERE id = v_item.product_id AND company_id = v_item.company_id
      FOR UPDATE;

      IF v_prod.quantity < v_item.quantity THEN
        RAISE EXCEPTION 'Não é possível reabrir OS: Estoque insuficiente para o produto "%" (Disponível: %, Necessário: %).',
          v_prod.name, v_prod.quantity, v_item.quantity;
      END IF;

      UPDATE public.products_inventory
      SET quantity = quantity - v_item.quantity
      WHERE id = v_item.product_id AND company_id = v_item.company_id;

      UPDATE public.service_order_items
      SET released = FALSE
      WHERE id = v_item.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Atualizar RPC save_order para suportar peças de estoque e peças sob encomenda
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
  v_saved_order public.service_orders%ROWTYPE;
BEGIN
  -- 1. Determinar Tenant autenticado
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário sem tenant vinculado.';
  END IF;

  -- 1.1 Bloqueio de escrita se tenant inadimplente
  IF public.is_company_read_only(v_company_id) THEN
    RAISE EXCEPTION 'Operação bloqueada: A conta está em modo apenas-leitura devido a pendências de pagamento.';
  END IF;

  -- 2. Extração dos parâmetros da OS
  IF (order_data->>'id') IS NOT NULL AND (order_data->>'id') != '' THEN
    v_order_id := (order_data->>'id')::uuid;
  END IF;

  v_client_id := (order_data->>'client_id')::uuid;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'O campo client_id é obrigatório.';
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
  END IF;

  -- 4. Validação e Recálculo no SERVIDOR
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
  IF v_order_id IS NOT NULL THEN
    DELETE FROM public.service_order_items WHERE service_order_id = v_order_id;
    DELETE FROM public.order_services WHERE os_id = v_order_id;
  END IF;

  IF items_data IS NOT NULL AND jsonb_array_length(items_data) > 0 THEN
    FOR item_record IN SELECT * FROM jsonb_array_elements(items_data)
    LOOP
      -- Se for peça do estoque cadastrada
      IF (item_record->>'product_id') IS NOT NULL AND (item_record->>'product_id') != '' THEN
        SELECT id, name, quantity, cost_price, sale_price INTO v_prod
        FROM public.products_inventory
        WHERE id = (item_record->>'product_id')::uuid AND company_id = v_company_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Produto % não encontrado no estoque.', item_record->>'product_id';
        END IF;

        IF v_status != 'Cancelado' AND v_prod.quantity < (item_record->>'quantity')::int THEN
          RAISE EXCEPTION 'Estoque insuficiente para o produto "%" (Disponível: %, Solicitado: %).',
            v_prod.name, v_prod.quantity, item_record->>'quantity';
        END IF;

        v_calculated_items_total := v_calculated_items_total + 
          ((item_record->>'quantity')::int * COALESCE((item_record->>'unit_price')::numeric, v_prod.sale_price));
      ELSE
        -- Peça sob encomenda / avulsa
        IF (item_record->>'custom_name') IS NULL OR trim(item_record->>'custom_name') = '' THEN
          RAISE EXCEPTION 'O nome da peça sob encomenda é obrigatório.';
        END IF;

        v_calculated_items_total := v_calculated_items_total + 
          (COALESCE((item_record->>'quantity')::int, 1) * COALESCE((item_record->>'unit_price')::numeric, 0.00));
      END IF;
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

  -- 6. Gravação dos Itens da OS
  IF items_data IS NOT NULL AND jsonb_array_length(items_data) > 0 AND v_status != 'Cancelado' THEN
    FOR item_record IN SELECT * FROM jsonb_array_elements(items_data)
    LOOP
      IF (item_record->>'product_id') IS NOT NULL AND (item_record->>'product_id') != '' THEN
        SELECT cost_price, sale_price INTO v_prod
        FROM public.products_inventory
        WHERE id = (item_record->>'product_id')::uuid;

        INSERT INTO public.service_order_items (
          company_id, service_order_id, product_id, custom_name, quantity, unit_price, unit_cost,
          part_status, supplier_link, tracking_code, actual_cost
        ) VALUES (
          v_company_id,
          v_order_id,
          (item_record->>'product_id')::uuid,
          NULL,
          (item_record->>'quantity')::int,
          COALESCE((item_record->>'unit_price')::numeric, v_prod.sale_price),
          COALESCE(v_prod.cost_price, 0.00),
          'em_estoque',
          NULL,
          NULL,
          NULL
        );
      ELSE
        INSERT INTO public.service_order_items (
          company_id, service_order_id, product_id, custom_name, quantity, unit_price, unit_cost,
          part_status, supplier_link, tracking_code, actual_cost
        ) VALUES (
          v_company_id,
          v_order_id,
          NULL,
          trim(item_record->>'custom_name'),
          COALESCE((item_record->>'quantity')::int, 1),
          COALESCE((item_record->>'unit_price')::numeric, 0.00),
          COALESCE((item_record->>'unit_cost')::numeric, 0.00),
          COALESCE(item_record->>'part_status', 'pendente'),
          item_record->>'supplier_link',
          item_record->>'tracking_code',
          CASE WHEN (item_record->>'actual_cost') IS NOT NULL AND (item_record->>'actual_cost') != '' 
               THEN (item_record->>'actual_cost')::numeric ELSE NULL END
        );
      END IF;
    END LOOP;
  END IF;

  -- 7. Gravação dos Serviços da OS
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

  SELECT * INTO v_saved_order FROM public.service_orders WHERE id = v_order_id;
  RETURN to_jsonb(v_saved_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Atualizar get_public_budget_details para incluir custom_name nas peças públicas
CREATE OR REPLACE FUNCTION public.get_public_budget_details(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order public.service_orders%ROWTYPE;
    v_result JSONB;
BEGIN
    SELECT * INTO v_order FROM public.service_orders WHERE id = p_order_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'order', jsonb_build_object(
            'id', v_order.id,
            'status', v_order.status,
            'codigo_os', v_order.codigo_os,
            'equipment_details', v_order.equipment_details,
            'technical_report', v_order.technical_report,
            'service_value', v_order.service_value,
            'discount', v_order.discount,
            'total_value', v_order.total_value,
            'client_signature', v_order.client_signature,
            'client_signature_ip', v_order.client_signature_ip,
            'client_signature_at', v_order.client_signature_at,
            'client_signature_name', v_order.client_signature_name
        ),
        'company', (
            SELECT jsonb_build_object(
                'name', c.name,
                'logo_url', c.logo_url,
                'phone', c.phone,
                'email', c.email,
                'subdomain', c.subdomain
            )
            FROM public.companies c WHERE c.id = v_order.company_id
        ),
        'client', (
            SELECT jsonb_build_object(
                'name', cl.name,
                'email', cl.email,
                'phone', cl.phone
            )
            FROM public.clients cl WHERE cl.id = v_order.client_id
        ),
        'items', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', soi.id,
                'quantity', soi.quantity,
                'unit_price', soi.unit_price,
                'product_name', COALESCE(pi.name, soi.custom_name, 'Peça sob Encomenda'),
                'custom_name', soi.custom_name
            )), '[]'::jsonb)
            FROM public.service_order_items soi
            LEFT JOIN public.products_inventory pi ON pi.id = soi.product_id
            WHERE soi.service_order_id = p_order_id
        ),
        'services', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', os.id,
                'quantidade', os.quantidade,
                'subtotal', os.subtotal,
                'service_name', s.nome
            )), '[]'::jsonb)
            FROM public.order_services os
            LEFT JOIN public.services s ON s.id = os.service_id
            WHERE os.os_id = p_order_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Atualizar approve_budget_by_client para direcionar para 'Aguardando Peças' se houver peças sob encomenda
CREATE OR REPLACE FUNCTION public.approve_budget_by_client(
  p_order_id UUID,
  p_client_name TEXT,
  p_signature_base64 TEXT,
  p_client_ip TEXT DEFAULT '0.0.0.0',
  p_user_agent TEXT DEFAULT 'unknown',
  p_terms_version TEXT DEFAULT 'v1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_services JSONB;
  v_snapshot JSONB;
  v_hash VARCHAR(64);
  v_clean_name TEXT;
  v_clean_ip TEXT;
  v_has_parts_to_order BOOLEAN := FALSE;
  v_target_status TEXT := 'Aprovado';
BEGIN
  v_clean_name := trim(COALESCE(p_client_name, ''));
  v_clean_ip := trim(COALESCE(p_client_ip, '0.0.0.0'));

  IF length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome do signatário inválido ou incompleto.');
  END IF;

  -- 1. Validar que a OS existe e está aguardando aprovação
  SELECT 
    id, company_id, status, total_value, service_value, discount, 
    reported_problem, technical_report, codigo_os
  INTO v_order
  FROM public.service_orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ordem de Serviço não encontrada.');
  END IF;

  IF v_order.status != 'Aguardando Aprovação' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este orçamento não está pendente de aprovação (status atual: ' || v_order.status || ').');
  END IF;

  -- 2. Validar assinatura
  IF p_signature_base64 IS NULL OR NOT (p_signature_base64 LIKE 'data:image/png;base64,%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura inválida. Formato esperado: data:image/png;base64.');
  END IF;

  IF length(p_signature_base64) > 280000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura excede o tamanho máximo permitido de 200 KB.');
  END IF;

  -- 3. Consolidar itens e serviços para o snapshot canônico
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', soi.product_id,
      'product_name', COALESCE(pi.name, soi.custom_name, 'Peça sob Encomenda'),
      'custom_name', soi.custom_name,
      'quantity', soi.quantity,
      'unit_price', soi.unit_price,
      'unit_cost', soi.unit_cost,
      'part_status', soi.part_status
    )
  ) INTO v_items
  FROM public.service_order_items soi
  LEFT JOIN public.products_inventory pi ON pi.id = soi.product_id
  WHERE soi.service_order_id = v_order.id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'service_id', os.service_id,
      'service_name', s.nome,
      'quantity', os.quantidade,
      'preco_unitario', os.preco_unitario,
      'subtotal', os.subtotal
    )
  ) INTO v_services
  FROM public.order_services os
  LEFT JOIN public.services s ON s.id = os.service_id
  WHERE os.os_id = v_order.id;

  -- 4. Verificar se a OS possui peças pendentes de compra
  SELECT EXISTS (
    SELECT 1 FROM public.service_order_items
    WHERE service_order_id = v_order.id
      AND (product_id IS NULL OR part_status IN ('pendente', 'a_comprar'))
      AND part_status != 'recebido'
  ) INTO v_has_parts_to_order;

  IF v_has_parts_to_order THEN
    v_target_status := 'Aguardando Peças';

    -- Marca as peças pendentes como "a_comprar" para o painel de compras
    UPDATE public.service_order_items
    SET part_status = 'a_comprar'
    WHERE service_order_id = v_order.id
      AND (product_id IS NULL OR part_status = 'pendente')
      AND part_status != 'recebido';
  ELSE
    v_target_status := 'Aprovado';
  END IF;

  -- 5. Criar snapshot canônico congelado do orçamento
  v_snapshot := jsonb_build_object(
    'order_id', v_order.id,
    'codigo_os', v_order.codigo_os,
    'approved_at', now(),
    'client_name', v_clean_name,
    'client_ip', v_clean_ip,
    'user_agent', p_user_agent,
    'total_value', v_order.total_value,
    'service_value', v_order.service_value,
    'discount', v_order.discount,
    'items', COALESCE(v_items, '[]'::jsonb),
    'services', COALESCE(v_services, '[]'::jsonb),
    'terms_version', p_terms_version,
    'target_status', v_target_status
  );

  v_hash := encode(sha256(convert_to(v_snapshot::text, 'UTF8')), 'hex');

  -- 6. Atualizar a Ordem de Serviço
  UPDATE public.service_orders
  SET
    status = v_target_status,
    client_signature = p_signature_base64,
    client_signature_name = v_clean_name,
    client_signature_ip = v_clean_ip,
    client_signature_user_agent = p_user_agent,
    client_signature_at = now(),
    approved_total = v_order.total_value,
    budget_approval_hash = v_hash,
    budget_snapshot = v_snapshot,
    terms_version = p_terms_version
  WHERE id = v_order.id;

  -- 7. Gravar histórico de status de auditoria
  INSERT INTO public.order_status_history (
    company_id, service_order_id, from_status, to_status, changed_by, reason
  ) VALUES (
    v_order.company_id,
    v_order.id, 
    'Aguardando Aprovação', 
    v_target_status, 
    NULL,
    'Aprovação eletrônica pelo cliente ' || v_clean_name || ' (IP: ' || v_clean_ip || ', Destino: ' || v_target_status || ', Hash: ' || substring(v_hash from 1 for 12) || '...)'
  );

  RETURN jsonb_build_object(
    'success', true,
    'approved_total', v_order.total_value,
    'approval_hash', v_hash,
    'client_ip', v_clean_ip,
    'status', v_target_status
  );
END;
$$;

-- 8. Função RPC para atualização ágil de status da peça, rastreio e custo real
CREATE OR REPLACE FUNCTION public.update_order_item_part_status(
  p_item_id UUID,
  p_part_status TEXT,
  p_tracking_code TEXT DEFAULT NULL,
  p_actual_cost NUMERIC(10,2) DEFAULT NULL,
  p_supplier_link TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_item RECORD;
  v_order_id UUID;
  v_remaining_parts INT;
  v_os_status TEXT;
BEGIN
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário sem tenant vinculado.';
  END IF;

  SELECT id, service_order_id, part_status, company_id
  INTO v_item
  FROM public.service_order_items
  WHERE id = p_item_id AND company_id = v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item de OS não encontrado.';
  END IF;

  v_order_id := v_item.service_order_id;

  -- Atualiza o item
  UPDATE public.service_order_items
  SET
    part_status = COALESCE(p_part_status, part_status),
    tracking_code = COALESCE(p_tracking_code, tracking_code),
    actual_cost = COALESCE(p_actual_cost, actual_cost),
    supplier_link = COALESCE(p_supplier_link, supplier_link)
  WHERE id = p_item_id AND company_id = v_company_id;

  -- Se a peça foi marcada como 'recebido', verificar se todas as peças da OS já foram recebidas
  IF p_part_status = 'recebido' THEN
    SELECT status INTO v_os_status FROM public.service_orders WHERE id = v_order_id;

    -- Conta quantas peças sob encomenda ainda NÃO foram recebidas
    SELECT COUNT(*) INTO v_remaining_parts
    FROM public.service_order_items
    WHERE service_order_id = v_order_id
      AND (product_id IS NULL OR part_status != 'em_estoque')
      AND part_status != 'recebido';

    -- Se não sobrou nenhuma peça pendente e a OS estava 'Aguardando Peças', avança para 'Em Execução'
    IF v_remaining_parts = 0 AND v_os_status = 'Aguardando Peças' THEN
      UPDATE public.service_orders
      SET status = 'Em Execução'
      WHERE id = v_order_id AND company_id = v_company_id;

      INSERT INTO public.order_status_history (
        company_id, service_order_id, from_status, to_status, changed_by, reason
      ) VALUES (
        v_company_id,
        v_order_id,
        'Aguardando Peças',
        'Em Execução',
        auth.uid(),
        'Todas as peças sob encomenda foram recebidas na loja.'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'item_id', p_item_id,
    'part_status', p_part_status
  );
END;
$$;

-- 9. Concessão de permissões de execução
GRANT EXECUTE ON FUNCTION public.save_order(jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_budget_by_client(uuid, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_budget_details(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_item_part_status(uuid, text, text, numeric, text) TO authenticated;
