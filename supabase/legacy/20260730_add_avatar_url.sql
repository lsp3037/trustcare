-- Migration: Add avatar_url to profiles and setup user-avatars bucket
-- Date: 2026-07-30

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Cria o bucket 'user-avatars' se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para o bucket
-- Permite leitura pública dos avatares
DROP POLICY IF EXISTS "Avatar read" ON storage.objects;
CREATE POLICY "Avatar read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'user-avatars');

-- Permite insert/update pelo dono
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
CREATE POLICY "Avatar upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'user-avatars' AND (auth.uid()::text = (string_to_array(name, '/'))[1]));

DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
CREATE POLICY "Avatar update" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'user-avatars' AND (auth.uid()::text = (string_to_array(name, '/'))[1]));
