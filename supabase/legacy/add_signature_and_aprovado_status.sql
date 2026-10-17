-- 1. ADICIONAR COLUNAS DE ASSINATURA NA TABELA service_orders
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature_ip TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature_at TIMESTAMPTZ;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature_name TEXT;

-- 2. ATUALIZAR STATUS CONSTRAINT PARA INCLUIR 'Aprovado'
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_status_check 
    CHECK (status IN (
        'Aguardando Equipamento', 
        'Em Análise', 
        'Aguardando Aprovação', 
        'Aprovado',
        'Aguardando Peças', 
        'Em Execução', 
        'Em Testes', 
        'Pronto para Retirada', 
        'Finalizado', 
        'Cancelado'
    ));

-- 3. REMOVER POLÍTICAS ANTIGAS SE EXISTIREM PARA EVITAR DUPLICATAS
DROP POLICY IF EXISTS public_select_service_orders ON public.service_orders;
DROP POLICY IF EXISTS public_select_companies ON public.companies;
DROP POLICY IF EXISTS public_select_clients ON public.clients;
DROP POLICY IF EXISTS public_select_service_order_items ON public.service_order_items;
DROP POLICY IF EXISTS public_select_products ON public.products_inventory;
DROP POLICY IF EXISTS public_select_order_services ON public.order_services;
DROP POLICY IF EXISTS public_select_services ON public.services;

-- 4. CRIAR POLÍTICAS DE LEITURA PÚBLICA (RLS) RESTRITAS POR RELACIONAMENTO
CREATE POLICY public_select_service_orders ON public.service_orders
    FOR SELECT USING (true);

CREATE POLICY public_select_companies ON public.companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            WHERE service_orders.company_id = companies.id
        )
    );

CREATE POLICY public_select_clients ON public.clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            WHERE service_orders.client_id = clients.id
        )
    );

CREATE POLICY public_select_service_order_items ON public.service_order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            WHERE service_orders.id = service_order_items.service_order_id
        )
    );

CREATE POLICY public_select_products ON public.products_inventory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.service_order_items
            WHERE service_order_items.product_id = products_inventory.id
        )
    );

CREATE POLICY public_select_order_services ON public.order_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            WHERE service_orders.id = order_services.os_id
        )
    );

CREATE POLICY public_select_services ON public.services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.order_services
            WHERE order_services.service_id = services.id
        )
    );

-- 5. CRIAR FUNÇÃO SEGURA (SECURITY DEFINER) PARA APROVAÇÃO DO CLIENTE ANÔNIMO
CREATE OR REPLACE FUNCTION public.approve_budget_by_client(
    order_id UUID,
    client_name TEXT,
    signature_base64 TEXT,
    client_ip TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se a ordem existe e está aguardando aprovação
    IF EXISTS (
        SELECT 1 FROM public.service_orders 
        WHERE id = order_id AND status = 'Aguardando Aprovação'
    ) THEN
        UPDATE public.service_orders
        SET 
            status = 'Aprovado',
            client_signature = signature_base64,
            client_signature_ip = client_ip,
            client_signature_at = now(),
            client_signature_name = client_name
        WHERE id = order_id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
