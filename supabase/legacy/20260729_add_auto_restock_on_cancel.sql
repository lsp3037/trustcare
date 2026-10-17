-- ============================================
-- TRIGGER: Restoque Automático ao Cancelar OS
-- Apaga os itens vinculados quando a OS é Cancelada, 
-- o que aciona o trigger de DELETE nos itens e devolve as peças pro estoque.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_os_cancel_restock()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se o status mudou para 'Cancelado'
  IF NEW.status = 'Cancelado' AND OLD.status IS DISTINCT FROM 'Cancelado' THEN
    -- Apaga todos os produtos (peças) vinculados a esta OS.
    -- OBS: Isso vai disparar o trigger 'trigger_inventory_change' (AFTER DELETE)
    -- que se encarrega de devolver a quantidade ao products_inventory.
    DELETE FROM public.service_order_items
    WHERE service_order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_auto_restock_on_cancel ON public.service_orders;

-- Cria o trigger para UPDATE
CREATE TRIGGER trigger_auto_restock_on_cancel
  AFTER UPDATE OF status ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_os_cancel_restock();
