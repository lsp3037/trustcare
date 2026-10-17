-- Migration: 20261017220000_real_trial_lifecycle.sql
-- Implementa ciclo de vida real de trial (F-08) e fecha brecha de signup sem convite (F-07)

-- 1. Adiciona coluna trial_ends_at em companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Backfill para empresas existentes em status trialing
UPDATE public.companies
SET trial_ends_at = COALESCE(subscription_expires_at, created_at + INTERVAL '14 days')
WHERE subscription_status = 'trialing' AND trial_ends_at IS NULL;

-- 2. Atualiza a função handle_new_user eliminando leitura de company_id/role do metadata (F-07)
-- e gravando trial_ends_at explícito na criação da empresa (F-08)
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  target_company_id UUID;
  company_name_val TEXT;
  user_role TEXT;
  invite_record RECORD;
BEGIN
  -- Clientes finais do Portal: nenhuma empresa e nenhum perfil administrativo são criados
  IF (new.raw_user_meta_data->>'portal_client') = 'true' THEN
    RETURN new;
  END IF;

  -- Se foi fornecido um token de convite, valida estritamente na tabela invites
  IF (new.raw_user_meta_data->>'invite_token') IS NOT NULL THEN
    SELECT * INTO invite_record
    FROM public.invites
    WHERE token = new.raw_user_meta_data->>'invite_token'
      AND lower(email) = lower(new.email)
      AND used = FALSE
      AND expires_at > now();

    IF FOUND THEN
      target_company_id := invite_record.company_id;
      user_role := invite_record.role;
      UPDATE public.invites SET used = TRUE WHERE id = invite_record.id;
    ELSE
      -- Convite inválido ou expirado: cria nova empresa própria em modo trial
      company_name_val := COALESCE(nullif(trim(new.raw_user_meta_data->>'company_name'), ''), 'Minha Empresa');
      INSERT INTO public.companies (name, subscription_status, subscription_expires_at, trial_ends_at)
      VALUES (company_name_val, 'trialing', now() + INTERVAL '14 days', now() + INTERVAL '14 days')
      RETURNING id INTO target_company_id;
      user_role := 'admin';
    END IF;
  ELSE
    -- F-07: Signup sem convite NUNCA aceita company_id ou role do user_metadata.
    -- O usuário que se cadastra sem convite sempre cria uma nova empresa da qual é admin.
    company_name_val := COALESCE(nullif(trim(new.raw_user_meta_data->>'company_name'), ''), 'Minha Empresa');
    INSERT INTO public.companies (name, subscription_status, subscription_expires_at, trial_ends_at)
    VALUES (company_name_val, 'trialing', now() + INTERVAL '14 days', now() + INTERVAL '14 days')
    RETURNING id INTO target_company_id;
    user_role := 'admin';
  END IF;

  -- Cria o perfil do usuário vinculado à empresa resolvida
  INSERT INTO public.profiles (user_id, company_id, role, full_name, email, phone)
  VALUES (
    new.id,
    target_company_id,
    user_role,
    COALESCE(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  );

  RETURN new;
END;
$$;

-- 3. Atualiza is_company_read_only para considerar trial_ends_at
CREATE OR REPLACE FUNCTION public.is_company_read_only(comp_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_status, subscription_expires_at, trial_ends_at
  INTO v_status, v_expires_at, v_trial_ends_at
  FROM public.companies WHERE id = comp_id;

  IF v_status = 'canceled' THEN
    RETURN TRUE;
  ELSIF v_status = 'past_due' AND (v_expires_at IS NULL OR NOW() > (v_expires_at + INTERVAL '5 days')) THEN
    RETURN TRUE;
  -- Trial vencido: sem período de graça adicional, o acesso de escrita encerra na data do trial
  ELSIF v_status = 'trialing' AND (COALESCE(v_trial_ends_at, v_expires_at) IS NULL OR NOW() > COALESCE(v_trial_ends_at, v_expires_at)) THEN
    RETURN TRUE;
  -- Ativa com vencimento passado (+5 dias de carência). NULL = sem vencimento
  ELSIF v_status = 'active' AND v_expires_at IS NOT NULL AND NOW() > (v_expires_at + INTERVAL '5 days') THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- 4. Função/Job para expirar trials vencidos automaticamente (F-08)
CREATE OR REPLACE FUNCTION public.expire_overdue_trials()
  RETURNS INT
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_affected INT;
BEGIN
  UPDATE public.companies
  SET subscription_status = 'past_due'
  WHERE subscription_status = 'trialing'
    AND COALESCE(trial_ends_at, subscription_expires_at) < NOW();

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_overdue_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_trials() TO service_role;
