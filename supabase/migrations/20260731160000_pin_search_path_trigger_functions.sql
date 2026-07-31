-- ============================================================
-- MIGRATION: 20260731160000_pin_search_path_trigger_functions
-- MOTIVO: O linter do Supabase ainda apontava search_path mutável em três
--   funções de trigger. Elas são SECURITY INVOKER (risco bem menor que as
--   SECURITY DEFINER já corrigidas), mas não há motivo para deixá-las abertas.
-- ============================================================

ALTER FUNCTION public.generate_codigo_os() SET search_path = public;
ALTER FUNCTION public.update_analysis_started_at() SET search_path = public;
ALTER FUNCTION public.check_technician_quota() SET search_path = public;
