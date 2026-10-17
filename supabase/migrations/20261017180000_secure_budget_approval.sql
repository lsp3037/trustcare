-- ============================================================
-- MIGRATION: 20261017180000_secure_budget_approval.sql
--
-- FASE 3 - Item 3.2: Aprovação de orçamento segura (F-19)
--
-- 1. Adiciona colunas para snapshot auditável e metadados no service_orders:
--    - approved_total (valor aprovado pelo cliente)
--    - budget_approval_hash (SHA-256 do snapshot canônico)
--    - budget_snapshot (JSON com peças, serviços, totais e termos)
--    - client_signature_user_agent (User-Agent capturado no servidor)
--    - terms_version (versão dos termos acordados)
--
-- 2. Atualiza RPC approve_budget_by_client com validação de formato e tamanho
--    de assinatura (<= 200 KB, data:image/png;base64), captura de User-Agent,
--    geração de hash criptográfico e registro no histórico de auditoria.
-- ============================================================

-- 1. Adicionar colunas de auditoria na tabela service_orders
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS approved_total NUMERIC(10,2);
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS budget_approval_hash VARCHAR(64);
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS budget_snapshot JSONB;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_signature_user_agent TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT 'v1';

-- 2. Recriar RPC approve_budget_by_client com auditoria completa
DROP FUNCTION IF EXISTS public.approve_budget_by_client(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.approve_budget_by_client(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.approve_budget_by_client(
  p_order_id UUID,
  p_client_name TEXT,
  p_signature_base64 TEXT,
  p_client_ip TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_terms_version TEXT DEFAULT 'v1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_services JSONB;
  v_snapshot JSONB;
  v_hash VARCHAR(64);
  v_clean_name TEXT;
  v_clean_ip TEXT;
BEGIN
  v_clean_name := trim(COALESCE(p_client_name, ''));
  v_clean_ip := trim(COALESCE(p_client_ip, '0.0.0.0'));

  IF length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome do signatário inválido ou incompleto.');
  END IF;

  -- 1. Validar que a OS existe e está aguardando aprovação (com lock de linha)
  SELECT 
    id, company_id, status, total_value, service_value, discount, 
    reported_problem, technical_report, codigo_os
  INTO v_order
  FROM public.service_orders
  WHERE id = p_order_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ordem de Serviço não encontrada.');
  END IF;

  IF v_order.status != 'Aguardando Aprovação' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este orçamento não está pendente de aprovação (status atual: ' || v_order.status || ').');
  END IF;

  -- 2. Validar assinatura: prefixo data:image/png;base64 e tamanho <= 200 KB
  -- 200 KB = 204.800 bytes -> ~273.066 chars base64. Toleramos até 280.000 chars.
  IF p_signature_base64 IS NULL OR NOT (p_signature_base64 LIKE 'data:image/png;base64,%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura inválida. Formato esperado: data:image/png;base64.');
  END IF;

  IF length(p_signature_base64) > 280000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assinatura excede o tamanho máximo permitido de 200 KB.');
  END IF;

  -- 3. Consolidar itens e serviços para o snapshot canônico
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_id', soi.product_id,
      'product_name', pi.name,
      'quantity', soi.quantity,
      'unit_price', soi.unit_price,
      'unit_cost', soi.unit_cost
    )
  ) INTO v_items
  FROM public.service_order_items soi
  LEFT JOIN public.products_inventory pi ON pi.id = soi.product_id
  WHERE soi.service_order_id = v_order.id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'service_id', os.service_id,
      'service_name', s.nome,
      'quantity', os.quantidade,
      'unit_price', os.preco_unitario,
      'subtotal', os.subtotal
    )
  ) INTO v_services
  FROM public.order_services os
  LEFT JOIN public.services s ON s.id = os.service_id
  WHERE os.os_id = v_order.id;

  -- 4. Criar snapshot canônico congelado do orçamento
  v_snapshot := jsonb_build_object(
    'order_id', v_order.id,
    'codigo_os', v_order.codigo_os,
    'approved_at', now(),
    'client_name', v_clean_name,
    'client_ip', v_clean_ip,
    'user_agent', p_user_agent,
    'total_value', v_order.total_value,
    'service_value', v_order.service_value,
    'discount', v_order.discount,
    'items', COALESCE(v_items, '[]'::jsonb),
    'services', COALESCE(v_services, '[]'::jsonb),
    'terms_version', p_terms_version
  );

  -- 5. Calcular Hash SHA-256 do snapshot canônico
  v_hash := encode(sha256(convert_to(v_snapshot::text, 'UTF8')), 'hex');

  -- 6. Atualizar a Ordem de Serviço
  UPDATE public.service_orders
  SET
    status = 'Aprovado',
    client_signature = p_signature_base64,
    client_signature_name = v_clean_name,
    client_signature_ip = v_clean_ip,
    client_signature_user_agent = p_user_agent,
    client_signature_at = now(),
    approved_total = v_order.total_value,
    budget_approval_hash = v_hash,
    budget_snapshot = v_snapshot,
    terms_version = p_terms_version
  WHERE id = v_order.id;

  -- 7. Gravar histórico de status de auditoria
  INSERT INTO public.order_status_history (
    company_id, service_order_id, from_status, to_status, changed_by, reason
  ) VALUES (
    v_order.company_id,
    v_order.id, 
    'Aguardando Aprovação', 
    'Aprovado', 
    NULL,
    'Aprovação eletrônica pelo cliente ' || v_clean_name || ' (IP: ' || v_clean_ip || ', Hash: ' || substring(v_hash from 1 for 12) || '...)'
  );

  RETURN jsonb_build_object(
    'success', true,
    'approved_total', v_order.total_value,
    'approval_hash', v_hash,
    'client_ip', v_clean_ip
  );
END;
$$;

-- Permissões: anon e service_role podem aprovar o orçamento pelo link público
REVOKE ALL ON FUNCTION public.approve_budget_by_client(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_budget_by_client(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
