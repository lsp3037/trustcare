-- ============================================================
-- MIGRATION: 20261109151000_allow_execution_to_finished_transition.sql
-- Correção na máquina de estados da OS: permitir fluxo direto
-- de "Em Execução" e "Em Testes" para "Finalizado".
-- ============================================================

INSERT INTO public.order_status_transitions (from_status, to_status, requires_admin)
VALUES
  ('Em Execução', 'Finalizado', false),
  ('Em Testes', 'Finalizado', false)
ON CONFLICT (from_status, to_status) DO UPDATE
SET requires_admin = EXCLUDED.requires_admin;
