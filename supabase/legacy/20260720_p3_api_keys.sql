-- ============================================================
-- P3.6 — API Pública & API Keys
-- Migração: 20260720_p3_api_keys.sql
-- ============================================================

-- Adiciona a coluna api_key na tabela companies se não existir
-- Default: gera uma chave hexadecimal aleatória de 32 caracteres (16 bytes)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Cria um índice na coluna api_key para otimizar a autenticação nas requisições de API
CREATE INDEX IF NOT EXISTS idx_companies_api_key ON companies(api_key);
