-- ============================================================
-- FASE 1 — Storage (buckets os-media e company-logos)
-- Pré-requisitos:
--   * 20261005120000_phase0_hardening.sql
--   * 20261008130000_fix_company_storage_bytes.sql — APLICAR ANTES DESTA.
--     Sem ela, can_upload_to_os_media falha (coluna `size` inexistente) e,
--     removida a política permissiva abaixo, o upload de mídia nas OS quebra.
-- Compatível com o código anterior ao PR #2 (não depende do front novo).
-- A parte de `companies` e rate limit está em
-- 20261009120000_phase1b_secrets_and_rate_limit.sql (exige o front novo).
-- Reversão no fim do arquivo.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Bucket `os-media`
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
DROP POLICY IF EXISTS "delete_own_company_os_media"                  ON storage.objects; -- duplicata de "Permitir exclusao de midias os-media"

CREATE POLICY "os_media_select_own_company" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'os-media'
    AND (storage.foldername(name))[1] = (public.get_my_company_id())::text
  );

-- ------------------------------------------------------------
-- 2. Bucket `company-logos`
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

-- ============================================================
-- REVERSÃO (executar manualmente se necessário)
-- ============================================================
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
