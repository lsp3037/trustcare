-- ============================================================
-- MIGRATION: 20260731130000_reconcile_schema_drift
-- MOTIVO: Auditoria de 2026-07-31 constatou que o banco de produção
--   (projeto dbxdqolktavqngrxknum) nunca recebeu várias migrações que
--   já estavam versionadas neste diretório. O histórico
--   supabase_migrations.schema_migrations estava VAZIO — as migrações
--   vinham sendo coladas manualmente no SQL Editor, de forma parcial.
--
--   Faltavam no banco:
--     - service_orders.client_signature{,_ip,_at,_name}      (add_signature_and_aprovado_status.sql)
--     - status 'Aprovado' no CHECK de service_orders          (idem)
--     - approve_budget_by_client()                            (idem)
--     - get_public_budget_details()                           (20260724_fix_public_budget_details.sql)
--     - os_verifications.attempts                             (20260724_rastreio_otp_lockout.sql)
--     - planos 'starter' / 'pro'                              (20260721_update_plans.sql)
--
-- IMPACTO: Sem isso, a aprovação pública de orçamento com assinatura
--   digital estava 100% quebrada (RPCs inexistentes), o OTP do rastreio
--   aceitava força bruta ilimitada, e o checkout violaria a FK
--   companies_subscription_plan_fkey ao gravar 'starter'.
--
-- NOTA: As policies public_select_* que constavam em
--   add_signature_and_aprovado_status.sql foram DELIBERADAMENTE omitidas —
--   elas vazavam dados entre tenants e já haviam sido revogadas por
--   remove_public_select_policies.sql. A leitura pública do orçamento é
--   feita exclusivamente via get_public_budget_details().
-- ============================================================

-- 1. Colunas de assinatura digital do cliente
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature_ip TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature_at TIMESTAMPTZ;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature_name TEXT;

-- 2. Status 'Aprovado' no CHECK constraint
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

-- 3. RPC de aprovação de orçamento pelo cliente anônimo
CREATE OR REPLACE FUNCTION public.approve_budget_by_client(
    order_id UUID,
    client_name TEXT,
    signature_base64 TEXT,
    client_ip TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. RPC de leitura pública do orçamento (lista explícita de campos, sem SELECT *)
DROP FUNCTION IF EXISTS public.get_public_budget_details(UUID);

CREATE OR REPLACE FUNCTION public.get_public_budget_details(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order public.service_orders%ROWTYPE;
    v_result JSONB;
BEGIN
    SELECT * INTO v_order FROM public.service_orders WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'order', jsonb_build_object(
            'id', v_order.id,
            'status', v_order.status,
            'codigo_os', v_order.codigo_os,
            'equipment_details', v_order.equipment_details,
            'technical_report', v_order.technical_report,
            'service_value', v_order.service_value,
            'discount', v_order.discount,
            'total_value', v_order.total_value,
            'client_signature', v_order.client_signature,
            'client_signature_ip', v_order.client_signature_ip,
            'client_signature_at', v_order.client_signature_at,
            'client_signature_name', v_order.client_signature_name
        ),
        'company', (
            SELECT jsonb_build_object(
                'name', c.name,
                'logo_url', c.logo_url,
                'subdomain', c.subdomain
            )
            FROM public.companies c WHERE c.id = v_order.company_id
        ),
        'client', (
            SELECT jsonb_build_object('name', cl.name)
            FROM public.clients cl WHERE cl.id = v_order.client_id
        ),
        'items', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', soi.id,
                'quantity', soi.quantity,
                'unit_price', soi.unit_price,
                'product_name', pi.name
            )), '[]'::jsonb)
            FROM public.service_order_items soi
            LEFT JOIN public.products_inventory pi ON pi.id = soi.product_id
            WHERE soi.service_order_id = p_order_id
        ),
        'services', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', os.id,
                'quantidade', os.quantidade,
                'subtotal', os.subtotal,
                'service_name', s.nome
            )), '[]'::jsonb)
            FROM public.order_services os
            LEFT JOIN public.services s ON s.id = os.service_id
            WHERE os.os_id = p_order_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Lockout de força bruta no OTP do rastreio
ALTER TABLE public.os_verifications ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

-- 6. Planos SaaS: basico/profissional -> starter/pro
INSERT INTO public.plans (id, name, max_technicians, max_storage_bytes)
VALUES
('starter', 'Starter', 1, 1073741824),   -- 1 GB
('pro', 'Pro', 3, 5368709120)            -- 5 GB
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    max_technicians = EXCLUDED.max_technicians,
    max_storage_bytes = EXCLUDED.max_storage_bytes;

UPDATE public.plans SET
    name = 'Premium',
    max_technicians = 99999,
    max_storage_bytes = 53687091200      -- 50 GB
WHERE id = 'premium';

ALTER TABLE public.companies ALTER COLUMN subscription_plan DROP DEFAULT;

UPDATE public.companies SET subscription_plan = 'starter' WHERE subscription_plan = 'basico';
UPDATE public.companies SET subscription_plan = 'pro' WHERE subscription_plan = 'profissional';

DELETE FROM public.plans WHERE id IN ('basico', 'profissional');

ALTER TABLE public.companies ALTER COLUMN subscription_plan SET DEFAULT 'starter';
