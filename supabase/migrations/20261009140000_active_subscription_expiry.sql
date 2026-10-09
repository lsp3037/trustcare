-- ============================================================
-- Vencimento também vale para assinatura `active`
-- Antes, `active` nunca ficava somente leitura, mesmo com
-- subscription_expires_at no passado: conta paga uma vez ficava liberada
-- para sempre se o webhook do Asaas não mudasse o status.
--
-- Regra nova (mesmos 5 dias de carência do `past_due`):
--   active + expires_at NULL            -> liberada (conta manual / contrato
--                                          fora do app, sem vencimento por data)
--   active + now > expires_at + 5 dias  -> somente leitura
-- `trialing`, `past_due` e `canceled` não mudam.
--
-- ⚠️ Antes de aplicar, conferir empresas `active` já vencidas — elas
-- bloqueiam na hora. Para manter uma conta manual liberada, zerar o
-- vencimento dela ANTES desta migration:
--   UPDATE public.companies SET subscription_expires_at = NULL WHERE id = '<id>';
--
-- Espelho no front: lib/context/CompanyContext.tsx (isReadOnly).
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_company_read_only(comp_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_status, subscription_expires_at INTO v_status, v_expires_at
  FROM public.companies WHERE id = comp_id;

  IF v_status = 'canceled' THEN
    RETURN TRUE;
  ELSIF v_status = 'past_due' AND (v_expires_at IS NULL OR NOW() > (v_expires_at + INTERVAL '5 days')) THEN
    RETURN TRUE;
  -- Trial vencido: sem período de graça, o acesso de escrita encerra na data.
  -- expires_at NULL em trial é tratado como vencido (não existe trial infinito).
  ELSIF v_status = 'trialing' AND (v_expires_at IS NULL OR NOW() > v_expires_at) THEN
    RETURN TRUE;
  -- Ativa com vencimento passado (+5 dias de carência). NULL = sem vencimento.
  ELSIF v_status = 'active' AND v_expires_at IS NOT NULL AND NOW() > (v_expires_at + INTERVAL '5 days') THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;

-- ============================================================
-- REVERSÃO: recriar a função sem o ramo `active` (versão anterior):
-- remover as duas linhas do ELSIF v_status = 'active'.
-- ============================================================
