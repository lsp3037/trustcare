-- ============================================================
-- P2.3 — Índices Compostos de Performance
-- P2.4 — RLS de Upload por Empresa no Storage
-- Migração: 20260720_p2_performance_security.sql
-- NOTA: CONCURRENTLY removido — incompatível com o SQL Editor
--       do Supabase (roda dentro de transação automática).
-- ============================================================

-- ──────────────────────────────────────────────
-- P2.3: ÍNDICES COMPOSTOS
-- ──────────────────────────────────────────────

-- Índice primário: listagem de OS por empresa + status
CREATE INDEX IF NOT EXISTS idx_service_orders_company_status
  ON service_orders(company_id, status);

-- OS por empresa + data de criação (paginação/recentes)
CREATE INDEX IF NOT EXISTS idx_service_orders_company_created
  ON service_orders(company_id, created_at DESC);

-- Clientes por empresa (busca e listagem)
CREATE INDEX IF NOT EXISTS idx_clients_company
  ON clients(company_id);

-- Estoque com alerta ativo (índice parcial)
CREATE INDEX IF NOT EXISTS idx_inventory_company_alert
  ON products_inventory(company_id, quantity)
  WHERE min_stock_alert IS NOT NULL;

-- Leads por empresa + status (Kanban)
CREATE INDEX IF NOT EXISTS idx_leads_company_status
  ON leads(company_id, status);

-- Rate limit por IP + path
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_path
  ON rate_limit_hits(client_ip, target_path, hit_at);


-- ──────────────────────────────────────────────
-- P2.4: RLS DE UPLOAD NO STORAGE (os-media)
-- ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- INSERT: apenas no folder da própria empresa
CREATE POLICY "upload_own_company_os_media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'os-media'
  AND (storage.foldername(name))[1] = get_my_company_id()::text
);

-- SELECT: leitura pública (imagens exibidas ao cliente final)
CREATE POLICY "public_read_os_media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'os-media');

-- DELETE: apenas o próprio tenant pode remover seus arquivos
CREATE POLICY "delete_own_company_os_media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'os-media'
  AND (storage.foldername(name))[1] = get_my_company_id()::text
);
