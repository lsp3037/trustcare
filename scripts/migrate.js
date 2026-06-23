const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Função para carregar variáveis de .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  const envVars = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          envVars[key] = value;
        }
      }
    });
  }
  return envVars;
}

async function run() {
  console.log('==================================================');
  console.log('INICIANDO MIGRAÇÃO DO BANCO DE DADOS DO SUPABASE');
  console.log('==================================================');

  const env = loadEnv();
  
  // 1. Tenta obter a string de conexão direta
  let connectionString = env.DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('Erro: NEXT_PUBLIC_SUPABASE_URL não configurado no .env.local.');
      process.exit(1);
    }

    const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (!match || !match[1]) {
      console.error('Erro: Não foi possível obter o ID do projeto a partir do NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
      process.exit(1);
    }

    const projectId = match[1];
    const host = `db.${projectId}.supabase.co`;
    console.log(`Projeto Supabase identificado: ${projectId}`);
    console.log(`Host do banco de dados: ${host}`);

    // Pergunta a senha de forma interativa
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const getPassword = () => new Promise(resolve => {
      rl.question('Digite a SENHA do banco de dados real do seu Supabase: ', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    const password = await getPassword();
    if (!password) {
      console.error('Erro: Senha não pode ser vazia.');
      process.exit(1);
    }

    // Codifica a senha para evitar problemas com caracteres especiais na URL
    const encodedPassword = encodeURIComponent(password);
    connectionString = `postgresql://postgres:${encodedPassword}@${host}:5432/postgres`;
  } else {
    console.log('DATABASE_URL encontrado nas variáveis de ambiente / .env.local.');
  }

  // 2. Garante que o driver 'pg' está instalado
  try {
    require.resolve('pg');
  } catch (e) {
    console.log('Instalando dependência "pg" temporariamente para rodar a migração...');
    try {
      execSync('npm install pg --no-save', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log('Dependência "pg" instalada com sucesso.');
    } catch (err) {
      console.error('Erro ao instalar "pg" automaticamente:', err.message);
      console.error('Por favor, execute "npm install pg" no terminal e tente novamente.');
      process.exit(1);
    }
  }

  const { Client } = require('pg');

  // 3. Lê o arquivo de schema
  const schemaPath = path.join(__dirname, '../supabase/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`Erro: Arquivo de schema não encontrado em ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Lido o arquivo supabase/schema.sql.');

  // 4. Executa a migração
  console.log('\nConectando ao Supabase...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Supabase exige SSL
  });

  try {
    await client.connect();
    console.log('Conectado com sucesso!');
    console.log('Executando os comandos SQL (isso pode levar alguns segundos)...');
    
    // Executa as queries
    await client.query(sql);
    
    console.log('\n==================================================');
    console.log('SUCESSO! Tabelas, RLS, Políticas e Triggers criados.');
    console.log('==================================================');
  } catch (err) {
    console.error('\nErro ao executar migração no banco de dados:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('Por favor, certifique-se de que a senha do banco de dados está correta.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
