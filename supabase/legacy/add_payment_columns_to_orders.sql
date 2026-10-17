-- Adiciona coluna de Data de Pagamento
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Adiciona coluna de Forma de Pagamento
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT;
