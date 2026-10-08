-- ============================================================
-- FASE 0 — Contenção (AUDITORIA.md F-04, F-05)
-- NÃO aplicar direto em produção: rodar antes em branch/staging
-- e confirmar backup (PITR). Reversão no fim do arquivo.
-- ============================================================

-- ------------------------------------------------------------
-- F-04: admin da empresa não pode editar colunas de cobrança.
-- O app só atualiza estas colunas (settings/company e OnboardingModal):
--   name, phone, email, logo_url, whatsapp
-- Service role (webhook Asaas, checkout) continua com acesso total.
-- ------------------------------------------------------------
REVOKE UPDATE ON public.companies FROM anon, authenticated;
GRANT  UPDATE (name, phone, email, logo_url, whatsapp)
  ON public.companies TO authenticated;

-- ------------------------------------------------------------
-- F-05: função pública que contornava o OTP do rastreio.
-- O front usa /api/rastreio/* (service role) e não chama esta RPC.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_service_order(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_public_service_order(TEXT);

-- ------------------------------------------------------------
-- Funções SECURITY DEFINER não usadas pelo front como anon.
-- (delete_service_orders_batch não é chamada em nenhum lugar do app e
--  devolve estoque em dobro — F-10; fica só para service_role até a Fase 2.)
-- ------------------------------------------------------------
-- Condicional: a função não existe em todos os ambientes (ausente em dev).
DO $$
BEGIN
  IF to_regprocedure('public.delete_service_orders_batch(uuid[])') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.delete_service_orders_batch(uuid[]) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_company_storage_bytes(uuid)     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_company_storage_bytes(uuid)     TO authenticated;

-- ============================================================
-- REVERSÃO (executar manualmente se necessário)
-- ============================================================
-- GRANT UPDATE ON public.companies TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.delete_service_orders_batch(uuid[]) TO authenticated;
-- (recriar get_public_service_order a partir de supabase/schema.sql:548-609)
