-- 1. ADICIONAR COLUNA
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ;

-- 2. POPULAR DADOS ANTIGOS (Para que O.S. velhas tenham contador)
UPDATE public.service_orders 
SET analysis_started_at = created_at 
WHERE analysis_started_at IS NULL;

-- 3. CRIAR TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA
CREATE OR REPLACE FUNCTION update_analysis_started_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudar para 'Em Análise' e a data estiver vazia, preencha
  IF NEW.status = 'Em Análise' AND OLD.status != 'Em Análise' AND NEW.analysis_started_at IS NULL THEN
    NEW.analysis_started_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove o trigger se existir para evitar duplicação em execuções repetidas
DROP TRIGGER IF EXISTS trigger_update_analysis_started_at ON public.service_orders;

CREATE TRIGGER trigger_update_analysis_started_at
BEFORE UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION update_analysis_started_at();
