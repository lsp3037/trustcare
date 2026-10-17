-- ============================================================
-- MIGRATION: 20261017160000_financial_integrity_and_aggregation.sql
-- FASE 2: Integridade da OS e do Dinheiro (Item 2.4 - F-15, F-16, F-17)
--
-- MOTIVO:
--   1. F-15: Datas de pagamento e despesas como `DATE` puro (sem timezone UTC)
--      eliminando o deslocamento de recebimentos do dia 1º para o mês anterior.
--   2. F-16: Snapshot automático de `unit_cost` e `unit_price` em `service_order_items`
--      via trigger BEFORE INSERT, preservando margens históricas mesmo se o
--      preço do produto no inventário for reajustado no futuro.
--   3. F-16/F-17: Criação da tabela `order_payments` para suporte a pagamentos
--      parciais, múltiplos métodos e histórico de quitação da OS.
--   4. F-17: RPC de agregação financeira no banco `get_financial_summary`
--      eliminando o corte silencioso de 1000 linhas do PostgREST e trazendo
--      KPIs exatos com SUM/COUNT nativos do PostgreSQL.
-- ============================================================

-- 1. CONVERSÃO DE DATAS PARA DATE (F-15)
ALTER TABLE public.service_orders 
  ALTER COLUMN payment_date TYPE DATE USING (payment_date AT TIME ZONE 'America/Sao_Paulo')::date;

ALTER TABLE public.company_expenses 
  ALTER COLUMN expense_date TYPE DATE USING (expense_date AT TIME ZONE 'America/Sao_Paulo')::date;

ALTER TABLE public.company_expenses 
  ALTER COLUMN end_date TYPE DATE USING (end_date AT TIME ZONE 'America/Sao_Paulo')::date;

CREATE INDEX IF NOT EXISTS idx_service_orders_company_payment_date 
  ON public.service_orders(company_id, payment_date);

CREATE INDEX IF NOT EXISTS idx_company_expenses_company_date 
  ON public.company_expenses(company_id, expense_date);


-- 2. SNAPSHOT AUTOMÁTICO DE CUSTO E PREÇO EM ITENS DE OS (F-16)
CREATE OR REPLACE FUNCTION public.set_service_order_item_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_prod RECORD;
BEGIN
  -- Se unit_cost ou unit_price não foram informados, busca o valor do produto no inventário
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_set_service_order_item_defaults ON public.service_order_items;
CREATE TRIGGER trigger_set_service_order_item_defaults
  BEFORE INSERT ON public.service_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_service_order_item_defaults();

-- Backfill de segurança para itens que ficaram com custo zerado
UPDATE public.service_order_items soi
SET unit_cost = COALESCE(pi.cost_price, 0.00)
FROM public.products_inventory pi
WHERE soi.product_id = pi.id
  AND soi.unit_cost = 0.00;


-- 3. TABELA DE PAGAMENTOS DA ORDEM DE SERVIÇO (F-15 / Pagamento Parcial)
CREATE TABLE IF NOT EXISTS public.order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order 
  ON public.order_payments(service_order_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_payments_company_date 
  ON public.order_payments(company_id, payment_date DESC);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_order_payments ON public.order_payments;
CREATE POLICY select_order_payments ON public.order_payments
  FOR SELECT USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS insert_order_payments ON public.order_payments;
CREATE POLICY insert_order_payments ON public.order_payments
  FOR INSERT WITH CHECK (
    company_id = public.get_my_company_id() 
    AND NOT public.is_company_read_only(company_id)
  );

DROP POLICY IF EXISTS delete_order_payments ON public.order_payments;
CREATE POLICY delete_order_payments ON public.order_payments
  FOR DELETE USING (
    company_id = public.get_my_company_id() 
    AND NOT public.is_company_read_only(company_id)
    AND public.get_my_role() = 'admin'
  );


-- 4. RPC: record_order_payment (Registro de Pagamento com Atualização de Status da OS)
CREATE OR REPLACE FUNCTION public.record_order_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_order RECORD;
  v_total_paid NUMERIC(10,2) := 0.00;
  v_payment_id UUID;
BEGIN
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não vinculado a uma empresa.';
  END IF;

  IF public.is_company_read_only(v_company_id) THEN
    RAISE EXCEPTION 'A conta está em modo apenas-leitura. Não é possível registrar pagamentos.';
  END IF;

  SELECT * INTO v_order
  FROM public.service_orders
  WHERE id = p_order_id AND company_id = v_company_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço % não encontrada ou já excluída.', p_order_id;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'O valor do pagamento deve ser maior que zero.';
  END IF;

  INSERT INTO public.order_payments (
    company_id, service_order_id, amount, payment_method, payment_date, notes, created_by
  ) VALUES (
    v_company_id, p_order_id, p_amount, p_payment_method, p_payment_date, p_notes, auth.uid()
  ) RETURNING id INTO v_payment_id;

  -- Recalcula total pago acumulado
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
  FROM public.order_payments
  WHERE service_order_id = p_order_id AND company_id = v_company_id;

  -- Atualiza indicadores da ordem de serviço
  IF v_total_paid >= v_order.total_value AND v_order.total_value > 0 THEN
    UPDATE public.service_orders SET
      pago = TRUE,
      payment_status = 'pago',
      payment_method = p_payment_method,
      payment_date = p_payment_date
    WHERE id = p_order_id AND company_id = v_company_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE public.service_orders SET
      pago = FALSE,
      payment_status = 'parcial',
      payment_method = p_payment_method,
      payment_date = p_payment_date
    WHERE id = p_order_id AND company_id = v_company_id;
  END IF;

  SELECT * INTO v_order FROM public.service_orders WHERE id = p_order_id;
  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'total_paid', v_total_paid,
    'order', to_jsonb(v_order)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. RPC: delete_order_payment (Estorno de Pagamento por Admin)
CREATE OR REPLACE FUNCTION public.delete_order_payment(p_payment_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_payment RECORD;
  v_order RECORD;
  v_total_paid NUMERIC(10,2) := 0.00;
BEGIN
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não vinculado a uma empresa.';
  END IF;

  IF public.is_company_read_only(v_company_id) THEN
    RAISE EXCEPTION 'A conta está em modo apenas-leitura.';
  END IF;

  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem estornar pagamentos.';
  END IF;

  SELECT * INTO v_payment
  FROM public.order_payments
  WHERE id = p_payment_id AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento % não encontrado.', p_payment_id;
  END IF;

  DELETE FROM public.order_payments WHERE id = p_payment_id;

  -- Recalcula total restante
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
  FROM public.order_payments
  WHERE service_order_id = v_payment.service_order_id AND company_id = v_company_id;

  SELECT * INTO v_order
  FROM public.service_orders
  WHERE id = v_payment.service_order_id AND company_id = v_company_id;

  IF v_total_paid >= v_order.total_value AND v_order.total_value > 0 THEN
    UPDATE public.service_orders SET
      pago = TRUE,
      payment_status = 'pago'
    WHERE id = v_order.id;
  ELSIF v_total_paid > 0 THEN
    UPDATE public.service_orders SET
      pago = FALSE,
      payment_status = 'parcial'
    WHERE id = v_order.id;
  ELSE
    UPDATE public.service_orders SET
      pago = FALSE,
      payment_status = 'pendente',
      payment_date = NULL
    WHERE id = v_order.id;
  END IF;

  SELECT * INTO v_order FROM public.service_orders WHERE id = v_payment.service_order_id;
  RETURN jsonb_build_object(
    'success', true,
    'total_paid', v_total_paid,
    'order', to_jsonb(v_order)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6. RPC: get_financial_summary (Agregação Financeira Nativa no Banco - F-17)
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
    'gross_profit', (v_total_revenue - v_total_parts_cost),
    'net_profit', (v_total_revenue - v_total_parts_cost - v_total_expenses),
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

GRANT EXECUTE ON FUNCTION public.record_order_payment(uuid, numeric, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_order_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date) TO authenticated;
