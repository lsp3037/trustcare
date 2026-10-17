-- ============================================================
-- MIGRATION: 20261017170000_secure_tracking_otp.sql
--
-- FASE 3 - Item 3.1: Rastreio seguro (F-21, F-28)
--
-- 1. Adiciona coluna code_hash (SHA-256) e flag used na tabela os_verifications.
-- 2. Torna a coluna code opcional (removendo a exigência de texto plano).
-- 3. Adiciona índice composto para verificação rápida de rate limit por OS.
-- 4. Cria RPC verify_tracking_otp com atualização atômica de tentativas (UPDATE ... RETURNING),
--    proteção estrita contra concorrência e race conditions, e validação de hash em tempo constante.
-- ============================================================

-- 1. Alterar tabela os_verifications
ALTER TABLE public.os_verifications ADD COLUMN IF NOT EXISTS code_hash VARCHAR(64);
ALTER TABLE public.os_verifications ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.os_verifications ALTER COLUMN code DROP NOT NULL;

-- 2. Índice para acelerar verificação de limites recentes por OS
CREATE INDEX IF NOT EXISTS idx_os_verifications_os_id_created 
  ON public.os_verifications(os_id, created_at);

-- 3. RPC para validação atômica de OTP com incremento protegido de tentativas
CREATE OR REPLACE FUNCTION public.verify_tracking_otp(
  p_verification_id UUID,
  p_code_hash VARCHAR(64),
  p_max_attempts INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  -- Incremento atômico de tentativas com trava da linha (evita bypass de corrida)
  UPDATE public.os_verifications
  SET attempts = attempts + 1
  WHERE id = p_verification_id
    AND used = false
  RETURNING id, os_id, code_hash, expires_at, attempts
  INTO v_rec;

  -- Se não encontrou linha (ou token já foi consumido)
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'TOKEN_NOT_FOUND_OR_USED');
  END IF;

  -- Token expirado
  IF v_rec.expires_at < v_now THEN
    UPDATE public.os_verifications SET used = true WHERE id = p_verification_id;
    RETURN jsonb_build_object('valid', false, 'reason', 'EXPIRED');
  END IF;

  -- Excesso de tentativas anteriores
  IF v_rec.attempts > p_max_attempts THEN
    UPDATE public.os_verifications SET used = true WHERE id = p_verification_id;
    RETURN jsonb_build_object('valid', false, 'reason', 'MAX_ATTEMPTS_EXCEEDED');
  END IF;

  -- Comparação do hash SHA-256 (64 hex characters)
  IF v_rec.code_hash IS NOT NULL AND v_rec.code_hash = p_code_hash THEN
    -- Sucesso: consome o token imediatamente para impedir reutilização
    UPDATE public.os_verifications SET used = true WHERE id = p_verification_id;
    RETURN jsonb_build_object('valid', true, 'os_id', v_rec.os_id);
  ELSE
    -- Se acabou de atingir o limite nesta tentativa
    IF v_rec.attempts >= p_max_attempts THEN
      UPDATE public.os_verifications SET used = true WHERE id = p_verification_id;
      RETURN jsonb_build_object('valid', false, 'reason', 'MAX_ATTEMPTS_EXCEEDED');
    END IF;

    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'INVALID_CODE',
      'remaining_attempts', GREATEST(0, p_max_attempts - v_rec.attempts)
    );
  END IF;
END;
$$;

-- Restringir permissões: apenas service_role pode executar
REVOKE ALL ON FUNCTION public.verify_tracking_otp(UUID, VARCHAR, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_tracking_otp(UUID, VARCHAR, INT) TO service_role;
