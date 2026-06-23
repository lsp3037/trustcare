const { Client } = require('pg');

const connectionString = 'postgresql://postgres.dbxdqolktavqngrxknum:Faizueli0706%40@aws-1-sa-east-1.pooler.supabase.com:6543/postgres';

const sql = `
-- ====================================================
-- ATUALIZAÇÃO DA RESTRIÇÃO DE STATUS (CHECK CONSTRAINT)
-- ====================================================

-- 1. Remove a restrição CHECK antiga se existir
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;

-- 2. Adiciona a nova restrição contendo 'Aguardando Equipamento'
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_status_check 
  CHECK (status IN (
    'Aguardando Equipamento', 
    'Em Análise', 
    'Na Bancada', 
    'Aguardando Peça', 
    'Em Testes', 
    'Pronta para Retirada', 
    'Entregue', 
    'Cancelada'
  ));
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
    console.log('Atualizando restrição de status (CHECK constraint)...');
    
    await client.query(sql);
    
    console.log('Restrição de status atualizada com SUCESSO! O status "Aguardando Equipamento" agora é aceito.');
  } catch (err) {
    console.error('Erro na execução da migração:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
