-- ==============================================================================
-- MIGRATION: 20261106140000_os_logistics.sql
-- Módulo de Logística (Retirada / Devolução) na Ordem de Serviço
--
-- 1. Endereço + coordenadas da empresa (origem do cálculo de distância)
-- 2. company_logistics_settings: regras de preço e dados do veículo por tenant
-- 3. service_order_logistics: trechos (retirada/devolução) com snapshot de valores
-- 4. Triggers: raio máximo, totais da OS, auditoria de ajuste manual, cancelamento
-- 5. save_order / get_public_budget_details / get_financial_summary com logística
--
-- Escrita em company_logistics_settings e service_order_logistics é feita apenas
-- pelo servidor (service_role) após autenticação e cálculo no backend. Usuários
-- autenticados têm somente leitura via RLS, evitando adulteração de preço/distância.
-- ==============================================================================

-- 1. ENDEREÇO DA EMPRESA ---------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS address_zip TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_district TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Coordenadas são gravadas pelo servidor após geocodificação (PUT /api/settings/logistics).
-- Um admin que as alterasse diretamente afetaria apenas o cálculo do próprio tenant.

-- 2. CONFIGURAÇÕES DE LOGÍSTICA --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_logistics_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  base_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (base_fee >= 0),
  price_per_km NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (price_per_km >= 0),
  min_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (min_fee >= 0),
  max_radius_km NUMERIC(6,1) NOT NULL DEFAULT 30.0 CHECK (max_radius_km > 0),
  round_trip BOOLEAN NOT NULL DEFAULT TRUE,
  vehicle_km_per_liter NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (vehicle_km_per_liter > 0),
  fuel_type TEXT NOT NULL DEFAULT 'etanol' CHECK (fuel_type IN ('etanol', 'gasolina', 'diesel', 'gnv')),
  fuel_price NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (fuel_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_logistics_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_company_logistics_settings ON public.company_logistics_settings;
CREATE POLICY select_company_logistics_settings ON public.company_logistics_settings
  FOR SELECT USING (company_id = public.get_my_company_id());

REVOKE INSERT, UPDATE, DELETE ON public.company_logistics_settings FROM authenticated, anon;
GRANT SELECT ON public.company_logistics_settings TO authenticated;
GRANT ALL ON public.company_logistics_settings TO service_role;

-- 3. TRECHOS DE LOGÍSTICA DA OS --------------------------------------------------
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS logistics_total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (logistics_total >= 0);

CREATE TABLE IF NOT EXISTS public.service_order_logistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  leg TEXT NOT NULL CHECK (leg IN ('pickup', 'delivery')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'agendada', 'concluida', 'descartada')),

  -- Snapshot do endereço de coleta/entrega
  address_zip TEXT,
  address_street TEXT NOT NULL,
  address_number TEXT,
  address_complement TEXT,
  address_district TEXT,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  geocoded_label TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,

  -- Distância (km de ida, empresa -> endereço) e km faturados (com ida e volta)
  distance_km NUMERIC(8,1) NOT NULL CHECK (distance_km >= 0),
  billed_km NUMERIC(8,1) NOT NULL CHECK (billed_km >= 0),
  duration_min INTEGER,
  calc_method TEXT NOT NULL CHECK (calc_method IN ('route', 'haversine')),

  -- Snapshot das regras usadas no cálculo
  base_fee NUMERIC(10,2) NOT NULL,
  price_per_km NUMERIC(10,2) NOT NULL,
  min_fee NUMERIC(10,2) NOT NULL,
  fuel_price NUMERIC(6,2) NOT NULL,
  km_per_liter NUMERIC(5,2) NOT NULL,

  calculated_price NUMERIC(10,2) NOT NULL CHECK (calculated_price >= 0),
  charged_price NUMERIC(10,2) NOT NULL CHECK (charged_price >= 0),
  internal_cost NUMERIC(10,2) NOT NULL CHECK (internal_cost >= 0),
  override_reason TEXT,

  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT service_order_logistics_leg_unique UNIQUE (service_order_id, leg),
  CONSTRAINT service_order_logistics_override_reason CHECK (
    charged_price = calculated_price OR length(trim(COALESCE(override_reason, ''))) >= 3
  )
);

CREATE INDEX IF NOT EXISTS idx_sol_company ON public.service_order_logistics(company_id);
CREATE INDEX IF NOT EXISTS idx_sol_order ON public.service_order_logistics(service_order_id);

ALTER TABLE public.service_order_logistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_service_order_logistics ON public.service_order_logistics;
CREATE POLICY select_service_order_logistics ON public.service_order_logistics
  FOR SELECT USING (company_id = public.get_my_company_id());

REVOKE INSERT, UPDATE, DELETE ON public.service_order_logistics FROM authenticated, anon;
GRANT SELECT ON public.service_order_logistics TO authenticated;
GRANT ALL ON public.service_order_logistics TO service_role;

-- 4.1 Validação: mesmo tenant da OS + raio máximo ---------------------------------
CREATE OR REPLACE FUNCTION public.validate_service_order_logistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_company UUID;
  v_max_radius NUMERIC(6,1);
BEGIN
  SELECT company_id INTO v_order_company
  FROM public.service_orders
  WHERE id = NEW.service_order_id AND deleted_at IS NULL;

  IF v_order_company IS NULL OR v_order_company != NEW.company_id THEN
    RAISE EXCEPTION 'Ordem de Serviço inválida para esta empresa.';
  END IF;

  SELECT max_radius_km INTO v_max_radius
  FROM public.company_logistics_settings
  WHERE company_id = NEW.company_id;

  IF v_max_radius IS NULL THEN
    RAISE EXCEPTION 'Configure a logística da empresa antes de lançar retiradas.';
  END IF;

  IF NEW.status != 'descartada' AND NEW.distance_km > v_max_radius THEN
    RAISE EXCEPTION 'Endereço fora do raio de atendimento (% km > % km).', NEW.distance_km, v_max_radius;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_service_order_logistics ON public.service_order_logistics;
CREATE TRIGGER trigger_validate_service_order_logistics
  BEFORE INSERT OR UPDATE ON public.service_order_logistics
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_service_order_logistics();

-- 4.2 Totais da OS (delta sobre total_value calculado pelo save_order) -----------
CREATE OR REPLACE FUNCTION public.sync_order_logistics_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID := COALESCE(NEW.service_order_id, OLD.service_order_id);
  v_sum NUMERIC(10,2);
BEGIN
  SELECT COALESCE(SUM(charged_price), 0.00) INTO v_sum
  FROM public.service_order_logistics
  WHERE service_order_id = v_order_id AND status != 'descartada';

  UPDATE public.service_orders
  SET total_value = GREATEST(0.00, total_value + v_sum - logistics_total),
      logistics_total = v_sum
  WHERE id = v_order_id AND logistics_total IS DISTINCT FROM v_sum;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_order_logistics_total ON public.service_order_logistics;
CREATE TRIGGER trigger_sync_order_logistics_total
  AFTER INSERT OR UPDATE OR DELETE ON public.service_order_logistics
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_logistics_total();

-- 4.3 Auditoria de ajuste manual de preço e exclusão -----------------------------
CREATE OR REPLACE FUNCTION public.audit_service_order_logistics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (company_id, user_id, action, entity, entity_id, old_data, new_data)
    VALUES (OLD.company_id, OLD.updated_by, 'logistics_leg_deleted', 'service_order_logistics', OLD.id,
            jsonb_build_object('service_order_id', OLD.service_order_id, 'leg', OLD.leg, 'charged_price', OLD.charged_price, 'status', OLD.status),
            NULL);
    RETURN OLD;
  END IF;

  IF NEW.charged_price != NEW.calculated_price
     AND (TG_OP = 'INSERT'
          OR NEW.charged_price IS DISTINCT FROM OLD.charged_price
          OR NEW.override_reason IS DISTINCT FROM OLD.override_reason) THEN
    INSERT INTO public.audit_logs (company_id, user_id, action, entity, entity_id, old_data, new_data)
    VALUES (NEW.company_id, NEW.updated_by, 'logistics_price_override', 'service_order_logistics', NEW.id,
            jsonb_build_object(
              'service_order_id', NEW.service_order_id,
              'leg', NEW.leg,
              'calculated_price', NEW.calculated_price,
              'previous_charged_price', CASE WHEN TG_OP = 'UPDATE' THEN OLD.charged_price ELSE NULL END
            ),
            jsonb_build_object('charged_price', NEW.charged_price, 'reason', NEW.override_reason));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_service_order_logistics ON public.service_order_logistics;
CREATE TRIGGER trigger_audit_service_order_logistics
  AFTER INSERT OR UPDATE OR DELETE ON public.service_order_logistics
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_service_order_logistics();

-- 4.4 Cancelamento da OS: trechos não concluídos são descartados ------------------
-- Trechos concluídos continuam cobrados (o deslocamento aconteceu).
CREATE OR REPLACE FUNCTION public.discard_logistics_on_order_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Cancelado' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.service_order_logistics
    SET status = 'descartada'
    WHERE service_order_id = NEW.id AND status NOT IN ('concluida', 'descartada');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_discard_logistics_on_cancel ON public.service_orders;
CREATE TRIGGER trigger_discard_logistics_on_cancel
  AFTER UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.discard_logistics_on_order_cancel();

REVOKE EXECUTE ON FUNCTION public.validate_service_order_logistics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_order_logistics_total() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_service_order_logistics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.discard_logistics_on_order_cancel() FROM PUBLIC, anon, authenticated;


-- 5. save_order: total passa a incluir a logística já lançada na OS
CREATE OR REPLACE FUNCTION public.save_order(
  order_data JSONB,
  items_data JSONB DEFAULT '[]'::jsonb,
  services_data JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_logistics_total NUMERIC(10,2) := 0.00;
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
    SELECT status, pago, logistics_total INTO v_existing_status, v_existing_pago, v_logistics_total
    FROM public.service_orders
    WHERE id = v_order_id AND company_id = v_company_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ordem de Serviço % não encontrada ou já excluída.', v_order_id;
    END IF;

    v_logistics_total := COALESCE(v_logistics_total, 0.00);
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
  v_calculated_total := GREATEST(0.00, (v_calculated_services_total + v_calculated_items_total + v_logistics_total) - v_discount);

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
$$;

-- 5.1 Orçamento público: linhas de logística (sem custo/margem/endereço)
CREATE OR REPLACE FUNCTION public.get_public_budget_details(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
            'logistics_total', v_order.logistics_total,
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
        ),
        'logistics', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', sol.id,
                'leg', sol.leg,
                'charged_price', sol.charged_price
            ) ORDER BY sol.leg DESC), '[]'::jsonb)
            FROM public.service_order_logistics sol
            WHERE sol.service_order_id = p_order_id AND sol.status != 'descartada'
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 6. FINANCEIRO: receita já inclui logística via total_value; custo de deslocamento
--    (combustível) entra no lucro bruto. Trechos de OS canceladas porém pagas contam.
CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_total_revenue NUMERIC(10,2) := 0.00;
  v_total_labor NUMERIC(10,2) := 0.00;
  v_total_parts_sold NUMERIC(10,2) := 0.00;
  v_total_parts_cost NUMERIC(10,2) := 0.00;
  v_total_logistics NUMERIC(10,2) := 0.00;
  v_total_logistics_cost NUMERIC(10,2) := 0.00;
  v_paid_orders_count INT := 0;
  v_open_orders_count INT := 0;
  v_completed_orders_count INT := 0;
  v_total_expenses NUMERIC(10,2) := 0.00;
  v_low_stock_count INT := 0;
  v_payment_dist JSONB := '{}'::jsonb;
  v_daily_revenue JSONB := '[]'::jsonb;
BEGIN
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não vinculado a uma empresa.';
  END IF;

  -- 1. Faturamento de Ordens Pagas no período (pelo payment_date DATE)
  SELECT 
    COALESCE(SUM(total_value), 0.00),
    COALESCE(SUM(service_value), 0.00),
    COUNT(*)
  INTO v_total_revenue, v_total_labor, v_paid_orders_count
  FROM public.service_orders
  WHERE company_id = v_company_id
    AND deleted_at IS NULL
    AND pago = TRUE
    AND payment_date BETWEEN p_start_date AND p_end_date;

  -- 2. Peças e Custos dos itens das ordens pagas no período
  SELECT 
    COALESCE(SUM(soi.quantity * soi.unit_price), 0.00),
    COALESCE(SUM(soi.quantity * soi.unit_cost), 0.00)
  INTO v_total_parts_sold, v_total_parts_cost
  FROM public.service_order_items soi
  JOIN public.service_orders so ON so.id = soi.service_order_id
  WHERE so.company_id = v_company_id
    AND so.deleted_at IS NULL
    AND so.pago = TRUE
    AND so.payment_date BETWEEN p_start_date AND p_end_date
    AND soi.released = FALSE;

  -- 2.1 Logística (retirada/devolução) das ordens pagas no período
  SELECT
    COALESCE(SUM(sol.charged_price), 0.00),
    COALESCE(SUM(sol.internal_cost), 0.00)
  INTO v_total_logistics, v_total_logistics_cost
  FROM public.service_order_logistics sol
  JOIN public.service_orders so ON so.id = sol.service_order_id
  WHERE so.company_id = v_company_id
    AND so.deleted_at IS NULL
    AND so.pago = TRUE
    AND so.payment_date BETWEEN p_start_date AND p_end_date
    AND sol.status != 'descartada';

  -- 3. Distribuição por Método de Pagamento
  SELECT jsonb_object_agg(method, total)
  INTO v_payment_dist
  FROM (
    SELECT 
      COALESCE(payment_method, 'Outro') AS method,
      SUM(total_value) AS total
    FROM public.service_orders
    WHERE company_id = v_company_id
      AND deleted_at IS NULL
      AND pago = TRUE
      AND payment_date BETWEEN p_start_date AND p_end_date
    GROUP BY payment_method
  ) s;

  IF v_payment_dist IS NULL THEN
    v_payment_dist := '{}'::jsonb;
  END IF;

  -- 4. Contagem de OS Abertas e Concluídas
  SELECT COUNT(*) INTO v_open_orders_count
  FROM public.service_orders
  WHERE company_id = v_company_id
    AND deleted_at IS NULL
    AND status NOT IN ('Finalizado', 'Cancelado');

  SELECT COUNT(*) INTO v_completed_orders_count
  FROM public.service_orders
  WHERE company_id = v_company_id
    AND deleted_at IS NULL
    AND status = 'Finalizado'
    AND payment_date BETWEEN p_start_date AND p_end_date;

  -- 5. Total de Despesas no período
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_expenses
  FROM public.company_expenses
  WHERE company_id = v_company_id
    AND expense_date BETWEEN p_start_date AND p_end_date;

  -- 6. Estoque baixo (Comparação numérica correta F-17)
  SELECT COUNT(*) INTO v_low_stock_count
  FROM public.products_inventory
  WHERE company_id = v_company_id
    AND min_stock_alert > 0
    AND quantity <= min_stock_alert;

  -- 7. Faturamento diário para gráficos
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', dt::text,
      'revenue', COALESCE(d.daily_total, 0.00)
    ) ORDER BY dt
  ) INTO v_daily_revenue
  FROM generate_series(p_start_date, p_end_date, '1 day'::interval) dt
  LEFT JOIN (
    SELECT payment_date, SUM(total_value) AS daily_total
    FROM public.service_orders
    WHERE company_id = v_company_id
      AND deleted_at IS NULL
      AND pago = TRUE
      AND payment_date BETWEEN p_start_date AND p_end_date
    GROUP BY payment_date
  ) d ON d.payment_date = dt::date;

  RETURN jsonb_build_object(
    'total_revenue', v_total_revenue,
    'total_labor', v_total_labor,
    'total_parts_sold', v_total_parts_sold,
    'total_parts_cost', v_total_parts_cost,
    'total_logistics', v_total_logistics,
    'total_logistics_cost', v_total_logistics_cost,
    'gross_profit', (v_total_revenue - v_total_parts_cost - v_total_logistics_cost),
    'net_profit', (v_total_revenue - v_total_parts_cost - v_total_logistics_cost - v_total_expenses),
    'ticket_medio', CASE WHEN v_paid_orders_count > 0 THEN ROUND(v_total_revenue / v_paid_orders_count, 2) ELSE 0.00 END,
    'paid_orders_count', v_paid_orders_count,
    'open_orders_count', v_open_orders_count,
    'completed_orders_count', v_completed_orders_count,
    'total_expenses', v_total_expenses,
    'low_stock_count', v_low_stock_count,
    'payment_distribution', v_payment_dist,
    'daily_revenue', COALESCE(v_daily_revenue, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.save_order(jsonb, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_budget_details(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date) TO authenticated, service_role;

