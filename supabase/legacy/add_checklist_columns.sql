-- Adiciona as colunas para o Checklist de Entrada e Saída (JSONB)
ALTER TABLE public.service_orders ADD COLUMN entry_checklist JSONB;
ALTER TABLE public.service_orders ADD COLUMN exit_checklist JSONB;
