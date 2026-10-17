-- Migration: 20261017200000_secure_api_keys.sql
-- Implementa chaves de API seguras (F-27, F-38) com hash SHA-256, escopos, revogação e isolamento por tenant

-- 1. Cria a tabela api_keys se não existir
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Chave de API',
  key_hash VARCHAR(64) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['orders:read', 'orders:write'],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para busca rápida e unicidade de hash ativo
CREATE INDEX IF NOT EXISTS idx_api_keys_company_id ON public.api_keys(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash_active ON public.api_keys(key_hash) WHERE revoked_at IS NULL;

-- 2. Habilita RLS na tabela api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores se houver
DROP POLICY IF EXISTS "admin_select_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "admin_insert_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "admin_update_api_keys" ON public.api_keys;

-- Apenas admins da empresa proprietária podem visualizar suas chaves (sem expor key_hash publicamente)
CREATE POLICY "admin_select_api_keys" ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Apenas admins da empresa podem inserir chaves
CREATE POLICY "admin_insert_api_keys" ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Apenas admins da empresa podem atualizar (ex: revogar) suas chaves
CREATE POLICY "admin_update_api_keys" ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
  );

-- 3. Backfill das chaves legadas de companies.api_key (se houverem)
DO $$
DECLARE
  r RECORD;
  v_hash VARCHAR(64);
  v_prefix VARCHAR(20);
BEGIN
  FOR r IN SELECT id, api_key FROM public.companies WHERE api_key IS NOT NULL AND trim(api_key) <> '' LOOP
    v_hash := encode(sha256(convert_to(r.api_key, 'UTF8')), 'hex');
    v_prefix := 'tc_leg_' || substring(r.api_key from 1 for 6);
    
    -- Insere apenas se o hash já não existir
    IF NOT EXISTS (SELECT 1 FROM public.api_keys WHERE key_hash = v_hash) THEN
      INSERT INTO public.api_keys (company_id, name, key_hash, prefix, scopes, created_at)
      VALUES (r.id, 'Chave Legada Migrada', v_hash, v_prefix, ARRAY['orders:read', 'orders:write'], now());
    END IF;
  END LOOP;
END $$;

-- 4. Protege colunas sensíveis em companies (F-04, F-38)
-- Revoga acesso direto às colunas sensíveis para evitar que técnicos/viewers leiam
REVOKE UPDATE (subscription_plan, subscription_status, subscription_expires_at, asaas_customer_id, asaas_subscription_id) ON public.companies FROM authenticated, anon;
