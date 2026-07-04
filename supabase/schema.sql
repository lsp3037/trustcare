-- ==========================================
-- ESTRUTURA DO BANCO DE DADOS - OS-MANAGER (SAAS MULTI-TENANT)
-- ==========================================

-- Extensão para geração de UUIDs (geralmente ativa por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Empresas (Tenants)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    whatsapp TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Tabela de Perfis de Usuários (Profiles)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'viewer')),
    full_name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tabela de Clientes
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_number SERIAL,
    type TEXT NOT NULL CHECK (type IN ('PF', 'PJ')),
    name TEXT NOT NULL,
    document TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Clientes
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de Categorias de Equipamentos
CREATE TABLE public.equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Categorias de Equipamentos
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

-- 7. Tabela de Equipamentos dos Clientes
CREATE TABLE public.client_equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.equipment_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Equipamentos dos Clientes
ALTER TABLE public.client_equipments ENABLE ROW LEVEL SECURITY;

-- 8. Tabela de Templates de Checklist
CREATE TABLE public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.equipment_categories(id) ON DELETE CASCADE,
    schema JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_category_template_per_company UNIQUE (company_id, category_id)
);

-- Habilitar RLS para Templates de Checklist
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- 4. Tabela de Estoque de Produtos
CREATE TABLE public.products_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    capacity TEXT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (cost_price >= 0),
    sale_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (sale_price >= 0),
    min_stock_alert INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Estoque
ALTER TABLE public.products_inventory ENABLE ROW LEVEL SECURITY;

-- 5. Tabela de Ordens de Serviço (OS)
CREATE TABLE public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    equipment_id UUID REFERENCES public.client_equipments(id) ON DELETE SET NULL,
    equipment_details TEXT,
    reported_problem TEXT NOT NULL,
    technical_report TEXT,
    status TEXT NOT NULL DEFAULT 'Em Análise' CHECK (status IN ('Aguardando Equipamento', 'Em Análise', 'Aguardando Aprovação', 'Aguardando Peças', 'Em Execução', 'Em Testes', 'Pronto para Retirada', 'Finalizado', 'Cancelado')),
    priority TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Baixa', 'Média', 'Alta')),
    technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    delivery_prediction TIMESTAMPTZ,
    service_value NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (service_value >= 0),
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total_value NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_value >= 0),
    codigo_os VARCHAR UNIQUE,
    pago BOOLEAN DEFAULT FALSE,
    media JSONB DEFAULT '[]'::jsonb,
    entry_checklist JSONB,
    exit_checklist JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Ordens de Serviço
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de Itens da Ordem de Serviço
CREATE TABLE public.service_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products_inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0)
);

-- Habilitar RLS para Itens de OS
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- FUNÇÕES AUXILIARES E RLS POLICIES
-- ==========================================

-- Função auxiliar segura para obter o ID da empresa do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- Políticas para public.companies
CREATE POLICY select_company ON public.companies
    FOR SELECT USING (id = public.get_my_company_id());

CREATE POLICY update_company ON public.companies
    FOR UPDATE USING (id = public.get_my_company_id() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    ));

-- Políticas para public.profiles
CREATE POLICY select_profiles ON public.profiles
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY update_profiles ON public.profiles
    FOR UPDATE USING (company_id = public.get_my_company_id() AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
    ));

-- Políticas para public.clients
CREATE POLICY manage_clients ON public.clients
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

-- Políticas para public.products_inventory
CREATE POLICY manage_products ON public.products_inventory
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

-- Políticas para public.service_orders
CREATE POLICY manage_service_orders ON public.service_orders
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

-- Políticas para public.service_order_items
CREATE POLICY manage_service_order_items ON public.service_order_items
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

-- Políticas para public.client_equipments
CREATE POLICY manage_client_equipments ON public.client_equipments
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

-- Políticas para public.equipment_categories
CREATE POLICY manage_equipment_categories ON public.equipment_categories
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());

-- Políticas para public.checklist_templates
CREATE POLICY manage_checklist_templates ON public.checklist_templates
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());


-- ==========================================
-- TRIGGER DE AUTOCADASTRO DE TENANT/EMPRESA
-- ==========================================

-- Função disparada ao criar novo usuário no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  target_company_id UUID;
  company_name_val TEXT;
  user_role TEXT;
BEGIN
  -- Se o company_id for fornecido explicitamente no metadata (ex: convite), usamos ele
  IF (new.raw_user_meta_data->>'company_id') IS NOT NULL THEN
    target_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'technician');
  ELSE
    -- Caso contrário, cria uma nova empresa (Novo Tenant)
    company_name_val := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
    INSERT INTO public.companies (name)
    VALUES (company_name_val)
    RETURNING id INTO target_company_id;
    user_role := 'admin';
  END IF;

  -- Cria o perfil do usuário vinculado à empresa com nome, e-mail e telefone
  INSERT INTO public.profiles (user_id, company_id, role, full_name, email, phone)
  VALUES (
    new.id, 
    target_company_id, 
    user_role, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Membro da Equipe'),
    new.email,
    new.raw_user_meta_data->>'phone'
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger associado à inserção em auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- FUNÇÃO PÚBLICA PARA RASTREAMENTO DE OS (LGPD COMPLIANT)
-- ==========================================

DROP FUNCTION IF EXISTS public.get_public_service_order(TEXT);

CREATE OR REPLACE FUNCTION public.get_public_service_order(search_query TEXT)
RETURNS TABLE (
    id UUID,
    status TEXT,
    equipment_name TEXT,
    equipment_brand TEXT,
    equipment_model TEXT,
    reported_problem TEXT,
    technical_report TEXT,
    created_at TIMESTAMPTZ,
    delivery_prediction TIMESTAMPTZ,
    codigo_os VARCHAR,
    media JSONB
) AS $$
DECLARE
    clean_query TEXT;
BEGIN
    -- Remove o caractere '#' se estiver no início
    clean_query := ltrim(search_query, '#');
    
    -- Se a query for vazia, retorna vazio
    IF clean_query = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        so.id,
        so.status,
        eq.name AS equipment_name,
        eq.brand AS equipment_brand,
        eq.model AS equipment_model,
        so.reported_problem,
        so.technical_report,
        so.created_at,
        so.delivery_prediction,
        so.codigo_os,
        so.media
    FROM public.service_orders so
    LEFT JOIN public.client_equipments eq ON so.equipment_id = eq.id
    WHERE 
        -- Busca por codigo_os parcial ou exato (case insensitive)
        lower(so.codigo_os) LIKE (lower(clean_query) || '%')
        OR
        -- Busca por UUID exato (caso seja o UUID completo)
        (CASE 
            WHEN length(clean_query) = 36 THEN so.id = clean_query::uuid
            ELSE false
         END)
        OR
        -- Busca pelos primeiros caracteres do UUID (caso seja o código curto de 8 caracteres)
        (CASE 
            WHEN length(clean_query) >= 8 AND length(clean_query) < 36 THEN so.id::text LIKE (lower(clean_query) || '%')
            ELSE false
         END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- TRIGGER DE GERAÇÃO DE CÓDIGO HÍBRIDO (TC-YYYY-XXXX)
-- ==========================================

CREATE OR REPLACE FUNCTION public.generate_codigo_os()
RETURNS trigger AS $$
DECLARE
  yyyy TEXT;
  next_val INT;
  last_code TEXT;
BEGIN
  -- Se codigo_os já foi informado (ex: vindo de outro fluxo), não faz nada
  IF new.codigo_os IS NOT NULL THEN
    RETURN new;
  END IF;

  -- YYYY atual com base no created_at (ou data atual caso seja nulo)
  yyyy := to_char(COALESCE(new.created_at, now()), 'YYYY');

  -- Busca o último sequencial para esse mesmo ano
  SELECT codigo_os 
  FROM public.service_orders
  WHERE codigo_os LIKE 'TC-' || yyyy || '-%'
  ORDER BY codigo_os DESC
  LIMIT 1
  INTO last_code;

  IF last_code IS NULL THEN
    next_val := 1;
  ELSE
    -- Pega a substring correspondente ao sequencial XXXX (TC-YYYY-XXXX)
    next_val := (substring(last_code from 9 for 4)::integer) + 1;
  END IF;

  -- Formata a nova OS com o padrão TC-YYYY-XXXX
  new.codigo_os := 'TC-' || yyyy || '-' || lpad(next_val::text, 4, '0');

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback seguro para não travar a inserção
    new.codigo_os := 'TC-' || yyyy || '-ERR-' || substring(gen_random_uuid()::text from 1 for 4);
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_generate_codigo_os
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_codigo_os();


-- ==========================================
-- BUCKET DE STORAGE E POLÍTICAS PARA MÍDIAS DA OS
-- ==========================================

-- Criação do Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('os-media', 'os-media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS para objetos do Bucket
CREATE POLICY "Permitir leitura publica de midias os-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'os-media');

CREATE POLICY "Permitir insercao de midias os-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'os-media' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir exclusao de midias os-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'os-media' AND auth.role() = 'authenticated');


-- ==========================================
-- BUCKET DE STORAGE E POLÍTICAS PARA LOGOTIPOS
-- ==========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permitir leitura publica de logotipos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Permitir insercao de logotipos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir exclusao de logotipos" ON storage.objects
  FOR DELETE USING (bucket_id = 'company-logos' AND auth.role() = 'authenticated');



-- ====================================================
-- CATÁLOGO DE SERVIÇOS & ITENS DE SERVIÇO DA O.S.
-- ====================================================

-- Tabela de Serviços Catalogados
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_padrao NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (preco_padrao >= 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Serviços
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Criar política RLS
CREATE POLICY manage_services ON public.services
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());


-- Tabela de Relacionamento Ordem de Serviço -> Serviços
CREATE TABLE IF NOT EXISTS public.order_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    os_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (preco_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Serviços da OS
ALTER TABLE public.order_services ENABLE ROW LEVEL SECURITY;

-- Criar política RLS
CREATE POLICY manage_order_services ON public.order_services
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());







