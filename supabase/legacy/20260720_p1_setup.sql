-- Tabela para log de requisições públicas (Rate Limit)
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    request_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e criar política de inserção anônima restrita
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insert_hits ON public.rate_limit_hits;
CREATE POLICY insert_hits ON public.rate_limit_hits 
    FOR INSERT WITH CHECK (true);

-- Função para limpar logs antigos e validar limites de requisição por IP
CREATE OR REPLACE FUNCTION public.check_and_clean_rate_limit(client_ip TEXT, target_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_hit_count INT;
BEGIN
  -- Limpa logs com mais de 1 minuto
  DELETE FROM public.rate_limit_hits WHERE created_at < NOW() - INTERVAL '1 minute';
  
  -- Insere o hit atual
  INSERT INTO public.rate_limit_hits (ip_address, request_path) VALUES (client_ip, target_path);
  
  -- Conta acessos no último minuto
  SELECT COUNT(*) INTO v_hit_count 
  FROM public.rate_limit_hits 
  WHERE ip_address = client_ip AND request_path = target_path;
  
  -- Limiar: máximo de 30 requisições por minuto nas rotas públicas
  IF v_hit_count > 30 THEN
    RETURN FALSE;
  ELSE
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
