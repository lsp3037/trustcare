-- ====================================================
-- MIGRATION: TRANSIÇÃO PARA MODELO SAAS (TRUST CARE)
-- DATA: 2026-07-18
-- ====================================================

-- 1. Criação da tabela de planos
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_technicians INTEGER NOT NULL,
    max_storage_bytes BIGINT NOT NULL
);

-- Popula os planos com as novas cotas oficiais
INSERT INTO public.plans (id, name, max_technicians, max_storage_bytes) VALUES
('basico', 'Básico', 2, 1073741824), -- 1 GB
('profissional', 'Profissional', 6, 5368709120), -- 5 GB
('premium', 'Premium', 20, 21474836480) -- 20 GB
ON CONFLICT (id) DO NOTHING;

-- 2. Atualização da tabela public.companies com colunas SaaS
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'basico' REFERENCES public.plans(id),
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- 3. Função auxiliar: Checar se a empresa está em modo apenas-leitura
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

-- 4. Função auxiliar: Calcular tamanho total do armazenamento da empresa no bucket 'os-media'
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

-- 5. Função auxiliar: Validar cota e permissão de upload para o bucket 'os-media'
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

-- 6. Trigger: Validar cota de técnicos ativos antes de adicionar perfil
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

-- 7. Atualização das Políticas RLS do Bucket de Mídia ('os-media')
DROP POLICY IF EXISTS "Permitir insercao de midias os-media" ON storage.objects;
CREATE POLICY "Permitir insercao de midias os-media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'os-media' 
    AND auth.role() = 'authenticated'
    AND public.can_upload_to_os_media(name, metadata)
  );

DROP POLICY IF EXISTS "Permitir exclusao de midias os-media" ON storage.objects;
CREATE POLICY "Permitir exclusao de midias os-media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'os-media' 
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = (public.get_my_company_id())::text
  );

-- 8. Atualização das Políticas RLS para as Tabelas Operacionais (Bloqueio se Inadimplente)

-- CLIENTES
DROP POLICY IF EXISTS manage_clients ON public.clients;
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

-- ESTOQUE (PRODUCTS_INVENTORY)
DROP POLICY IF EXISTS manage_products ON public.products_inventory;
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

-- ORDENS DE SERVIÇO
DROP POLICY IF EXISTS manage_service_orders ON public.service_orders;
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

-- ITENS DE OS
DROP POLICY IF EXISTS manage_service_order_items ON public.service_order_items;
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

-- EQUIPAMENTOS
DROP POLICY IF EXISTS manage_client_equipments ON public.client_equipments;
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

-- CATEGORIAS DE EQUIPAMENTO
DROP POLICY IF EXISTS manage_equipment_categories ON public.equipment_categories;
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

-- TEMPLATES DE CHECKLIST
DROP POLICY IF EXISTS manage_checklist_templates ON public.checklist_templates;
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

-- SERVIÇOS
DROP POLICY IF EXISTS manage_services ON public.services;
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

-- SERVIÇOS DA OS
DROP POLICY IF EXISTS manage_order_services ON public.order_services;
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

-- CRM LEADS
DROP POLICY IF EXISTS manage_leads ON public.leads;
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

-- CONVITES (INVITES)
DROP POLICY IF EXISTS select_invites ON public.invites;
DROP POLICY IF EXISTS insert_invites ON public.invites;
DROP POLICY IF EXISTS delete_invites ON public.invites;

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

-- 9. Redefinição da função de busca pública (suporte opcional a subdomínio)
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
    clean_query := ltrim(search_query, '#');
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
        (tenant_subdomain IS NULL OR tenant_subdomain = '' OR c.subdomain = tenant_subdomain)
        AND (
            lower(so.codigo_os) LIKE (lower(clean_query) || '%')
            OR
            (CASE WHEN length(clean_query) = 36 THEN so.id = clean_query::uuid ELSE false END)
            OR
            (CASE WHEN length(clean_query) >= 8 AND length(clean_query) < 36 THEN so.id::text LIKE (lower(clean_query) || '%') ELSE false END)
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
