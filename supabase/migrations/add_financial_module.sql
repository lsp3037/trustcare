-- 1. Garante a existência das colunas de pagamento legadas
ALTER TABLE public.service_orders 
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 2. Adiciona coluna payment_status (controle mais granular que o booleano 'pago')
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente'
  CHECK (payment_status IN ('pendente', 'pago', 'parcial'));

-- 2. Sincroniza payment_status com o campo legado 'pago' para dados existentes
UPDATE public.service_orders
  SET payment_status = 'pago'
  WHERE pago = TRUE AND payment_status = 'pendente';

-- 3. Padroniza payment_method: cria constraint de valores aceitos
-- (safe: só adiciona a constraint, não quebra dados existentes nulos)
ALTER TABLE public.service_orders
  DROP CONSTRAINT IF EXISTS service_orders_payment_method_check;

ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_payment_method_check
  CHECK (
    payment_method IS NULL OR payment_method IN (
      'Pix',
      'Cartão de Crédito',
      'Cartão de Débito',
      'Dinheiro',
      'Transferência Bancária',
      'Boleto Bancário',
      'Outro'
    )
  );
