-- Migration: Adiciona Recorrência nas Despesas
ALTER TABLE public.company_expenses
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'Única'
  CHECK (recurrence IN ('Única', 'Diária', 'Semanal', 'Mensal', 'Anual')),
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
