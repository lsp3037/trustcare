-- Migration: 20261017230000_billing_events_idempotency.sql
-- Tabela de eventos de faturamento para garantir idempotência de webhooks do Asaas (F-31)

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id TEXT UNIQUE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para idempotência e rastreabilidade por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_events_asaas_id ON public.billing_events(asaas_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_company_id ON public.billing_events(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed_at ON public.billing_events(processed_at);

-- Habilita RLS estrita: acessível exclusivamente via service_role
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_events FROM anon, authenticated, public;
GRANT ALL ON public.billing_events TO service_role;
