-- ============================================================
-- P2.3 — Índices Compostos de Performance
-- P2.4 — RLS de Upload por Empresa no Storage
-- Migração: 20260720_p2_performance_security.sql
-- ============================================================

-- ──────────────────────────────────────────────
-- P2.3: ÍNDICES COMPOSTOS
-- ──────────────────────────────────────────────

-- Índice primário: listagem de OS por empresa + status
-- Usado na tela principal de /dashboard/orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_orders_company_status
  ON service_orders(company_id, status);

-- Índice de listagem de OS por empresa + data de criação (paginação/recentes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_orders_company_created
  ON service_orders(company_id, created_at DESC);

-- Índice de clientes por empresa (busca e listagem)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company
  ON clients(company_id);

-- Índice de estoque com alerta ativo
-- Filtragem parcial: só indexa produtos que têm alerta configurado
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_company_alert
  ON products_inventory(company_id, quantity)
  WHERE min_stock_alert IS NOT NULL;

-- Índice de leads por empresa + status (Kanban)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_company_status
  ON leads(company_id, status);

-- Índice de rate limit por IP + path (limpeza de hits expirados)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limit_ip_path
  ON rate_limit_hits(client_ip, target_path, hit_at);


-- ──────────────────────────────────────────────
-- P2.4: RLS DE UPLOAD NO STORAGE (os-media)
-- ──────────────────────────────────────────────

-- Remove políticas permissivas existentes no bucket os-media (se houver)
-- ATENÇÃO: ajuste o nome da policy se já existir uma diferente
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Política de INSERT: apenas para a própria empresa
-- A estrutura do bucket é: /company_id/os_id/filename
-- get_my_company_id() resolve o company_id do auth.uid() atual
CREATE POLICY "upload_own_company_os_media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'os-media'
  AND (storage.foldername(name))[1] = get_my_company_id()::text
);

-- Política de SELECT: leitura pública (imagens da OS exibidas ao cliente)
-- Mantém o bucket público para visualização, mas restringe escrita
CREATE POLICY "public_read_os_media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'os-media');

-- Política de DELETE: apenas o próprio tenant pode deletar seus arquivos
CREATE POLICY "delete_own_company_os_media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'os-media'
  AND (storage.foldername(name))[1] = get_my_company_id()::text
);
