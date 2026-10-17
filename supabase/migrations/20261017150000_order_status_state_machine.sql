-- ============================================================
-- MIGRATION: 20261017150000_order_status_state_machine.sql
-- FASE 2: Integridade da OS e do Dinheiro (Item 2.3 - F-18)
--
-- MOTIVO:
--   1. F-18: Máquina de estados para a Ordem de Serviço, com matriz
--      estrita de transições válidas, impedindo saltos arbitrários e
--      garantindo consistência operacional e financeira.
--   2. F-18: Tabela de histórico `order_status_history` para auditoria
--      completa de quem, quando, de onde e para onde cada OS mudou de status.
--   3. F-18: Substituição do trigger destrutivo legado `trigger_auto_restock_on_cancel`
--      (que apagava itens em DELETE) por gestão de estorno com `released = true`
--      sem destruir o orçamento e histórico de peças da OS.
--   4. F-18: RPC unificada `change_order_status` usada por Kanban, detalhes
--      da OS e API v1.
--   5. F-18: `analysis_started_at` preenchido tanto em INSERT quanto em UPDATE
--      para alimentar corretamente o SLA Tracker.
-- ============================================================

-- 1. ADICIONAR COLUNA released NA TABELA service_order_items (Para estorno seguro em cancelamento)
ALTER TABLE public.service_order_items 
  ADD COLUMN IF NOT EXISTS released BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. TABELA DE HISTÓRICO DE STATUS (Auditoria da OS)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order 
  ON public.order_status_history(service_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_company 
  ON public.order_status_history(company_id, created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_order_status_history ON public.order_status_history;
CREATE POLICY select_order_status_history ON public.order_status_history
  FOR SELECT USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS insert_order_status_history ON public.order_status_history;
CREATE POLICY insert_order_status_history ON public.order_status_history
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());


-- 3. TABELA DA MATRIZ DE TRANSIÇÕES PERMITIDAS
CREATE TABLE IF NOT EXISTS public.order_status_transitions (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  requires_admin BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (from_status, to_status)
);

-- Popula matriz de transições oficiais do fluxo TrustCare
INSERT INTO public.order_status_transitions (from_status, to_status, requires_admin)
VALUES
  -- De Aguardando Equipamento
  ('Aguardando Equipamento', 'Em Análise', false),
  ('Aguardando Equipamento', 'Cancelado', false),

  -- De Em Análise
  ('Em Análise', 'Aguardando Aprovação', false),
  ('Em Análise', 'Aprovado', true), -- Aprovação direta interna por admin
  ('Em Análise', 'Cancelado', false),

  -- De Aguardando Aprovação
  ('Aguardando Aprovação', 'Aprovado', false), -- Cliente aprovou no portal ou equipe confirmou
  ('Aguardando Aprovação', 'Em Análise', false), -- Necessidade de revisão de diagnóstico
  ('Aguardando Aprovação', 'Cancelado', false), -- Orçamento recusado / desistência

  -- De Aprovado
  ('Aprovado', 'Aguardando Peças', false),
  ('Aprovado', 'Em Execução', false),
  ('Aprovado', 'Cancelado', true),

  -- De Aguardando Peças
  ('Aguardando Peças', 'Em Execução', false),
  ('Aguardando Peças', 'Cancelado', true),

  -- De Em Execução
  ('Em Execução', 'Em Testes', false),
  ('Em Execução', 'Aguardando Peças', false),
  ('Em Execução', 'Pronto para Retirada', false),
  ('Em Execução', 'Cancelado', true),

  -- De Em Testes
  ('Em Testes', 'Em Execução', false), -- Reprovado nos testes
  ('Em Testes', 'Pronto para Retirada', false),
  ('Em Testes', 'Cancelado', true),

  -- De Pronto para Retirada
  ('Pronto para Retirada', 'Finalizado', false), -- Entregue ao cliente
  ('Pronto para Retirada', 'Em Testes', false), -- Cliente solicitou nova checagem
  ('Pronto para Retirada', 'Cancelado', true),

  -- Reabertura / Estorno excepcional por Admin
  ('Finalizado', 'Em Execução', true),
  ('Cancelado', 'Em Análise', true)
ON CONFLICT (from_status, to_status) DO UPDATE
SET requires_admin = EXCLUDED.requires_admin;


-- 4. CORREÇÃO DE analysis_started_at: ATIVAR TANTO EM INSERT QUANTO EM UPDATE
CREATE OR REPLACE FUNCTION public.update_analysis_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Em Análise' AND (TG_OP = 'INSERT' OR OLD.status != 'Em Análise') AND NEW.analysis_started_at IS NULL THEN
    NEW.analysis_started_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_analysis_started_at ON public.service_orders;
CREATE TRIGGER trigger_update_analysis_started_at
  BEFORE INSERT OR UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_analysis_started_at();


-- 5. TRIGGER DE AUDITORIA E RESTRIÇÃO DE TRANSIÇÕES (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION public.enforce_order_status_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_transition RECORD;
  v_user_role TEXT;
  v_user_id UUID;
BEGIN
  -- Se o status não mudou, nada a validar
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 1. Validar se a transição existe na matriz
  SELECT * INTO v_transition
  FROM public.order_status_transitions
  WHERE from_status = OLD.status AND to_status = NEW.status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transição de status inválida: não é permitido mover de "%" para "%".', OLD.status, NEW.status;
  END IF;

  -- 2. Validar permissão de admin se exigido pela transição
  IF v_transition.requires_admin THEN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
      SELECT role INTO v_user_role
      FROM public.profiles
      WHERE user_id = v_user_id AND company_id = NEW.company_id;

      IF v_user_role IS NULL OR v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem realizar a transição de "%" para "%".', OLD.status, NEW.status;
      END IF;
    END IF;
  END IF;

  -- 3. Validação especial ao finalizar OS:
  -- A OS deve ter algum conteúdo ou valor (evita finalizar ordens vazias por engano)
  IF NEW.status = 'Finalizado' THEN
    IF (NEW.reported_problem IS NULL OR NEW.reported_problem = '') AND NEW.total_value <= 0 THEN
      RAISE EXCEPTION 'Não é permitido finalizar uma Ordem de Serviço sem diagnóstico ou itens/serviços.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_order_status ON public.service_orders;
CREATE TRIGGER trigger_enforce_order_status
  BEFORE UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_rules();


-- 6. REMOÇÃO DO TRIGGER DESTRUTIVO LEGADO E NOVO GERENCIAMENTO DE ESTOQUE NO CANCELAMENTO
DROP TRIGGER IF EXISTS trigger_auto_restock_on_cancel ON public.service_orders;
DROP FUNCTION IF EXISTS public.handle_os_cancel_restock();

CREATE OR REPLACE FUNCTION public.handle_order_cancel_and_reopen_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_prod RECORD;
BEGIN
  -- Ao cancelar OS: estorna itens com released = false e marca released = true (sem deletar o item!)
  IF NEW.status = 'Cancelado' AND OLD.status IS DISTINCT FROM 'Cancelado' THEN
    FOR v_item IN 
      SELECT id, product_id, quantity, company_id
      FROM public.service_order_items
      WHERE service_order_id = NEW.id AND released = FALSE
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
      WHERE service_order_id = NEW.id AND released = TRUE
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

DROP TRIGGER IF EXISTS trigger_order_cancel_and_reopen_stock ON public.service_orders;
CREATE TRIGGER trigger_order_cancel_and_reopen_stock
  AFTER UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_cancel_and_reopen_stock();


-- 7. TRIGGER PARA GRAVAR HISTÓRICO DE STATUS
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (
      company_id, service_order_id, from_status, to_status, changed_by, reason
    ) VALUES (
      NEW.company_id, NEW.id, NULL, NEW.status, v_changed_by, 'Criação da Ordem de Serviço'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.order_status_history (
      company_id, service_order_id, from_status, to_status, changed_by, reason
    ) VALUES (
      NEW.company_id, NEW.id, OLD.status, NEW.status, v_changed_by, NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_log_order_status ON public.service_orders;
CREATE TRIGGER trigger_log_order_status
  AFTER INSERT OR UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();


-- 8. RPC UNIFICADA: change_order_status (Kanban, Detalhes e API v1)
CREATE OR REPLACE FUNCTION public.change_order_status(
  order_id UUID,
  new_status TEXT,
  reason TEXT DEFAULT NULL,
  payment_data JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_company_id UUID;
  v_order RECORD;
  v_saved_order RECORD;
BEGIN
  -- 1. Validar tenant
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não vinculado a uma empresa.';
  END IF;

  IF public.is_company_read_only(v_company_id) THEN
    RAISE EXCEPTION 'A conta está em modo apenas-leitura. Alterações de status não são permitidas.';
  END IF;

  -- 2. Trava linha da OS (FOR UPDATE)
  SELECT * INTO v_order
  FROM public.service_orders
  WHERE id = order_id AND company_id = v_company_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de Serviço % não encontrada ou já excluída.', order_id;
  END IF;

  -- Se for o mesmo status, apenas retorna
  IF v_order.status = new_status THEN
    RETURN to_jsonb(v_order);
  END IF;

  -- 3. Tratamento de Pagamento quando informado ou ao Finalizar
  IF payment_data IS NOT NULL THEN
    UPDATE public.service_orders
    SET
      status = new_status,
      pago = COALESCE((payment_data->>'pago')::boolean, pago),
      payment_status = COALESCE(payment_data->>'payment_status', CASE WHEN (payment_data->>'pago')::boolean THEN 'pago' ELSE payment_status END),
      payment_method = COALESCE(payment_data->>'payment_method', payment_method),
      payment_date = CASE 
        WHEN (payment_data->>'payment_date') IS NOT NULL AND (payment_data->>'payment_date') != '' 
        THEN (payment_data->>'payment_date')::timestamptz 
        WHEN (payment_data->>'pago')::boolean THEN now() 
        ELSE payment_date 
      END
    WHERE id = order_id AND company_id = v_company_id;
  ELSE
    UPDATE public.service_orders
    SET status = new_status
    WHERE id = order_id AND company_id = v_company_id;
  END IF;

  -- 4. Se foi passado um motivo específico (além do trigger padrão), atualiza o último histórico
  IF reason IS NOT NULL AND reason != '' THEN
    UPDATE public.order_status_history
    SET reason = change_order_status.reason
    WHERE id = (
      SELECT h.id FROM public.order_status_history h
      WHERE h.service_order_id = change_order_status.order_id
      ORDER BY h.created_at DESC
      LIMIT 1
    );
  END IF;

  SELECT * INTO v_saved_order FROM public.service_orders WHERE id = order_id;
  RETURN to_jsonb(v_saved_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.change_order_status(uuid, text, text, jsonb) TO authenticated;
