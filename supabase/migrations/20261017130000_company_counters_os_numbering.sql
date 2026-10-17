-- ============================================================
-- MIGRATION: 20261017130000_company_counters_os_numbering.sql
-- FASE 2: Integridade da OS e do Dinheiro (Item 2.1 - F-26)
--
-- MOTIVO:
--   1. Eliminar a dependência de varredura (SELECT MAX) na tabela service_orders,
--      substituindo por tabela dedicada `company_counters` com UPDATE ... RETURNING
--      (lock exclusivo de linha por tenant e ano).
--   2. Garantir isolamento total por empresa: cada tenant possui sequência
--      independente (TC-YYYY-0001) sem saltos causados por outros tenants.
--   3. Suportar volumes > 9999 sem truncamento ou falha de ordenação textual.
--   4. Preparar suporte a prefixo customizável por empresa via `company_settings`.
--   5. Corrigir retroativamente quaisquer códigos legados contaminados com 'ERR'.
-- ============================================================

-- 1. TABELA DE CONFIGURAÇÕES DA EMPRESA (Prepara customização de prefixo da Fase 5)
CREATE TABLE IF NOT EXISTS public.company_settings (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    os_prefix TEXT NOT NULL DEFAULT 'TC',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_company_settings ON public.company_settings;
CREATE POLICY select_company_settings ON public.company_settings
    FOR SELECT USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS update_company_settings ON public.company_settings;
CREATE POLICY update_company_settings ON public.company_settings
    FOR UPDATE USING (
        company_id = public.get_my_company_id() 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Trigger para provisionar automaticamente settings ao criar uma nova empresa
CREATE OR REPLACE FUNCTION public.handle_new_company_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.company_settings (company_id, os_prefix)
  VALUES (NEW.id, 'TC')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_new_company_settings ON public.companies;
CREATE TRIGGER trigger_new_company_settings
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_settings();

-- Backfill para empresas já existentes
INSERT INTO public.company_settings (company_id, os_prefix)
SELECT id, 'TC' FROM public.companies
ON CONFLICT (company_id) DO NOTHING;


-- 2. TABELA DE CONTADORES ATÔMICOS POR TENANT E ANO
CREATE TABLE IF NOT EXISTS public.company_counters (
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    year INT NOT NULL,
    next_val INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (company_id, year)
);

ALTER TABLE public.company_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_company_counters ON public.company_counters;
CREATE POLICY select_company_counters ON public.company_counters
    FOR SELECT USING (company_id = public.get_my_company_id());


-- 3. CORREÇÃO RETROATIVA DE CÓDIGOS LEGADOS COM 'ERR' (F-26d)
DO $$
DECLARE
  r RECORD;
  v_max_val INT;
  v_new_code TEXT;
  v_year INT;
BEGIN
  FOR r IN 
    SELECT id, company_id, created_at 
    FROM public.service_orders 
    WHERE codigo_os LIKE '%ERR%'
    ORDER BY created_at ASC
  LOOP
    v_year := to_char(COALESCE(r.created_at, now()), 'YYYY')::int;
    
    SELECT COALESCE(MAX(substring(codigo_os from 9)::int), 0) + 1
      INTO v_max_val
    FROM public.service_orders
    WHERE company_id = r.company_id
      AND codigo_os ~ ('^TC-' || v_year || '-[0-9]+$');
      
    v_new_code := 'TC-' || v_year || '-' || lpad(v_max_val::text, 4, '0');
    
    UPDATE public.service_orders
    SET codigo_os = v_new_code
    WHERE id = r.id;
  END LOOP;
END $$;


-- 4. INICIALIZAÇÃO / BACKFILL DOS CONTADORES A PARTIR DAS OS EXISTENTES
INSERT INTO public.company_counters (company_id, year, next_val)
SELECT 
    company_id, 
    to_char(COALESCE(created_at, now()), 'YYYY')::int AS yr, 
    COALESCE(MAX(substring(codigo_os from 9)::int), 0) + 1 AS next_v
FROM public.service_orders
WHERE codigo_os ~ '^TC-[0-9]{4}-[0-9]+$'
GROUP BY company_id, yr
ON CONFLICT (company_id, year) 
DO UPDATE SET next_val = GREATEST(company_counters.next_val, EXCLUDED.next_val);


-- 5. NOVA FUNÇÃO TRANSAIONAL DE GERAÇÃO DE CÓDIGO (LOCK DE LINHA ATÔMICO)
CREATE OR REPLACE FUNCTION public.generate_codigo_os()
RETURNS trigger AS $$
DECLARE
  v_year INT;
  v_next_val INT;
  v_prefix TEXT;
BEGIN
  -- Código informado explicitamente (importação / migração) é respeitado
  IF NEW.codigo_os IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id é obrigatório para gerar o código da OS.';
  END IF;

  v_year := to_char(COALESCE(NEW.created_at, now()), 'YYYY')::int;

  -- Consulta o prefixo da empresa (default 'TC')
  SELECT COALESCE(os_prefix, 'TC') INTO v_prefix
  FROM public.company_settings
  WHERE company_id = NEW.company_id;

  IF v_prefix IS NULL THEN
    v_prefix := 'TC';
  END IF;

  -- Garante a linha do contador para este ano
  INSERT INTO public.company_counters (company_id, year, next_val)
  VALUES (NEW.company_id, v_year, 1)
  ON CONFLICT (company_id, year) DO NOTHING;

  -- Incremento atômico com lock de linha (UPDATE ... RETURNING)
  UPDATE public.company_counters
  SET next_val = next_val + 1,
      updated_at = now()
  WHERE company_id = NEW.company_id 
    AND year = v_year
  RETURNING next_val - 1 INTO v_next_val;

  -- Formatação com pelo menos 4 dígitos (0001 a 9999; valores >= 10000 não são truncados)
  NEW.codigo_os := v_prefix || '-' || v_year || '-' || 
                   CASE WHEN v_next_val < 10000 THEN lpad(v_next_val::text, 4, '0') 
                        ELSE v_next_val::text END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Reassocia o trigger na tabela service_orders
DROP TRIGGER IF EXISTS trigger_generate_codigo_os ON public.service_orders;
CREATE TRIGGER trigger_generate_codigo_os
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_codigo_os();


-- 6. GARANTIR A CONSTRAINT DE UNICIDADE (COMPANY_ID, CODIGO_OS)
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_codigo_os_key;
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_company_codigo_os_key;

ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_company_codigo_os_key UNIQUE (company_id, codigo_os);
