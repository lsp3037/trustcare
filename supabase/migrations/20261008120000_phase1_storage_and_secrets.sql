-- ============================================================
-- FASE 1 — Storage, segredos de `companies` e rate limit
-- Pré-requisito: 20261005120000_phase0_hardening.sql (cobrança).
-- NÃO aplicar direto em produção: rodar antes em dev/staging.
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
-- 2. Bucket `os-media`
-- * As políticas de SELECT públicas permitiam LISTAR os arquivos de todas as
--   empresas pela API. O bucket continua público: as URLs /object/public/ já
--   salvas nas OS seguem funcionando (download público não passa pela RLS).
--   Tornar o bucket privado com signed URLs fica para a próxima fase.
-- * `upload_own_company_os_media` não checava cota nem modo somente leitura e,
--   por ser permissiva, anulava `can_upload_to_os_media` (políticas somam por OR).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura publica de midias os-media" ON storage.objects;
DROP POLICY IF EXISTS "public_read_os_media"                         ON storage.objects;
DROP POLICY IF EXISTS "upload_own_company_os_media"                  ON storage.objects;
DROP POLICY IF EXISTS "delete_own_company_os_media"                  ON storage.objects; -- duplicata da política abaixo

CREATE POLICY "os_media_select_own_company" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'os-media'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
  );

-- ------------------------------------------------------------
-- 3. Bucket `company-logos`
-- Antes qualquer usuário autenticado podia sobrescrever/apagar o logo de
-- qualquer empresa. Uploads usam o caminho `{company_id}/logo_*.ext` com
-- upsert (INSERT + UPDATE). Só admin da própria empresa escreve.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura publica de logotipos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir insercao de logotipos"        ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusao de logotipos"        ON storage.objects;

CREATE POLICY "company_logos_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
  );

CREATE POLICY "company_logos_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "company_logos_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "company_logos_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
    AND public.get_my_role() = 'admin'
  );

-- ------------------------------------------------------------
-- 4. Rate limit
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
-- DROP POLICY "os_media_select_own_company" ON storage.objects;
-- CREATE POLICY "public_read_os_media" ON storage.objects FOR SELECT USING (bucket_id = 'os-media');
-- CREATE POLICY "upload_own_company_os_media" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'os-media' AND (storage.foldername(name))[1] = get_my_company_id()::text);
-- CREATE POLICY "delete_own_company_os_media" ON storage.objects FOR DELETE
--   USING (bucket_id = 'os-media' AND (storage.foldername(name))[1] = get_my_company_id()::text);
-- DROP POLICY "company_logos_select_own"   ON storage.objects;
-- DROP POLICY "company_logos_insert_admin" ON storage.objects;
-- DROP POLICY "company_logos_update_admin" ON storage.objects;
-- DROP POLICY "company_logos_delete_admin" ON storage.objects;
-- CREATE POLICY "Permitir leitura publica de logotipos" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
-- CREATE POLICY "Permitir insercao de logotipos" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');
-- CREATE POLICY "Permitir exclusao de logotipos" ON storage.objects FOR DELETE
--   USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');
