-- ============================================================
-- Corrige get_company_storage_bytes
-- * Somava `storage.objects.size`, coluna que não existe (o tamanho fica em
--   metadata->>'size'). A função sempre falhava, e com ela can_upload_to_os_media:
--   uploads em `os-media` só passavam pela política permissiva removida na
--   phase1 (upload_own_company_os_media). Sem esta correção, o upload quebra.
-- * Qualquer usuário autenticado consultava o uso de qualquer empresa.
--   Agora só a própria (service role continua livre).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_company_storage_bytes(comp_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_total_bytes BIGINT;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND comp_id IS DISTINCT FROM public.get_my_company_id() THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO v_total_bytes
  FROM storage.objects
  WHERE bucket_id = 'os-media'
    AND path_tokens[1] = comp_id::text;
  RETURN v_total_bytes;
END;
$function$;

-- REVERSÃO: recriar a versão anterior a partir de supabase/schema.sql:207-218
-- (não recomendado — ela falha com "column size does not exist").
