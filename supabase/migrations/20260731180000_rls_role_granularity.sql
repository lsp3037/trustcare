-- ============================================================
-- MIGRATION: 20260731180000_rls_role_granularity
-- MOTIVO: Todas as policies write_* checavam apenas company_id. Um 'viewer'
--   podia inserir, editar e apagar OS, estoque, catálogo de preços e despesas
--   chamando a API do Supabase direto — o papel só existia como filtro de menu
--   no frontend.
--
-- Matriz definida com o produto:
--   viewer     (Recepção) → clients, leads, client_equipments,
--                           equipment_categories, service_orders .... RW
--                           products_inventory, services ........... R
--                           company_expenses ....................... sem acesso
--   technician             → tudo do viewer + products_inventory,
--                           service_order_items, order_services .... RW
--   admin                  → tudo, incluindo financeiro, catálogo de
--                           preços e configurações
--
-- SELECT de checklist_templates continua aberto a todos os papéis: a tela de
-- detalhe da OS e a impressão dependem dele para renderizar o checklist.
--
-- As tabelas liberadas para os três papéis (clients, leads, client_equipments,
-- equipment_categories, service_orders) ficam sem cláusula de papel de
-- propósito — acrescentar `IN ('admin','technician','viewer')` seria ruído,
-- já que o CHECK da coluna profiles.role só admite esses três valores.
--
-- VERIFICADO: matriz exercitada com SET LOCAL ROLE authenticated + jwt.claims
-- forjado para cada papel, dentro de transação com ROLLBACK. As 12 asserções
-- (viewer/technician/admin × criar OS, cliente, estoque, catálogo, despesa)
-- retornaram exatamente o esperado.
-- ============================================================

-- Papel do usuário logado. STABLE + search_path fixo, como as demais.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ── Estoque: admin e técnico ────────────────────────────────────────────────
DROP POLICY IF EXISTS write_products ON public.products_inventory;
CREATE POLICY write_products ON public.products_inventory
    FOR ALL USING (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() IN ('admin', 'technician')
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() IN ('admin', 'technician')
    );

-- ── Peças aplicadas na OS: admin e técnico ──────────────────────────────────
DROP POLICY IF EXISTS write_service_order_items ON public.service_order_items;
CREATE POLICY write_service_order_items ON public.service_order_items
    FOR ALL USING (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() IN ('admin', 'technician')
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() IN ('admin', 'technician')
    );

-- ── Serviços aplicados na OS: admin e técnico ───────────────────────────────
DROP POLICY IF EXISTS write_order_services ON public.order_services;
CREATE POLICY write_order_services ON public.order_services
    FOR ALL USING (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() IN ('admin', 'technician')
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() IN ('admin', 'technician')
    );

-- ── Catálogo de preços: só admin ────────────────────────────────────────────
DROP POLICY IF EXISTS write_services ON public.services;
CREATE POLICY write_services ON public.services
    FOR ALL USING (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    );

-- ── Templates de checklist: leitura para todos, escrita só admin ────────────
DROP POLICY IF EXISTS write_checklist_templates ON public.checklist_templates;
CREATE POLICY write_checklist_templates ON public.checklist_templates
    FOR ALL USING (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    );

-- ── Despesas da empresa: só admin, inclusive na leitura ─────────────────────
-- Também ganham o bloqueio por inadimplência, que faltava no insert.
DROP POLICY IF EXISTS select_expenses ON public.company_expenses;
CREATE POLICY select_expenses ON public.company_expenses
    FOR SELECT USING (
        company_id = public.get_my_company_id()
        AND public.get_my_role() = 'admin'
    );

DROP POLICY IF EXISTS insert_expenses ON public.company_expenses;
CREATE POLICY insert_expenses ON public.company_expenses
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    );

DROP POLICY IF EXISTS update_expenses ON public.company_expenses;
CREATE POLICY update_expenses ON public.company_expenses
    FOR UPDATE USING (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    );

DROP POLICY IF EXISTS delete_expenses ON public.company_expenses;
CREATE POLICY delete_expenses ON public.company_expenses
    FOR DELETE USING (
        company_id = public.get_my_company_id()
        AND NOT public.is_company_read_only(company_id)
        AND public.get_my_role() = 'admin'
    );
