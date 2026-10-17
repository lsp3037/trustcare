-- ============================================================
-- MIGRATION: add_increment_product_quantity_rpc
-- DATA: 07/07/2026
-- AUTOR: Performance Audit - Lote 2 (P-02)
-- MOTIVO: Substitui o loop N+1 de restauro de estoque no
--   handleBulkDelete. Antes: 2 queries por item (SELECT + UPDATE).
--   Agora: 1 UPDATE atomico por produto unico via RPC.
--   A funcao usa UPDATE ... SET quantity = quantity + p_quantity
--   que e atomico e nao sofre race condition.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_product_quantity(
  p_product_id UUID,
  p_quantity    INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products_inventory
  SET quantity = quantity + p_quantity
  WHERE id = p_product_id
    AND company_id = public.get_my_company_id(); -- garante isolamento RLS
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Garante que apenas usuarios autenticados da empresa podem chamar a funcao
GRANT EXECUTE ON FUNCTION public.increment_product_quantity(UUID, INTEGER) TO authenticated;
