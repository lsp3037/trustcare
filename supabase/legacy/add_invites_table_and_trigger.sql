-- Create invites table
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'viewer')),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can view and insert invites for their company
CREATE POLICY select_invites ON public.invites
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY insert_invites ON public.invites
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id() 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY delete_invites ON public.invites
    FOR DELETE USING (
        company_id = public.get_my_company_id() 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Update handle_new_user function to use invite token
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  target_company_id UUID;
  company_name_val TEXT;
  user_role TEXT;
  invite_record RECORD;
BEGIN
  -- If invite_token is provided in user metadata
  IF (new.raw_user_meta_data->>'invite_token') IS NOT NULL THEN
    -- Try to find a valid, unused invite for this token and email
    SELECT * INTO invite_record 
    FROM public.invites 
    WHERE token = new.raw_user_meta_data->>'invite_token' 
      AND email = new.email 
      AND used = FALSE 
      AND expires_at > now();
      
    IF FOUND THEN
      target_company_id := invite_record.company_id;
      user_role := invite_record.role;
      
      -- Mark invite as used
      UPDATE public.invites SET used = TRUE WHERE id = invite_record.id;
    ELSE
      -- Invite invalid or expired, default to creating a new company
      company_name_val := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
      INSERT INTO public.companies (name)
      VALUES (company_name_val)
      RETURNING id INTO target_company_id;
      user_role := 'admin';
    END IF;
  ELSE
    -- Normal new signup (creates a new tenant)
    company_name_val := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
    INSERT INTO public.companies (name)
    VALUES (company_name_val)
    RETURNING id INTO target_company_id;
    user_role := 'admin';
  END IF;

  -- Create the user profile
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
