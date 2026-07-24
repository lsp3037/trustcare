-- ============================================================
-- MIGRATION: 20260723_fix_rpc_security_and_indexes
-- AUTOR: SaaS Security Patch
-- MOTIVO: 
-- 1. Corrige a vulnerabilidade ALTA na RPC delete_service_orders_batch 
--    que permitia exclusão de dados de outras empresas.
-- 2. Adiciona índices nas chaves estrangeiras (FKs) para performance.
-- ============================================================

-- 1. Reescrevendo a RPC para forçar a checagem de company_id
CREATE OR REPLACE FUNCTION delete_service_orders_batch(order_ids uuid[])
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Índices de Performance para Foreign Keys
CREATE INDEX IF NOT EXISTS idx_service_orders_client_id ON public.service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_equipment_id ON public.service_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_service_order_items_product_id ON public.service_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_services_service_id ON public.order_services(service_id);
