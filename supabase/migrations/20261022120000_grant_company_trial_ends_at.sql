-- ============================================================
-- Libera `companies.trial_ends_at` para leitura pelo front.
--
-- Por quê: a 20261009120000 (phase1b) tirou o SELECT da tabela inteira e
-- liberou só uma lista de colunas. A coluna `trial_ends_at` nasceu depois
-- (20261017220000) e ficou fora dessa lista. O `CompanyContext` a seleciona
-- explicitamente, então todo login recebia 403 "permission denied", o contexto
-- caía na empresa-padrão sem `id` e o onboarding falhava com
-- "Empresa não carregada".
--
-- Só `authenticated` (o `anon` não lê dados de trial). `api_key` e os ids do
-- Asaas continuam sem acesso pelo front, como na phase1b.
-- Reversão no fim do arquivo.
-- ============================================================

GRANT SELECT (trial_ends_at) ON public.companies TO authenticated;

-- ============================================================
-- REVERSÃO (executar manualmente se necessário)
-- ============================================================
-- REVOKE SELECT (trial_ends_at) ON public.companies FROM authenticated;
