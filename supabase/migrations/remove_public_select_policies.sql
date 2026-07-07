-- ============================================================
-- MIGRATION: remove_public_select_policies
-- DATA: 07/07/2026
-- AUTOR: Security Audit - Lote 1
-- MOTIVO: As policies public_select_* criadas em
--   add_signature_and_aprovado_status.sql expõem dados de
--   TODOS os tenants para qualquer usuario anonimo via OR
--   logico do RLS. A leitura publica e feita de forma segura
--   via RPC get_public_service_order() (SECURITY DEFINER).
-- IMPACTO: Zero - rastreio e aprovacao ja usam RPC exclusivamente.
-- ============================================================

-- Remove as 7 policies inseguras
DROP POLICY IF EXISTS public_select_service_orders ON public.service_orders;
DROP POLICY IF EXISTS public_select_companies ON public.companies;
DROP POLICY IF EXISTS public_select_clients ON public.clients;
DROP POLICY IF EXISTS public_select_service_order_items ON public.service_order_items;
DROP POLICY IF EXISTS public_select_products ON public.products_inventory;
DROP POLICY IF EXISTS public_select_order_services ON public.order_services;
DROP POLICY IF EXISTS public_select_services ON public.services;

-- Verificacao: as politicas tenant-aware originais devem permanecer intactas.
-- Confirme que "public_select_*" NAO aparece nos resultados abaixo:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
