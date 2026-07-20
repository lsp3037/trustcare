-- ============================================
-- TRIGGER: Baixa/Devolução Automática de Estoque
-- Disparado em INSERT e DELETE de service_order_items
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Deduz quantidade do estoque de forma atômica
    UPDATE public.products_inventory
    SET quantity = GREATEST(0, quantity - NEW.quantity)
    WHERE id = NEW.product_id;

    -- Emite aviso se estoque ficou abaixo do mínimo (loggable)
    PERFORM pg_notify(
      'low_stock_alert',
      json_build_object(
        'product_id', NEW.product_id,
        'company_id', NEW.company_id
      )::text
    ) FROM public.products_inventory
    WHERE id = NEW.product_id
      AND quantity <= min_stock_alert
      AND min_stock_alert > 0;

  ELSIF TG_OP = 'DELETE' THEN
    -- Devolve quantidade ao estoque (ex: OS cancelada ou item removido)
    UPDATE public.products_inventory
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_inventory_change ON public.service_order_items;

-- Cria o trigger para INSERT e DELETE
CREATE TRIGGER trigger_inventory_change
  AFTER INSERT OR DELETE ON public.service_order_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_inventory_change();
