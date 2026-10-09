-- ============================================================
-- FASE 1b — Segredos de `companies` e rate limit
-- ⚠️ SÓ APLICAR DEPOIS QUE O FRONT DO PR #2 ESTIVER PUBLICADO.
--   O front anterior faz `select('*')` em companies (CompanyContext,
--   temp-print): com o REVOKE abaixo ele recebe "permission denied" e o
--   painel inteiro para de carregar. O /api/rate-limit anterior chama a RPC
--   como anon e passaria a falhar (fail-open = sem limite nas páginas públicas).
-- Pré-requisito: 20261008120000_phase1_storage.sql.
-- Reversão no fim do arquivo.
-- ============================================================

-- ------------------------------------------------------------
-- 1. `companies`: api_key e ids do Asaas deixam de ser legíveis pelo front.
-- Antes qualquer membro (técnico, recepcionista) lia a api_key via select('*').
-- O front passou a selecionar colunas explícitas (CompanyContext, temp-print).
-- Service role (API v1, webhook, checkout, backoffice) mantém acesso total.
-- ------------------------------------------------------------
REVOKE SELECT ON public.companies FROM anon, authenticated;
GRANT  SELECT (id, name, created_at, phone, email, logo_url, whatsapp,
               subscription_plan, subscription_status, subscription_expires_at,
               subdomain, document)
  ON public.companies TO anon, authenticated;

-- INSERT/DELETE nunca são feitos pelo front (empresa nasce no trigger handle_new_user).
REVOKE INSERT, DELETE, TRUNCATE ON public.companies FROM anon, authenticated;

-- ------------------------------------------------------------
-- 2. Rate limit
-- `check_and_clean_rate_limit` é SECURITY DEFINER: a política aberta de INSERT
-- não é necessária e deixava qualquer um gravar hits falsos. A RPC também era
-- executável por anon com IP arbitrário (dava para esgotar o limite de outro IP);
-- agora só o servidor (service role, /api/*) chama.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "insert_hits" ON public.rate_limit_hits;
REVOKE EXECUTE ON FUNCTION public.check_and_clean_rate_limit(text, text) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- REVERSÃO (executar manualmente se necessário)
-- ============================================================
-- GRANT SELECT, INSERT, DELETE ON public.companies TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.check_and_clean_rate_limit(text, text) TO anon, authenticated;
-- CREATE POLICY "insert_hits" ON public.rate_limit_hits FOR INSERT WITH CHECK (true);
