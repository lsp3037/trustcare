-- ============================================================
-- MIGRATION: rastreio_otp_lockout
-- MOTIVO: /api/rastreio/verify-token aceitava tentativas ilimitadas de
--   adivinhar o codigo de 6 digitos (1.000.000 combinacoes) sem nenhum
--   throttle, permitindo forca bruta dentro da janela de 15 minutos de
--   validade do token.
-- IMPACTO: Adiciona um contador de tentativas por token; apos 5 tentativas
--   erradas o token e invalidado e um novo codigo precisa ser solicitado.
-- ============================================================

ALTER TABLE public.os_verifications ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
