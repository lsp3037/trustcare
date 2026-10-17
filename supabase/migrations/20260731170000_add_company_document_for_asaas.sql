-- ============================================================
-- MIGRATION: 20260731170000_add_company_document_for_asaas
-- MOTIVO: POST /v3/customers do Asaas exige `cpfCnpj` para abrir o cliente
--   de cobrança, e a tabela companies não tinha onde guardar o documento do
--   titular da assinatura — sem isso o checkout não teria como faturar.
-- ============================================================

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS document TEXT;

COMMENT ON COLUMN public.companies.document IS
  'CPF ou CNPJ do titular da assinatura (somente dígitos). Obrigatório para faturar via Asaas.';
