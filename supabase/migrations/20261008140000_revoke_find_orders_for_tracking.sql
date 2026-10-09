-- ============================================================
-- find_orders_for_tracking: SECURITY DEFINER executável por anon.
-- Devolvia nome e e-mail completo do cliente para qualquer código de OS
-- (sequencial: TC-AAAA-0001, 0002...) sem passar pelo OTP — mesmo problema
-- de get_public_service_order, removida na phase0. O app não chama esta
-- função (o rastreio usa /api/rastreio/* com service role).
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.find_orders_for_tracking(text, text) FROM PUBLIC, anon, authenticated;

-- REVERSÃO:
-- GRANT EXECUTE ON FUNCTION public.find_orders_for_tracking(text, text) TO anon, authenticated;
