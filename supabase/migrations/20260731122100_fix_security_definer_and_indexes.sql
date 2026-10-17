-- ============================================================
-- MIGRATION: 20260731122100_fix_security_definer_and_indexes
-- AUTOR: Database Architect
-- MOTIVO: 
-- 1. Corrige vulnerabilidade de Search Path Hijacking nas funções SECURITY DEFINER.
-- 2. Adiciona o modificador STABLE para evitar o efeito N+1 nas políticas RLS.
-- 3. Cria índices para Foreign Keys vulneráveis a Table Locks.
-- ============================================================

-- ==========================================
-- 1. CORREÇÃO DE FUNÇÕES SECURITY DEFINER
-- ==========================================

-- Função auxiliar segura para obter o ID da empresa do usuário logado
-- ADICIONADO: STABLE e SET search_path = public
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Função auxiliar: Checar se a empresa está em modo apenas-leitura (atraso de assinatura)
-- ADICIONADO: STABLE e SET search_path = public
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Função auxiliar: Calcular tamanho total do armazenamento da empresa no bucket 'os-media'
-- ADICIONADO: SET search_path = public
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage;

-- Função auxiliar: Validar cota e permissão de upload para o bucket 'os-media'
-- ADICIONADO: SET search_path = public
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função auxiliar: Busca pública de O.S (LGPD)
-- ADICIONADO: SET search_path = public
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função disparada ao criar novo usuário no Supabase Auth
-- ADICIONADO: SET search_path = public
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função: delete_service_orders_batch
-- ADICIONADO: SET search_path = public
CREATE OR REPLACE FUNCTION public.delete_service_orders_batch(order_ids uuid[])
RETURNS void AS $$
DECLARE
  item RECORD;
  v_company_id uuid;
BEGIN
  -- Validate tenant context
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não vinculado a uma empresa.';
  END IF;

  -- Verify all provided IDs belong to the current company
  IF EXISTS (
    SELECT 1 FROM public.service_orders 
    WHERE id = ANY(order_ids) 
    AND company_id != v_company_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Tentativa de excluir O.S. que não pertence à sua empresa.';
  END IF;

  -- Restore inventory for all items in the deleted orders
  FOR item IN 
    SELECT product_id, SUM(quantity) as total_qty 
    FROM public.service_order_items 
    WHERE service_order_id = ANY(order_ids)
    AND company_id = v_company_id
    GROUP BY product_id
  LOOP
    UPDATE public.products_inventory 
    SET quantity = quantity + item.total_qty 
    WHERE id = item.product_id
    AND company_id = v_company_id;
  END LOOP;

  -- Delete items (foreign keys cascade, but being explicit is safe)
  DELETE FROM public.service_order_items 
  WHERE service_order_id = ANY(order_ids)
  AND company_id = v_company_id;
  
  -- Delete orders
  DELETE FROM public.service_orders 
  WHERE id = ANY(order_ids)
  AND company_id = v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Demais funções SECURITY DEFINER: fixa o search_path sem reescrever o corpo.
-- (check_and_clean_rate_limit, handle_inventory_change e handle_os_cancel_restock
--  também eram vulneráveis a search path hijacking e não constavam nesta migração.)
ALTER FUNCTION public.check_and_clean_rate_limit(text, text) SET search_path = public;
ALTER FUNCTION public.handle_inventory_change() SET search_path = public;
ALTER FUNCTION public.handle_os_cancel_restock() SET search_path = public;


-- ==========================================
-- 2. CRIAÇÃO DE ÍNDICES NAS FKS
-- ==========================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);

-- Client Equipments
CREATE INDEX IF NOT EXISTS idx_client_equipments_company_id ON public.client_equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_client_equipments_client_id ON public.client_equipments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_equipments_category_id ON public.client_equipments(category_id);

-- Checklist Templates
CREATE INDEX IF NOT EXISTS idx_checklist_templates_company_id ON public.checklist_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_category_id ON public.checklist_templates(category_id);

-- Products Inventory
CREATE INDEX IF NOT EXISTS idx_products_inventory_company_id ON public.products_inventory(company_id);

-- Service Orders (Adicional aos existentes)
CREATE INDEX IF NOT EXISTS idx_service_orders_company_id ON public.service_orders(company_id);

-- Services
CREATE INDEX IF NOT EXISTS idx_services_company_id ON public.services(company_id);

-- Order Services
CREATE INDEX IF NOT EXISTS idx_order_services_company_id ON public.order_services(company_id);
CREATE INDEX IF NOT EXISTS idx_order_services_os_id ON public.order_services(os_id);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);

-- Invites
CREATE INDEX IF NOT EXISTS idx_invites_company_id ON public.invites(company_id);

-- FIM DA MIGRAÇÃO
