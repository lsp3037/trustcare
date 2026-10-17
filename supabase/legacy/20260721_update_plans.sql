-- 1. Insert new plans
INSERT INTO public.plans (id, name, max_technicians, max_storage_bytes)
VALUES 
('starter', 'Starter', 1, 1073741824), -- 1 GB
('pro', 'Pro', 3, 5368709120) -- 5 GB
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    max_technicians = EXCLUDED.max_technicians,
    max_storage_bytes = EXCLUDED.max_storage_bytes;

-- 2. Update existing Premium plan for unlimited users (we use a large number)
UPDATE public.plans SET 
    name = 'Premium',
    max_technicians = 99999,
    max_storage_bytes = 53687091200 -- 50 GB
WHERE id = 'premium';

-- 3. Temporarily remove default to avoid issues during migration
ALTER TABLE public.companies ALTER COLUMN subscription_plan DROP DEFAULT;

-- 4. Update existing companies to new plans
UPDATE public.companies SET subscription_plan = 'starter' WHERE subscription_plan = 'basico';
UPDATE public.companies SET subscription_plan = 'pro' WHERE subscription_plan = 'profissional';

-- 5. Remove old plans
DELETE FROM public.plans WHERE id IN ('basico', 'profissional');

-- 6. Set new default
ALTER TABLE public.companies ALTER COLUMN subscription_plan SET DEFAULT 'starter';
