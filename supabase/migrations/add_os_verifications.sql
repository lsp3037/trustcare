-- ==========================================
-- TABELA DE VERIFICAÇÃO DE TOKEN PARA RASTREIO
-- ==========================================

CREATE TABLE IF NOT EXISTS public.os_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.os_verifications ENABLE ROW LEVEL SECURITY;

-- Permitir inserção pela API (bypassando RLS via service role)
-- Permitir leitura pela API
CREATE POLICY service_role_only ON public.os_verifications
    FOR ALL USING (false) WITH CHECK (false);
