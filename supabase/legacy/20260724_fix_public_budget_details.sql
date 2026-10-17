-- ============================================================
-- MIGRATION: fix_public_budget_details
-- MOTIVO: A migration remove_public_select_policies.sql removeu as
--   policies public_select_* (que vazavam dados entre tenants) partindo
--   do pressuposto de que a pagina de aprovacao de orcamento (/orcamento/[id])
--   ja lia os dados via RPC segura. Isso nao era verdade: OrcamentoClient.tsx
--   ainda fazia SELECT direto nas tabelas com a chave anon, o que a RLS
--   agora bloqueia (get_my_company_id() retorna NULL para anonimo) e deixou
--   a pagina de aprovacao de orcamento e assinatura digital inutilizavel
--   para clientes finais.
-- IMPACTO: Cria uma RPC SECURITY DEFINER com uma lista explicita de campos
--   (sem SELECT *) para uso exclusivo da pagina publica de orcamento.
-- ============================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
