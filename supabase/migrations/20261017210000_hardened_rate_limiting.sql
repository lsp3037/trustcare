-- Migration: 20261017210000_hardened_rate_limiting.sql
-- Fortalece o rate limiting (F-33): revoga permissões de anon, otimiza índices e melhora a RPC com limpeza eficiente

-- 1. Revoga todas as permissões de anon e authenticated sobre a tabela rate_limit_hits
REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated, public;
GRANT ALL ON public.rate_limit_hits TO service_role;

-- 2. Cria índices para acelerar busca e limpeza
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_ip_path_created
  ON public.rate_limit_hits (ip_address, request_path, created_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_created_at
  ON public.rate_limit_hits (created_at);

-- 3. Otimiza a função de rate limiting
-- A contagem avalia apenas a janela deslizante de 1 minuto usando o índice composto.
-- A limpeza é executada de forma probabilística (10% das requisições) para evitar lock contention a cada chamada.
CREATE OR REPLACE FUNCTION public.check_and_clean_rate_limit(client_ip text, target_path text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_hit_count INT;
BEGIN
  -- Limpeza probabilística para não onerar o banco com DELETE em toda chamada
  IF random() < 0.1 THEN
    DELETE FROM public.rate_limit_hits WHERE created_at < NOW() - INTERVAL '5 minutes';
  END IF;

  -- Registra a requisição atual
  INSERT INTO public.rate_limit_hits (ip_address, request_path, created_at)
  VALUES (client_ip, target_path, NOW());

  -- Conta requisições na janela de 1 minuto
  SELECT COUNT(*) INTO v_hit_count
  FROM public.rate_limit_hits
  WHERE ip_address = client_ip
    AND request_path = target_path
    AND created_at >= NOW() - INTERVAL '1 minute';

  -- Limite padrão: 30 requisições por minuto por IP/rota
  IF v_hit_count > 30 THEN
    RETURN FALSE;
  ELSE
    RETURN TRUE;
  END IF;
END;
$$;

-- Restringe execução exclusivamente a service_role (usado pelos route handlers Next.js)
REVOKE EXECUTE ON FUNCTION public.check_and_clean_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_clean_rate_limit(text, text) TO service_role;
