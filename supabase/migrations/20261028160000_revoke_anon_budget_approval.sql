-- ============================================================
-- MIGRATION: 20261028160000_revoke_anon_budget_approval.sql
--
-- Security Audit (auth.rpc.approve_budget_direct_anon_exposure):
-- Revoga permissão de execução de anon na RPC approve_budget_by_client.
-- Toda aprovação de orçamento deve passar obrigatoriamente pela rota
-- /api/orcamento/[id]/approve (service_role), que aplica rate limiting
-- (check_and_clean_rate_limit), validação de assinatura e captura real
-- de IP e User-Agent do servidor para o histórico de auditoria.
-- ============================================================

REVOKE ALL ON FUNCTION public.approve_budget_by_client(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_budget_by_client(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
