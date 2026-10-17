-- Cria a tabela de templates de checklist
CREATE TABLE public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.equipment_categories(id) ON DELETE CASCADE,
    schema JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_category_template_per_company UNIQUE (company_id, category_id)
);

-- Habilitar RLS para checklist_templates
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para checklist_templates
CREATE POLICY manage_checklist_templates ON public.checklist_templates
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());
