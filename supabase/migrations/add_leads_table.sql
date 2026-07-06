-- Migration: add_leads_table
-- Date: 2026-07-04
-- Description: Creates the leads table for the CRM funnel

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Novo Contato' CHECK (status IN ('Novo Contato', 'Em Negociação', 'Aguardando Equipamento', 'Ganho/Convertido', 'Perdido')),
    equipment_info TEXT,
    problem_description TEXT,
    valor_estimado NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (valor_estimado >= 0),
    motivo_perda TEXT,
    origem TEXT DEFAULT 'WhatsApp',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Adicionar Política de RLS (os leads pertencem ao tenant)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'leads'
        AND policyname = 'Leads isolation per company'
    ) THEN
        CREATE POLICY "Leads isolation per company"
        ON public.leads
        FOR ALL
        USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
    END IF;
END $$;
