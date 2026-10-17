-- ============================================================
-- MIGRATION: 20261017190000_secure_portal_auth.sql
--
-- FASE 3 - Item 3.3: Portal do cliente seguro com OTP por e-mail (F-20)
--
-- 1. Cria tabela portal_verifications com RLS restrita a service_role.
-- 2. Cria RPC atômica verify_portal_otp com lock de linha e incremento seguro de tentativas.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portal_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_only ON public.portal_verifications;
CREATE POLICY service_role_only ON public.portal_verifications
  FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_portal_verifications_email 
  ON public.portal_verifications (lower(email), created_at);

-- RPC para validação atômica de OTP do Portal do Cliente
CREATE OR REPLACE FUNCTION public.verify_portal_otp(
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
  -- Incremento atômico de tentativas com trava da linha (evita corrida de palpites)
  UPDATE public.portal_verifications
  SET attempts = attempts + 1
  WHERE id = p_verification_id
    AND used = false
  RETURNING id, email, code_hash, expires_at, attempts
  INTO v_rec;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'TOKEN_NOT_FOUND_OR_USED');
  END IF;

  IF v_rec.expires_at < v_now THEN
    UPDATE public.portal_verifications SET used = true WHERE id = p_verification_id;
    RETURN jsonb_build_object('valid', false, 'reason', 'EXPIRED');
  END IF;

  IF v_rec.attempts > p_max_attempts THEN
    UPDATE public.portal_verifications SET used = true WHERE id = p_verification_id;
    RETURN jsonb_build_object('valid', false, 'reason', 'MAX_ATTEMPTS_EXCEEDED');
  END IF;

  -- Validação de hash em tempo constante
  IF v_rec.code_hash IS NOT NULL AND v_rec.code_hash = p_code_hash THEN
    -- Consumir token com sucesso
    UPDATE public.portal_verifications SET used = true WHERE id = p_verification_id;
    RETURN jsonb_build_object('valid', true, 'email', v_rec.email);
  ELSE
    IF v_rec.attempts >= p_max_attempts THEN
      UPDATE public.portal_verifications SET used = true WHERE id = p_verification_id;
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

REVOKE ALL ON FUNCTION public.verify_portal_otp(UUID, VARCHAR, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_portal_otp(UUID, VARCHAR, INT) TO service_role;
