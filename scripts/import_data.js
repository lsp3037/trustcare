const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const crypto = require('crypto');

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
  console.log('INICIANDO IMPORTAÇÃO DE DADOS MOCK PARA O SUPABASE');
  console.log('==================================================');

  // 1. Tenta carregar o JSON de dados locais
  let jsonData = null;
  const pathsToTry = [
    path.join(__dirname, '../supabase/dados_locais.json'),
    path.join(__dirname, '../dados_locais.json')
  ];

  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        jsonData = JSON.parse(content);
        console.log(`Arquivo de dados locais localizado em: ${p}`);
        break;
      } catch (err) {
        console.error(`Erro ao fazer parse do JSON em ${p}:`, err.message);
      }
    }
  }

  if (!jsonData) {
    console.error('Erro: Arquivo dados_locais.json não encontrado nas pastas do projeto.');
    console.error('Por favor, coloque o arquivo em "supabase/dados_locais.json" ou na raiz do projeto.');
    process.exit(1);
  }

  // 2. Carrega credenciais do banco
  const env = loadEnv();
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

    const encodedPassword = encodeURIComponent(password);
    connectionString = `postgresql://postgres:${encodedPassword}@${host}:5432/postgres`;
  } else {
    console.log('DATABASE_URL encontrado nas variáveis de ambiente / .env.local.');
  }

  // 3. Garante que 'pg' está instalado
  try {
    require.resolve('pg');
  } catch (e) {
    console.log('Instalando dependência "pg" temporariamente...');
    try {
      execSync('npm install pg --no-save', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (err) {
      console.error('Erro ao instalar "pg" automaticamente:', err.message);
      process.exit(1);
    }
  }

  const { Client } = require('pg');

  // 4. Executa a migração
  console.log('\nConectando ao Supabase...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado com sucesso!');

    // 4.1 Garante que as tabelas existem rodando o schema.sql se não existirem
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const tableCheck = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies'"
    );
    if (tableCheck.rows.length === 0 && fs.existsSync(schemaPath)) {
      console.log('Criando estrutura de tabelas do schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('Estrutura de banco de dados criada.');
    } else {
      console.log('As tabelas já existem no banco de dados. Pulando schema.sql para evitar erros de duplicidade.');
    }

    // 4.2 Obtém ou cria a empresa (tenant) principal no banco de dados
    let companyId = null;
    const companyRes = await client.query('SELECT id FROM public.companies LIMIT 1');
    if (companyRes.rows.length > 0) {
      companyId = companyRes.rows[0].id;
      console.log(`Empresa existente encontrada: ${companyId}`);
    } else {
      const insertCompany = await client.query(
        "INSERT INTO public.companies (name) VALUES ('Minha Empresa') RETURNING id"
      );
      companyId = insertCompany.rows[0].id;
      console.log(`Nenhuma empresa encontrada. Nova empresa criada com ID: ${companyId}`);
    }

    // Mapeadores para traduzir IDs temporários para UUIDs reais e válidos do Postgres
    const idMap = {
      clients: {},
      equipments: {},
      products: {},
      orders: {}
    };

    console.log('\nIniciando inserção dos dados...');

    // 4.3 Inserção de Produtos (Inventário)
    let prodCount = 0;
    if (jsonData.inventory && jsonData.inventory.length > 0) {
      for (const item of jsonData.inventory) {
        // Ignora itens de exemplo padrão caso não sejam customizados pelo usuário
        if (!item.id.startsWith('mock-prod-')) continue;

        const newUuid = crypto.randomUUID();
        idMap.products[item.id] = newUuid;

        await client.query(
          `INSERT INTO public.products_inventory 
          (id, company_id, name, sku, category, brand, capacity, quantity, cost_price, sale_price, min_stock_alert) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newUuid,
            companyId,
            item.name,
            item.sku,
            item.category || null,
            item.brand || null,
            item.capacity || null,
            item.quantity || 0,
            item.cost_price || 0,
            item.sale_price || 0,
            item.min_stock_alert || 0
          ]
        );
        prodCount++;
      }
      console.log(`✓ ${prodCount} produtos importados para o estoque.`);
    }

    // 4.4 Inserção de Clientes
    let clientCount = 0;
    if (jsonData.clients && jsonData.clients.length > 0) {
      for (const c of jsonData.clients) {
        if (!c.id.startsWith('mock-client-')) continue;

        const newUuid = crypto.randomUUID();
        idMap.clients[c.id] = newUuid;

        await client.query(
          `INSERT INTO public.clients 
          (id, company_id, type, name, document, phone, email) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newUuid,
            companyId,
            c.type,
            c.name,
            c.document || null,
            c.phone || null,
            c.email || null
          ]
        );
        clientCount++;
      }
      console.log(`✓ ${clientCount} clientes importados.`);
    }

    // 4.5 Inserção de Equipamentos
    let eqCount = 0;
    if (jsonData.equipments && jsonData.equipments.length > 0) {
      for (const eq of jsonData.equipments) {
        if (!eq.id.startsWith('mock-eq-')) continue; // Ignora os templates padrão (eq1, eq2, etc)
        
        // Só insere se o cliente correspondente foi importado
        const realClientId = idMap.clients[eq.client_id];
        if (!realClientId) {
          console.warn(`Aviso: Pulando equipamento ${eq.name} pois o cliente correspondente não foi importado.`);
          continue;
        }

        const newUuid = crypto.randomUUID();
        idMap.equipments[eq.id] = newUuid;

        await client.query(
          `INSERT INTO public.client_equipments 
          (id, company_id, client_id, name, brand, model, serial_number) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newUuid,
            companyId,
            realClientId,
            eq.name,
            eq.brand || null,
            eq.model || null,
            eq.serial_number || null
          ]
        );
        eqCount++;
      }
      console.log(`✓ ${eqCount} equipamentos dos clientes importados.`);
    }

    // 4.6 Inserção de Ordens de Serviço
    let osCount = 0;
    if (jsonData.orders && jsonData.orders.length > 0) {
      for (const order of jsonData.orders) {
        if (!order.id.startsWith('mock-os-')) continue;

        const realClientId = idMap.clients[order.client_id];
        if (!realClientId) {
          console.warn(`Aviso: Pulando OS ${order.id} pois o cliente correspondente não foi importado.`);
          continue;
        }

        const realEqId = order.equipment_id ? idMap.equipments[order.equipment_id] : null;
        const newUuid = crypto.randomUUID();
        idMap.orders[order.id] = newUuid;

        // Se o status for "Concluído" ou "Novo", que foram substituídos pela padronização do frontend, 
        // mapeia para os novos status equivalentes.
        let statusValue = order.status;
        if (statusValue === 'Concluído' || statusValue === 'Pronto') {
          statusValue = 'Pronta para Retirada';
        } else if (statusValue === 'Novo') {
          statusValue = 'Em Análise';
        }

        await client.query(
          `INSERT INTO public.service_orders 
          (id, company_id, client_id, equipment_id, equipment_details, reported_problem, technical_report, status, priority, technician_id, delivery_prediction, service_value, total_value, created_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            newUuid,
            companyId,
            realClientId,
            realEqId || null,
            order.equipment_details || null,
            order.reported_problem,
            order.technical_report || null,
            statusValue,
            order.priority || 'Média',
            null, // technician_id setado como null pois IDs de técnicos locais ('t1', etc.) não batem com auth.users UUIDs
            order.delivery_prediction ? new Date(order.delivery_prediction) : null,
            order.service_value || 0,
            order.total_value || 0,
            order.created_at ? new Date(order.created_at) : new Date()
          ]
        );
        osCount++;
      }
      console.log(`✓ ${osCount} ordens de serviço importadas.`);
    }

    // 4.7 Inserção de Itens da Ordem de Serviço
    let itemCount = 0;
    if (jsonData.orderItems && jsonData.orderItems.length > 0) {
      for (const item of jsonData.orderItems) {
        const realOsId = idMap.orders[item.service_order_id];
        const realProdId = idMap.products[item.product_id];

        if (!realOsId || !realProdId) {
          console.warn(`Aviso: Pulando item de OS ${item.name} pois a OS ou o Produto correspondente não foi importado.`);
          continue;
        }

        const newUuid = crypto.randomUUID();

        await client.query(
          `INSERT INTO public.service_order_items 
          (id, company_id, service_order_id, product_id, quantity, unit_price) 
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newUuid,
            companyId,
            realOsId,
            realProdId,
            item.quantity || 1,
            item.unit_price || 0
          ]
        );
        itemCount++;
      }
      console.log(`✓ ${itemCount} itens de ordens de serviço vinculados.`);
    }

    console.log('\n==================================================');
    console.log('MIGRAÇÃO DE DADOS MOCK CONCLUÍDA COM SUCESSO!');
    console.log('==================================================');

  } catch (err) {
    console.error('\nErro durante a execução do script de importação:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
