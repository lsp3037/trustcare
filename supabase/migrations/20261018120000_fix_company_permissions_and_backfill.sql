-- Migration: 20261018120000_fix_company_permissions_and_backfill.sql

-- 1. Adiciona a coluna trial_ends_at caso ainda não tenha sido criada no banco local
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. Garante permissão de leitura em trial_ends_at para anon e authenticated
--    (necessário pois 20261009120000_phase1b_secrets_and_rate_limit.sql revogou SELECT geral da tabela)
GRANT SELECT (trial_ends_at) ON public.companies TO anon, authenticated;

-- 3. Assegura que o trigger on_auth_user_created exista em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill para usuários em auth.users que não possuem perfil e empresa vinculados
--    (cenário comum ao criar usuário diretamente no dashboard do Supabase em localhost)
DO $$
DECLARE
  u RECORD;
  new_comp_id UUID;
BEGIN
  FOR u IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.id IS NULL AND (au.raw_user_meta_data->>'portal_client') IS DISTINCT FROM 'true'
  LOOP
    INSERT INTO public.companies (name, subscription_status, subscription_expires_at, trial_ends_at)
    VALUES (
      COALESCE(nullif(trim(u.raw_user_meta_data->>'company_name'), ''), 'Minha Empresa'),
      'trialing',
      NOW() + INTERVAL '14 days',
      NOW() + INTERVAL '14 days'
    )
    RETURNING id INTO new_comp_id;

    INSERT INTO public.profiles (user_id, company_id, role, full_name, email, phone)
    VALUES (
      u.id,
      new_comp_id,
      'admin',
      COALESCE(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
      u.email,
      u.raw_user_meta_data->>'phone'
    );
  END LOOP;
END $$;

-- 5. Backfill para perfis sem company_id
DO $$
DECLARE
  p RECORD;
  new_comp_id UUID;
BEGIN
  FOR p IN 
    SELECT id, email, full_name, phone
    FROM public.profiles
    WHERE company_id IS NULL
  LOOP
    INSERT INTO public.companies (name, subscription_status, subscription_expires_at, trial_ends_at)
    VALUES ('Minha Empresa', 'trialing', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days')
    RETURNING id INTO new_comp_id;

    UPDATE public.profiles
    SET company_id = new_comp_id, role = 'admin'
    WHERE id = p.id;
  END LOOP;
END $$;
