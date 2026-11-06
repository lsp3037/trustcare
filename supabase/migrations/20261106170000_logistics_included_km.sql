-- ==============================================================================
-- MIGRATION: 20261106170000_logistics_included_km.sql
-- Adiciona suporte à Franquia de KM (Opção A) nas configurações e histórico de logística:
-- 1. included_km em company_logistics_settings (distância ida e volta coberta pela taxa base)
-- 2. included_km em service_order_logistics (snapshot da franquia no cálculo da OS)
-- 3. Atualiza os valores padrão da Trust Care para Opção A (Base: R$ 15,00, Franquia: 10 km, Excedente: R$ 1,50/km)
-- ==============================================================================

ALTER TABLE public.company_logistics_settings
  ADD COLUMN IF NOT EXISTS included_km NUMERIC(6,1) NOT NULL DEFAULT 10.0 CHECK (included_km >= 0);

ALTER TABLE public.service_order_logistics
  ADD COLUMN IF NOT EXISTS included_km NUMERIC(6,1) NOT NULL DEFAULT 10.0 CHECK (included_km >= 0);

-- Ajustar configurações ativas existentes para valores justos (Opção A):
UPDATE public.company_logistics_settings
SET
  base_fee = 15.00,
  included_km = 10.0,
  price_per_km = 1.50,
  min_fee = 15.00,
  round_trip = TRUE,
  updated_at = now()
WHERE company_id = '42a4a34b-2798-4c6b-b322-3e40c48ec3e5';
