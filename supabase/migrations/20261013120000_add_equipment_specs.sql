-- Migration: Adiciona especificações opcionais de hardware para equipamentos de clientes
ALTER TABLE public.client_equipments
  ADD COLUMN IF NOT EXISTS processor TEXT,
  ADD COLUMN IF NOT EXISTS ram TEXT,
  ADD COLUMN IF NOT EXISTS storage TEXT,
  ADD COLUMN IF NOT EXISTS gpu_type TEXT,
  ADD COLUMN IF NOT EXISTS gpu_model TEXT;

COMMENT ON COLUMN public.client_equipments.processor IS 'Processador (CPU) da máquina';
COMMENT ON COLUMN public.client_equipments.ram IS 'Memória RAM instalada';
COMMENT ON COLUMN public.client_equipments.storage IS 'Armazenamento (SSD / HD)';
COMMENT ON COLUMN public.client_equipments.gpu_type IS 'Tipo de placa de vídeo: integrada, dedicada ou não informado';
COMMENT ON COLUMN public.client_equipments.gpu_model IS 'Modelo da GPU quando dedicada ou especificada';
