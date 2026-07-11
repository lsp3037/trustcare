-- Migration: Tabela de Despesas Gerais da Empresa (Company Expenses)

CREATE TABLE IF NOT EXISTS public.company_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL CHECK (category IN ('Marketing', 'Equipamentos', 'Aluguel', 'Salários', 'Software/Nuvem', 'Infraestrutura', 'Outros')),
    expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de Tenant Isolado
DROP POLICY IF EXISTS select_expenses ON public.company_expenses;
CREATE POLICY select_expenses ON public.company_expenses
    FOR SELECT USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS insert_expenses ON public.company_expenses;
CREATE POLICY insert_expenses ON public.company_expenses
    FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS delete_expenses ON public.company_expenses;
CREATE POLICY delete_expenses ON public.company_expenses
    FOR DELETE USING (company_id = public.get_my_company_id());
