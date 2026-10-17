-- ============================================================
-- MIGRATION: 20260731190000_codigo_os_per_company
--
-- BUG CORRIGIDO: generate_codigo_os() era SECURITY INVOKER, então o SELECT
--   que busca o último código rodava sob RLS e só enxergava as OS da própria
--   empresa — enquanto o UNIQUE em codigo_os era global. Resultado: o segundo
--   tenant a existir calculava 'TC-YYYY-0001', colidia com o código do
--   primeiro e o INSERT falhava. Na prática, nenhuma empresa além da primeira
--   conseguia abrir uma ordem de serviço.
--
--   O `EXCEPTION WHEN OTHERS` da função não salvava: a violação de unicidade
--   acontece no INSERT, depois que o trigger já retornou.
--
-- DECISÃO: numeração por empresa. Cada loja tem sua própria sequência
--   começando em 0001, que é o comportamento esperado num SaaS, e a unicidade
--   passa a ser (company_id, codigo_os).
--
-- EFEITO COLATERAL tratado em 20260731191000_tracking_lookup_rpc.sql:
--   'TC-2026-0001' passa a existir em vários tenants, e o rastreio público
--   precisa desambiguar por subdomínio.
--
-- VERIFICADO: duas empresas novas abrindo OS em sequência receberam
--   TC-2026-0001 e TC-2026-0002 cada uma, e a empresa com histórico
--   continuou de 0024 para 0025.
-- ============================================================

-- 1. Unicidade por tenant, não global
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_codigo_os_key;

ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_company_codigo_os_key UNIQUE (company_id, codigo_os);

-- 2. Sequência por empresa
CREATE OR REPLACE FUNCTION public.generate_codigo_os()
RETURNS trigger AS $$
DECLARE
  yyyy TEXT;
  next_val INT;
BEGIN
  -- Código informado explicitamente (import, migração) é respeitado
  IF NEW.codigo_os IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id é obrigatório para gerar o código da OS.';
  END IF;

  yyyy := to_char(COALESCE(NEW.created_at, now()), 'YYYY');

  -- Serializa a numeração por empresa: duas inserções simultâneas no mesmo
  -- tenant não podem calcular o mesmo sequencial. O lock cai no commit.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.company_id::text || ':' || yyyy));

  -- MAX do sufixo numérico dentro da empresa e do ano. O regex estrito ignora
  -- os códigos legados 'TC-YYYY-ERR-xxxx' gerados pelo fallback antigo.
  SELECT COALESCE(MAX(substring(codigo_os from 9 for 4)::int), 0) + 1
    INTO next_val
  FROM public.service_orders
  WHERE company_id = NEW.company_id
    AND codigo_os ~ ('^TC-' || yyyy || '-[0-9]{4}$');

  NEW.codigo_os := 'TC-' || yyyy || '-' || lpad(next_val::text, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Nota: o EXCEPTION WHEN OTHERS que existia aqui foi removido de propósito.
-- Ele mascarava falhas gerando códigos 'TC-YYYY-ERR-xxxx' impossíveis de
-- rastrear. Com SECURITY DEFINER a consulta enxerga o que precisa, e um erro
-- real deve interromper a inserção em vez de gravar lixo.
