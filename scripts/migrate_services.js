const { Client } = require('pg');

const connectionString = 'postgresql://postgres.dbxdqolktavqngrxknum:Faizueli0706%40@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';

const sql = `
-- ====================================================
-- CATÁLOGO DE SERVIÇOS & ITENS DE SERVIÇO DA O.S.
-- ====================================================

-- 1. Tabela de Serviços Catalogados
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_padrao NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (preco_padrao >= 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Serviços
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflito se rodar novamente
DROP POLICY IF EXISTS manage_services ON public.services;

-- Criar política RLS
CREATE POLICY manage_services ON public.services
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());


-- 2. Tabela de Relacionamento Ordem de Serviço -> Serviços
CREATE TABLE IF NOT EXISTS public.order_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    os_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (preco_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para Serviços da OS
ALTER TABLE public.order_services ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS manage_order_services ON public.order_services;

-- Criar política RLS
CREATE POLICY manage_order_services ON public.order_services
    FOR ALL USING (company_id = public.get_my_company_id())
    WITH CHECK (company_id = public.get_my_company_id());
`;

async function run() {
  console.log('Conectando ao banco de dados Supabase...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado com sucesso!');
    console.log('Executando DDL de migração para Serviços...');
    
    await client.query(sql);
    
    console.log('Migração concluída com SUCESSO! Tabelas "services" e "order_services" criadas com RLS.');
  } catch (err) {
    console.error('Erro na execução da migração:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
