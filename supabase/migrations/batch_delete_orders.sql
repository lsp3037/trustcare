-- P-02: Optimize bulk delete to avoid N+1 N+1 queries from frontend
CREATE OR REPLACE FUNCTION delete_service_orders_batch(order_ids uuid[])
RETURNS void AS $$
DECLARE
  item RECORD;
BEGIN
  -- 1. Restore inventory for all items in the deleted orders
  FOR item IN 
    SELECT product_id, SUM(quantity) as total_qty 
    FROM service_order_items 
    WHERE service_order_id = ANY(order_ids)
    GROUP BY product_id
  LOOP
    UPDATE products_inventory 
    SET quantity = quantity + item.total_qty 
    WHERE id = item.product_id;
  END LOOP;

  -- 2. Delete items (foreign keys might do this automatically if ON DELETE CASCADE, but being explicit is safe)
  DELETE FROM service_order_items WHERE service_order_id = ANY(order_ids);
  
  -- 3. Delete orders
  DELETE FROM service_orders WHERE id = ANY(order_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
