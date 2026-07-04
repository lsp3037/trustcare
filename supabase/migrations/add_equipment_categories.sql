-- 1. Cria a tabela equipment_categories
CREATE TABLE public.equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita RLS para equipment_categories
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY manage_equipment_categories ON public.equipment_categories
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

-- 2. Atualiza a tabela client_equipments adicionando category_id
ALTER TABLE public.client_equipments
ADD COLUMN category_id UUID REFERENCES public.equipment_categories(id) ON DELETE SET NULL;
