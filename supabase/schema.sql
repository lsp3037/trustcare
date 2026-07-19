-- ==========================================
-- ESTRUTURA DO BANCO DE DADOS - OS-MANAGER (SAAS MULTI-TENANT)
-- ==========================================

-- Extensão para geração de UUIDs (geralmente ativa por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Tabela de Planos
CREATE TABLE public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_technicians INTEGER NOT NULL,
    max_storage_bytes BIGINT NOT NULL
);

-- Popula os planos padrões com as novas cotas oficiais
INSERT INTO public.plans (id, name, max_technicians, max_storage_bytes) VALUES
('basico', 'Básico', 2, 1073741824), -- 1 GB
('profissional', 'Profissional', 6, 5368709120), -- 5 GB
('premium', 'Premium', 20, 21474836480) -- 20 GB
ON CONFLICT (id) DO NOTHING;

-- 1. Tabela de Empresas (Tenants)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    whatsapp TEXT,
    subscription_plan TEXT NOT NULL DEFAULT 'basico' REFERENCES public.plans(id),
    subscription_status TEXT NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
    subscription_expires_at TIMESTAMPTZ,
    asaas_customer_id TEXT UNIQUE,
    asaas_subscription_id TEXT UNIQUE,
    subdomain TEXT UNIQUE,
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

-- Função auxiliar: Checar se a empresa está em modo apenas-leitura (atraso de assinatura)
CREATE OR REPLACE FUNCTION public.is_company_read_only(comp_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT subscription_status, subscription_expires_at INTO v_status, v_expires_at
  FROM public.companies WHERE id = comp_id;
  
  -- Bloqueio após 5 dias de atraso (past_due) ou se cancelado (canceled)
  IF v_status = 'canceled' THEN
    RETURN TRUE;
  ELSIF v_status = 'past_due' AND (v_expires_at IS NULL OR NOW() > (v_expires_at + INTERVAL '5 days')) THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: Calcular tamanho total do armazenamento da empresa no bucket 'os-media'
CREATE OR REPLACE FUNCTION public.get_company_storage_bytes(comp_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_total_bytes BIGINT;
BEGIN
  SELECT COALESCE(SUM(size), 0) INTO v_total_bytes
  FROM storage.objects
  WHERE bucket_id = 'os-media'
    AND path_tokens[1] = comp_id::text;
  RETURN v_total_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: Validar cota e permissão de upload para o bucket 'os-media'
CREATE OR REPLACE FUNCTION public.can_upload_to_os_media(name TEXT, metadata JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  v_company_id UUID;
  v_file_size BIGINT;
  v_max_bytes BIGINT;
  v_current_bytes BIGINT;
BEGIN
  -- Obtém o id da empresa do usuário autenticado
  v_company_id := public.get_my_company_id();
  
  -- Se não estiver logado, bloqueia
  IF v_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Força que o primeiro nível do caminho do arquivo seja o UUID da empresa
  IF split_part(name, '/', 1) <> v_company_id::text THEN
    RETURN FALSE;
  END IF;

  -- Se a empresa estiver inadimplente há mais de 5 dias, bloqueia upload
  IF public.is_company_read_only(v_company_id) THEN
    RETURN FALSE;
  END IF;

  -- Obtém a cota de armazenamento do plano contratado
  SELECT p.max_storage_bytes INTO v_max_bytes
  FROM public.companies c
  JOIN public.plans p ON c.subscription_plan = p.id
  WHERE c.id = v_company_id;

  -- Calcula o armazenamento atual
  v_current_bytes := public.get_company_storage_bytes(v_company_id);
  
  -- Tamanho do arquivo sendo enviado
  v_file_size := COALESCE((metadata->>'size')::bigint, 0);

  -- Verifica se ultrapassa o limite do plano contratado
  IF (v_current_bytes + v_file_size) > v_max_bytes THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: Validar cota de técnicos ativos antes de adicionar perfil
CREATE OR REPLACE FUNCTION public.check_technician_quota()
RETURNS trigger AS $$
DECLARE
  v_plan_id TEXT;
  v_max_tech INT;
  v_current_tech INT;
BEGIN
  -- Apenas filtra perfis produtivos (tecnicos e admins)
  IF NEW.role IN ('admin', 'technician') THEN
    SELECT c.subscription_plan, p.max_technicians INTO v_plan_id, v_max_tech
    FROM public.companies c
    JOIN public.plans p ON c.subscription_plan = p.id
    WHERE c.id = NEW.company_id;

    -- Conta perfis ativos com papel operacional/admin
    SELECT COUNT(*) INTO v_current_tech
    FROM public.profiles
    WHERE company_id = NEW.company_id AND role IN ('admin', 'technician');

    IF v_current_tech >= v_max_tech THEN
      RAISE EXCEPTION 'Limite de técnicos ativos atingido para o plano % (% técnicos permitidos).', v_plan_id, v_max_tech;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_check_technician_quota ON public.profiles;

-- Associa o trigger à inserção
CREATE TRIGGER trigger_check_technician_quota
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_technician_quota();


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

-- Políticas para public.clients (Leitura geral e escrita apenas se adimplente)
CREATE POLICY select_clients ON public.clients
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_clients ON public.clients
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );

-- Políticas para public.products_inventory (Leitura geral e escrita apenas se adimplente)
CREATE POLICY select_products ON public.products_inventory
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_products ON public.products_inventory
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );

-- Políticas para public.service_orders (Leitura geral e escrita apenas se adimplente)
CREATE POLICY select_service_orders ON public.service_orders
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_service_orders ON public.service_orders
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );

-- Políticas para public.service_order_items (Leitura geral e escrita apenas se adimplente)
CREATE POLICY select_service_order_items ON public.service_order_items
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_service_order_items ON public.service_order_items
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );

-- Políticas para public.client_equipments (Leitura geral e escrita apenas se adimplente)
CREATE POLICY select_client_equipments ON public.client_equipments
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_client_equipments ON public.client_equipments
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );

-- Políticas para public.equipment_categories (Leitura geral e escrita apenas se adimplente)
CREATE POLICY select_equipment_categories ON public.equipment_categories
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_equipment_categories ON public.equipment_categories
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );

-- Políticas para public.checklist_templates (Leitura geral e escrita apenas se adimplente)
CREATE POLICY select_checklist_templates ON public.checklist_templates
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_checklist_templates ON public.checklist_templates
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );


-- ==========================================
-- TRIGGER DE AUTOCADASTRO DE TENANT/EMPRESA
-- ==========================================

-- ==========================================
-- TABELA DE CONVITES (INVITES) E POLÍTICAS RLS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'viewer')),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_invites ON public.invites
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY insert_invites ON public.invites
    FOR INSERT WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY delete_invites ON public.invites
    FOR DELETE USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
        )
    );

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
  invite_record RECORD;
BEGIN
  -- Se invite_token for fornecido no metadata (via link de convite)
  IF (new.raw_user_meta_data->>'invite_token') IS NOT NULL THEN
    -- Busca convite válido
    SELECT * INTO invite_record 
    FROM public.invites 
    WHERE token = new.raw_user_meta_data->>'invite_token' 
      AND email = new.email 
      AND used = FALSE 
      AND expires_at > now();
      
    IF FOUND THEN
      target_company_id := invite_record.company_id;
      user_role := invite_record.role;
      
      -- Marca como usado
      UPDATE public.invites SET used = TRUE WHERE id = invite_record.id;
    ELSE
      -- Convite inválido ou expirado, cai no fluxo padrão criando nova empresa
      company_name_val := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Empresa');
      INSERT INTO public.companies (name)
      VALUES (company_name_val)
      RETURNING id INTO target_company_id;
      user_role := 'admin';
    END IF;
  ELSE
    -- Se o company_id for fornecido explicitamente no metadata (ex: legado), usamos ele
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
DROP FUNCTION IF EXISTS public.get_public_service_order(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_public_service_order(search_query TEXT, tenant_subdomain TEXT DEFAULT NULL)
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
    LEFT JOIN public.companies c ON so.company_id = c.id
    WHERE 
        -- Filtra por subdomínio se fornecido
        (tenant_subdomain IS NULL OR tenant_subdomain = '' OR c.subdomain = tenant_subdomain)
        AND (
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
             END)
        );
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

-- Políticas de RLS para objetos do Bucket (Cotas e isolamento de tenant)
CREATE POLICY "Permitir leitura publica de midias os-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'os-media');

CREATE POLICY "Permitir insercao de midias os-media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'os-media' 
    AND auth.role() = 'authenticated'
    AND public.can_upload_to_os_media(name, metadata)
  );

CREATE POLICY "Permitir exclusao de midias os-media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'os-media' 
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = (public.get_my_company_id())::text
  );


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
CREATE POLICY select_services ON public.services
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_services ON public.services
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );


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
CREATE POLICY select_order_services ON public.order_services
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_order_services ON public.order_services
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );




-- ====================================================
-- TABELA DE LEADS (CRM)
-- ====================================================

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Novo Contato' CHECK (status IN ('Novo Contato', 'Em Negociação', 'Aguardando Equipamento', 'Ganho/Convertido', 'Perdido')),
    equipment_info TEXT,
    problem_description TEXT,
    valor_estimado NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (valor_estimado >= 0),
    motivo_perda TEXT,
    origem TEXT DEFAULT 'WhatsApp',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Criar política RLS
CREATE POLICY select_leads ON public.leads
    FOR SELECT USING (company_id = public.get_my_company_id());

CREATE POLICY write_leads ON public.leads
    FOR ALL USING (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    )
    WITH CHECK (
        company_id = public.get_my_company_id() 
        AND NOT public.is_company_read_only(company_id)
    );

