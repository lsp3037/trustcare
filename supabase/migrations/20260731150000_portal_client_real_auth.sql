-- ============================================================
-- MIGRATION: 20260731150000_portal_client_real_auth
-- MOTIVO: O Portal do Cliente (/portal) não tinha autenticação real.
--   O proxy confiava no cookie 'portal-session-mock=true', gravado pelo
--   próprio browser em app/(public)/portal/page.tsx. Qualquer pessoa
--   forjava o cookie e o localStorage 'portal-client' e abria o painel
--   de qualquer cliente. Além disso o login consultava `clients` com a
--   chave anon, que a RLS bloqueia para anônimos — na prática o portal
--   online nunca funcionou, só o fallback em localStorage.
--
-- IMPACTO: O cliente passa a autenticar por magic link (Supabase Auth).
--   Ele entra no mesmo pool de auth.users da equipe, porém marcado com
--   raw_user_meta_data->>'portal_client' = 'true', SEM company e SEM
--   profile — sem profile, get_my_company_id() devolve NULL e toda a RLS
--   do painel administrativo o trata como estranho.
-- ============================================================

-- 1. handle_new_user(): clientes do portal não viram tenant nem staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  target_company_id UUID;
  company_name_val TEXT;
  user_role TEXT;
  invite_record RECORD;
BEGIN
  -- Cliente final do Portal: nenhuma empresa e nenhum perfil são criados.
  IF (new.raw_user_meta_data->>'portal_client') = 'true' THEN
    RETURN new;
  END IF;

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


-- 2. RPC do Portal: escopada pelo e-mail VERIFICADO do JWT.
--    Não aceita client_id como parâmetro — o vínculo é resolvido no banco,
--    então não há como pedir os dados de outra pessoa.
CREATE OR REPLACE FUNCTION public.get_my_portal_data()
RETURNS JSONB AS $$
DECLARE
    v_email TEXT;
    v_client_ids UUID[];
    v_result JSONB;
BEGIN
    v_email := lower(nullif(auth.jwt() ->> 'email', ''));

    IF v_email IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT array_agg(id) INTO v_client_ids
    FROM public.clients
    WHERE lower(email) = v_email;

    IF v_client_ids IS NULL THEN
        RETURN jsonb_build_object(
            'clients', '[]'::jsonb,
            'orders', '[]'::jsonb,
            'equipments', '[]'::jsonb
        );
    END IF;

    SELECT jsonb_build_object(
        'clients', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'company_id', c.company_id,
                'company_name', co.name
            )), '[]'::jsonb)
            FROM public.clients c
            LEFT JOIN public.companies co ON co.id = c.company_id
            WHERE c.id = ANY(v_client_ids)
        ),
        'orders', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', so.id,
                'codigo_os', so.codigo_os,
                'status', so.status,
                'equipment_details', so.equipment_details,
                'reported_problem', so.reported_problem,
                'technical_report', so.technical_report,
                'total_value', so.total_value,
                'delivery_prediction', so.delivery_prediction,
                'created_at', so.created_at
            ) ORDER BY so.created_at DESC), '[]'::jsonb)
            FROM public.service_orders so
            WHERE so.client_id = ANY(v_client_ids)
        ),
        'equipments', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', eq.id,
                'name', eq.name,
                'brand', eq.brand,
                'model', eq.model,
                'serial_number', eq.serial_number
            ) ORDER BY eq.name), '[]'::jsonb)
            FROM public.client_equipments eq
            WHERE eq.client_id = ANY(v_client_ids)
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_my_portal_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_portal_data() TO authenticated;

CREATE INDEX IF NOT EXISTS idx_clients_email_lower ON public.clients (lower(email));
