-- ============================================================
-- MIGRATION: 20260731140000_enforce_trial_expiration
-- MOTIVO: is_company_read_only() só bloqueava 'canceled' e 'past_due'.
--   Como o DEFAULT de companies.subscription_status é 'trialing', o ramo
--   ELSE devolvia FALSE para sempre — ou seja, toda empresa cadastrada
--   tinha acesso de escrita gratuito e ilimitado. A tela de billing
--   anunciava "7 dias de teste", mas nada no banco encerrava o período.
-- IMPACTO: O trial passa a ter data. Vencido, o tenant cai em modo
--   apenas-leitura (as policies write_* já dependem desta função);
--   a leitura do histórico continua liberada.
-- ============================================================

-- 1. is_company_read_only(): trial vencido entra em modo apenas-leitura
CREATE OR REPLACE FUNCTION public.is_company_read_only(comp_id UUID)
RETURNS BOOLEAN AS $$
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

  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Toda empresa nova nasce com 7 dias de trial datado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  target_company_id UUID;
  company_name_val TEXT;
  user_role TEXT;
  invite_record RECORD;
BEGIN
  IF (new.raw_user_meta_data->>'invite_token') IS NOT NULL THEN
    SELECT * INTO invite_record
    FROM public.invites
    WHERE token = new.raw_user_meta_data->>'invite_token'
      AND email = new.email
      AND used = FALSE
      AND expires_at > now();

    IF FOUND THEN
      target_company_id := invite_record.company_id;
      user_role := invite_record.role;
      UPDATE public.invites SET used = TRUE WHERE id = invite_record.id;
    ELSE
      company_name_val := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
      INSERT INTO public.companies (name, subscription_status, subscription_expires_at)
      VALUES (company_name_val, 'trialing', now() + INTERVAL '7 days')
      RETURNING id INTO target_company_id;
      user_role := 'admin';
    END IF;
  ELSE
    IF (new.raw_user_meta_data->>'company_id') IS NOT NULL THEN
      target_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
      user_role := COALESCE(new.raw_user_meta_data->>'role', 'technician');
    ELSE
      company_name_val := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
      INSERT INTO public.companies (name, subscription_status, subscription_expires_at)
      VALUES (company_name_val, 'trialing', now() + INTERVAL '7 days')
      RETURNING id INTO target_company_id;
      user_role := 'admin';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, company_id, role, full_name, email, phone)
  VALUES (
    new.id,
    target_company_id,
    user_role,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Membro da Equipe'),
    new.email,
    new.raw_user_meta_data->>'phone'
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Backfill: tenants criados antes desta regra tinham expires_at NULL.
--    Concede a eles uma janela de 7 dias a partir da aplicação da migração
--    em vez de bloqueá-los retroativamente.
UPDATE public.companies
SET subscription_expires_at = now() + INTERVAL '7 days'
WHERE subscription_status = 'trialing'
  AND subscription_expires_at IS NULL;
