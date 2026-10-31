-- Migration: 20261017240000_platform_admin_and_audit.sql
-- Tabela de auditoria para ações administrativas de super-admin no Backoffice (F-32)

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_user_id ON public.platform_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created_at ON public.platform_audit_logs(created_at DESC);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_audit_logs FROM anon, authenticated, public;
GRANT ALL ON public.platform_audit_logs TO service_role;
