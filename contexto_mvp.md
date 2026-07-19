# Contexto do MVP - Trust Care (OS Manager)

Este documento atua como a referência técnica oficial e de negócio para o MVP (Minimum Viable Product) do **Trust Care (OS-Manager)**. Ele consolida o objetivo do sistema, as regras de negócio atualmente implementadas no código e no banco de dados, o diagrama lógico e estrutural do banco de dados (Supabase/PostgreSQL), as decisões de arquitetura e design tomadas recentemente e o mapa de próximos passos pendentes.

---

## 1. Objetivo Principal do Sistema

O **Trust Care (OS Manager)** é uma plataforma **SaaS Multi-Tenant** desenvolvida para a gestão e o controle operacional de ordens de serviço (OS) em assistências técnicas e consultorias de Tecnologia da Informação. 

O sistema foi concebido com os seguintes pilares estratégicos:
*   **Isolamento Multi-Tenant**: Garantir que múltiplas empresas utilizem a mesma infraestrutura de banco de dados no Supabase de forma totalmente isolada via políticas de RLS (*Row Level Security*).
*   **Transparência e Autoatendimento**: Permitir que clientes finais acompanhem em tempo real o status de manutenção dos seus equipamentos via uma página pública de rastreio de fácil acesso, além de aprovar orçamentos online com assinatura digital juridicamente auditável.
*   **Automatização de Comunicação**: Reduzir a carga de suporte operacional através de disparos de webhooks automatizados para serviços externos de mensageria (como WhatsApp API) em mudanças críticas de status da OS.
*   **Saúde Financeira Integrada**: Ligar diretamente a execução operacional das ordens de serviço ao faturamento da empresa, oferecendo controle fino sobre o status de pagamento, custos de peças aplicadas, controle de despesas gerais recorrentes e projeção de fluxo de caixa.

---

## 2. Regras de Negócio Implementadas

### A. Isolamento de Tenants (Multi-Tenancy)
*   Todo dado sensível das tabelas cruciais (`clients`, `client_equipments`, `service_orders`, `products_inventory`, `company_expenses`, etc.) é atrelado a um `company_id`.
*   O controle de segurança é aplicado via **RLS (Row Level Security)** do PostgreSQL.
*   A função interna `get_my_company_id()` resolve automaticamente no banco de dados a empresa associada ao perfil do usuário autenticado no Supabase Auth (`auth.uid()`), impedindo acessos cruzados.

### B. Fluxo de Autocadastro de Empresa e Convites
*   Ao se cadastrar diretamente via `app/(auth)/register`, uma nova empresa (`companies`) é inserida no banco, e o perfil do usuário (`profiles`) é criado como `admin` por meio de um trigger executado na criação de usuário (`on_auth_user_created` chamando `handle_new_user()`).
*   Se o usuário for cadastrado através de um link de convite (`/invite?token=VALOR`), o trigger verifica a validade do token na tabela `invites`. Caso o convite seja válido, não expirado e corresponda ao e-mail de registro, o usuário é anexado à empresa emissora na função selecionada (`admin`, `technician` ou `viewer`).

### C. Geração Automática de Código OS Híbrido
*   As ordens de serviço contam com um código híbrido amigável em vez de expor apenas o hash UUID. O padrão é estruturado como `TC-YYYY-XXXX`:
    *   `TC`: Sigla da Trust Care.
    *   `YYYY`: Ano civil de abertura da OS (resolvido automaticamente via data de criação).
    *   `XXXX`: Sequencial de quatro dígitos com preenchimento de zeros à esquerda (ex: `0001`, `0002`), reiniciado a cada novo ano.
*   A lógica roda de forma transacional no banco via trigger `trigger_generate_codigo_os` e função `generate_codigo_os()` antes de qualquer `INSERT`.

### D. Rastreamento Público de Ordens de Serviço (LGPD Compliant)
*   A rota `/rastreio` permite a busca pública de OSs a partir de seu ID UUID completo, UUID curto (primeiros 8 caracteres) ou código híbrido formatado (`TC-YYYY-XXXX`).
*   A busca consome uma RPC segura (`get_public_service_order`), marcada como `SECURITY DEFINER` para ignorar restrições RLS comuns apenas para a leitura dos campos autorizados.
*   **Conformidade de Segurança (P0)**: Nenhum dado financeiro (valor do serviço, descontos, valor total) e nenhum dado pessoal identificável do cliente (CPF, telefone completo, e-mail, endereços) são retornados na rota pública. Apenas o status da OS, a timeline de progresso e informações descritivas do equipamento (marca e modelo) são apresentadas.

### E. Aprovação Pública de Orçamentos e Assinatura Digital
*   A rota pública `/orcamento/[id]` é voltada para a interação com o cliente quando a OS encontra-se no status **"Aguardando Aprovação"**.
*   O cliente pode revisar o orçamento (valores das peças e de serviços). Para aprovar, o cliente preenche seu nome por extenso e faz o desenho manuscrito da assinatura na tela via um painel interativo (canvas digital `SignaturePad`).
*   O salvamento é feito pela RPC segura `approve_budget_by_client`:
    *   Altera o status da OS para **"Aprovado"**.
    *   Salva o nome preenchido e a assinatura serializada em string base64.
    *   Captura o IP público do cliente de forma resiliente via `api.ipify.org` para log de auditoria e grava o timestamp exato da transação (`client_signature_at`).

### F. SLA e Rastreio de Início de Análise
*   A tabela `service_orders` monitora o SLA de tempo de resposta com o campo `analysis_started_at`.
*   O trigger `trigger_update_analysis_started_at` atualiza este timestamp de forma irreversível assim que a OS é movimentada para o status **"Em Análise"** pela primeira vez.

### G. Disparos Automáticos de Webhooks
*   Ao atualizar a OS para status de alto interesse do cliente (status críticos: **"Aguardando Peças"**, **"Pronto para Retirada"** e **"Cancelado"**), o frontend do painel administrativo dispara uma requisição HTTP POST para a URL configurada em `NEXT_PUBLIC_WEBHOOK_URL`.
*   O payload transmitido contém:
    ```json
    {
      "event": "order_status_changed",
      "order_id": "UUID",
      "status": "Novo Status",
      "equipment": "Detalhes do Equipamento",
      "client_name": "Nome do Cliente",
      "client_phone": "Telefone do Cliente",
      "tracking_url": "https://dominio/rastreio?id=UUID"
    }
    ```

### H. Módulo Financeiro e de Custos
*   O controle de pagamento é isolado dos status técnicos de bancada. O campo booleano `pago` e a coluna `payment_status` (com os status: `'pendente'`, `'pago'`, `'parcial'`) trabalham de forma reativa.
*   Os métodos de pagamento são validados por restrição na coluna `payment_method` (valores aceitos: `'Pix'`, `'Cartão de Crédito'`, `'Cartão de Débito'`, `'Dinheiro'`, `'Transferência Bancária'`, `'Boleto Bancário'`, `'Outro'`).
*   Existe controle de despesas corporativas via `company_expenses`. O sistema aceita despesas parametrizadas como `'Única'`, `'Diária'`, `'Semanal'`, `'Mensal'` ou `'Anual'`, facilitando projeções de fluxo de caixa e cálculo do break-even operacional (integrando custos de aquisição de peças e despesas administrativas).

---

## 3. Estrutura Atual do Banco de Dados (Supabase/PostgreSQL)

A modelagem lógica é dividida em tabelas relacionais com RLS habilitado e restrições de chaves. Abaixo está o detalhamento técnico de cada tabela:

### A. Tabelas de Estrutura Organizacional e Perfis

#### 1. `companies` (Tenants)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `name` `TEXT` (NOT NULL)
*   `phone` `TEXT`
*   `email` `TEXT`
*   `logo_url` `TEXT` (Logotipo público da empresa salvo no bucket `company-logos`)
*   `whatsapp` `TEXT`
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 2. `profiles` (Usuários / Funcionários)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `user_id` `UUID` (UNIQUE, FK em `auth.users`, CASCADE)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `role` `TEXT` (Constraint CHECK: `'admin'`, `'technician'`, `'viewer'`)
*   `full_name` `TEXT`
*   `email` `TEXT`
*   `phone` `TEXT`
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 3. `invites` (Convites de Membros da Equipe)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `email` `TEXT` (NOT NULL)
*   `role` `TEXT` (CHECK: `'admin'`, `'technician'`, `'viewer'`)
*   `token` `TEXT` (UNIQUE, NOT NULL, Default: hexadecimal de 16 bytes aleatórios)
*   `used` `BOOLEAN` (NOT NULL, Default: `FALSE`)
*   `expires_at` `TIMESTAMPTZ` (NOT NULL, Default: 7 dias)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

---

### B. Tabelas de Clientes e Equipamentos

#### 4. `clients` (Clientes da Assistência)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `client_number` `SERIAL` (Gerador sequencial para ID curto de controle interno)
*   `type` `TEXT` (CHECK: `'PF'`, `'PJ'`)
*   `name` `TEXT` (NOT NULL)
*   `document` `TEXT` (CPF ou CNPJ)
*   `phone` `TEXT`
*   `email` `TEXT`
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 5. `equipment_categories` (Categorias)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `name` `TEXT` (NOT NULL)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 6. `client_equipments` (Inventário de Aparelhos dos Clientes)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `client_id` `UUID` (FK em `public.clients`, CASCADE)
*   `category_id` `UUID` (FK em `public.equipment_categories`, SET NULL)
*   `name` `TEXT` (NOT NULL)
*   `brand` `TEXT`
*   `model` `TEXT`
*   `serial_number` `TEXT`
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

---

### C. Tabelas Operacionais de Ordens de Serviço

#### 7. `service_orders` (A alma do sistema)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `client_id` `UUID` (FK em `public.clients`, RESTRICT - Impede a deleção de cliente com OS ativa)
*   `equipment_id` `UUID` (FK em `public.client_equipments`, SET NULL)
*   `equipment_details` `TEXT`
*   `reported_problem` `TEXT` (NOT NULL)
*   `technical_report` `TEXT`
*   `status` `TEXT` (Default: `'Em Análise'`, CHECK: `'Aguardando Equipamento'`, `'Em Análise'`, `'Aguardando Aprovação'`, `'Aprovado'`, `'Aguardando Peças'`, `'Em Execução'`, `'Em Testes'`, `'Pronto para Retirada'`, `'Finalizado'`, `'Cancelado'`)
*   `priority` `TEXT` (Default: `'Média'`, CHECK: `'Baixa'`, `'Média'`, `'Alta'`)
*   `technician_id` `UUID` (FK em `public.profiles`, SET NULL)
*   `delivery_prediction` `TIMESTAMPTZ`
*   `service_value` `NUMERIC(10,2)` (Default: `0.00`)
*   `discount` `NUMERIC(10,2)` (Default: `0.00`)
*   `total_value` `NUMERIC(10,2)` (Default: `0.00`)
*   `codigo_os` `VARCHAR` (UNIQUE, Padrão `TC-YYYY-XXXX`)
*   `pago` `BOOLEAN` (Default: `FALSE`)
*   `payment_status` `TEXT` (Default: `'pendente'`, CHECK: `'pendente'`, `'pago'`, `'parcial'`)
*   `payment_method` `TEXT` (CHECK: `'Pix'`, `'Cartão de Crédito'`, etc.)
*   `payment_date` `TIMESTAMPTZ`
*   `media` `JSONB` (Default: `'[]'`)
*   `entry_checklist` `JSONB`
*   `exit_checklist` `JSONB`
*   `client_signature` `TEXT` (String base64 da assinatura desenhada)
*   `client_signature_name` `TEXT` (Nome do aprovador)
*   `client_signature_ip` `TEXT` (IP público do cliente de auditoria)
*   `client_signature_at` `TIMESTAMPTZ` (Timestamp da assinatura)
*   `analysis_started_at` `TIMESTAMPTZ` (Timestamp de quando entrou em análise)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 8. `checklist_templates` (Configuração Dinâmica de Checklists)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `category_id` `UUID` (FK em `public.equipment_categories`, CASCADE)
*   `schema` `JSONB` (NOT NULL - Schema dinâmico com campos de checkbox/input para os checklists)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)
*   `updated_at` `TIMESTAMPTZ` (Default: `now()`)
*   *Restrição*: `unique_category_template_per_company` (UNIQUE para `company_id` + `category_id`)

---

### D. Tabelas Financeiras, Inventário e CRM

#### 9. `products_inventory` (Peças e Produtos em Estoque)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `name` `TEXT` (NOT NULL)
*   `sku` `TEXT` (NOT NULL)
*   `category` `TEXT`
*   `brand` `TEXT`
*   `capacity` `TEXT`
*   `quantity` `INTEGER` (Default: `0`, CHECK: `>= 0`)
*   `cost_price` `NUMERIC(10,2)` (Default: `0.00`, CHECK: `>= 0` - Custo de aquisição da peça)
*   `sale_price` `NUMERIC(10,2)` (Default: `0.00`, CHECK: `>= 0` - Valor de venda cobrado do cliente)
*   `min_stock_alert` `INTEGER` (Default: `0`, CHECK: `>= 0`)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 10. `service_order_items` (Peças utilizadas na Ordem de Serviço)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `service_order_id` `UUID` (FK em `public.service_orders`, CASCADE)
*   `product_id` `UUID` (FK em `public.products_inventory`, CASCADE)
*   `quantity` `INTEGER` (Default: `1`, CHECK: `> 0`)
*   `unit_price` `NUMERIC(10,2)` (Default: `0.00`, CHECK: `>= 0`)

#### 11. `services` (Catálogo de Mão de Obra)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `nome` `TEXT` (NOT NULL)
*   `descricao` `TEXT`
*   `preco_padrao` `NUMERIC(10,2)` (Default: `0.00`, CHECK: `>= 0`)
*   `ativo` `BOOLEAN` (Default: `TRUE`)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 12. `order_services` (Serviços aplicados na Ordem de Serviço)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `os_id` `UUID` (FK em `public.service_orders`, CASCADE)
*   `service_id` `UUID` (FK em `public.services`, CASCADE)
*   `quantidade` `INTEGER` (Default: `1`, CHECK: `> 0`)
*   `preco_unitario` `NUMERIC(10,2)` (Default: `0.00`, CHECK: `>= 0`)
*   `subtotal` `NUMERIC(10,2)` (Default: `0.00`, CHECK: `>= 0`)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 13. `company_expenses` (Custos Administrativos / Operacionais)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `description` `TEXT` (NOT NULL)
*   `amount` `NUMERIC(10,2)` (NOT NULL, CHECK: `>= 0`)
*   `category` `TEXT` (CHECK: `'Marketing'`, `'Equipamentos'`, `'Aluguel'`, `'Salários'`, `'Software/Nuvem'`, `'Infraestrutura'`, `'Outros'`)
*   `recurrence` `TEXT` (Default: `'Única'`, CHECK: `'Única'`, `'Diária'`, `'Semanal'`, `'Mensal'`, `'Anual'`)
*   `end_date` `TIMESTAMPTZ`
*   `expense_date` `TIMESTAMPTZ` (Default: `now()`)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)

#### 14. `leads` (Funil de CRM)
*   `id` `UUID` (PK, Default: `gen_random_uuid()`)
*   `company_id` `UUID` (FK em `public.companies`, CASCADE)
*   `name` `TEXT` (NOT NULL)
*   `phone` `TEXT` (NOT NULL)
*   `status` `TEXT` (Default: `'Novo Contato'`, CHECK: `'Novo Contato'`, `'Em Negociação'`, `'Aguardando Equipamento'`, `'Ganho/Convertido'`, `'Perdido'`)
*   `equipment_info` `TEXT`
*   `problem_description` `TEXT`
*   `valor_estimado` `NUMERIC(10,2)` (Default: `0.00`, CHECK: `>= 0`)
*   `motivo_perda` `TEXT`
*   `origem` `TEXT` (Default: `'WhatsApp'`)
*   `created_at` `TIMESTAMPTZ` (Default: `now()`)
*   `updated_at` `TIMESTAMPTZ` (Default: `now()`)

---

## 4. Últimas Decisões Técnicas do Projeto

As revisões e implementações recentes focaram na solidez, usabilidade e conformidade legal do MVP. Principais pontos decididos e integrados:

1.  **Garantia de Build e Correção de Imports**:
    *   O código foi testado localmente com sucesso absoluto via Turbopack no Next.js (`npm run build`). Todos os componentes foram validados em tempo de compilação, corrigindo antigos conflitos de ícones ausentes no `lucide-react` (ex: `Mail`, `Lock`, `ArrowRight` nas páginas de autenticação).
2.  **Lógica Visual de Rastreio Blindada (LGPD)**:
    *   Decidiu-se que a consulta pública do cliente à sua OS (`/rastreio`) nunca expõe informações que possam comprometer a privacidade dos envolvidos. Nenhuma informação sobre valores cobrados ou dados cadastrais sensíveis é enviada, mesmo que o cliente encontre a OS buscando pelo UUID completo.
3.  **Fluxo de Assinatura Online no Canvas**:
    *   Para evitar dependências pesadas e manter o Swiss Minimalism, foi implementado um canvas puro HTML5 para capturar desenhos vetoriais da assinatura do cliente no navegador. A conversão é feita em base64 e mantida na coluna `client_signature` de forma textual, simplificando o fluxo sem exigir upload no Storage apenas para a assinatura.
4.  **Tratamento de Integridade Referencial no PostgreSQL**:
    *   No frontend administrativo (`dashboard/clients/[id]`), ao tentar excluir um cliente que possua Ordens de Serviço associadas, a API captura a violação de chave estrangeira (`foreign_key_violation` - código `23503`) lançada pela restrição `RESTRICT` e exibe uma notificação amigável para o administrador, prevenindo travamentos ou exclusões indevidas de históricos de assistência.
5.  **Swiss Technical Minimalism (Padrão Estético)**:
    *   Refatoração profunda das telas operacionais (Checklists e timelines de progresso) para usar cores escuras/claras sob o contraste de cinza e branco. **Proibição absoluta de tons violetas/roxos** nas interfaces do sistema, adotando variações elegantes de verde-esmeralda para estados positivos (ex: orçamento aprovado) e azul para estados de execução.
6.  **Recorrência Financeira e KPIs Gerais**:
    *   Adição de projeção temporal para despesas da empresa na tabela `company_expenses`. O cálculo consolida previsões diárias, semanais, mensais e anuais no dashboard, cruzando com o total acumulado de receitas de Ordens de Serviço para gerar métricas limpas e exportáveis para CSV.

---

## 5. Próximos Passos Pendentes

Abaixo estão listadas as pendências técnicas recomendadas para a evolução da plataforma pós-MVP:

1.  **Habilitação do Robô WhatsApp/Webhook (Integração de Notificação)**:
    *   *Cenário Atual*: O painel dispara um POST para a variável de ambiente `NEXT_PUBLIC_WEBHOOK_URL` contendo o payload e a URL de rastreio estruturada.
    *   *Pendência*: Criar/configurar a URL receptora real em produção (usando ferramentas de integração como n8n, Make ou um microsserviço Node.js) que utilize a API do WhatsApp (ex: Evolution API, Z-API) para enviar a mensagem formatada contendo o link de rastreio diretamente ao telefone do cliente.
2.  **Rate Limiting no Rastreio e Orçamento Público**:
    *   *Cenário Atual*: Rotas públicas como `/rastreio` e `/orcamento/[id]` chamam RPCs seguras sem limite de requisições por IP.
    *   *Pendência*: Configurar controle de taxa (Rate Limit) nas rotas de API/Edge Functions do Supabase ou via Next.js Middleware para evitar ataques de força bruta que busquem sequenciar códigos OS ou IDs UUIDs de forma repetida.
3.  **Validação Estrutural de CPF/CNPJ de Clientes**:
    *   *Cenário Atual*: A coluna `document` da tabela `clients` aceita qualquer valor string livre.
    *   *Pendência*: Adicionar máscaras dinâmicas e validação de dígitos verificadores de CPF e CNPJ tanto no formulário de cadastro administrativo (`components/NewOrderForm.tsx`) quanto em nível de banco de dados para evitar registros duplicados ou inconsistentes.
4.  **Reserva e Baixa Automática de Estoque**:
    *   *Cenário Atual*: As peças são adicionadas como itens da OS em `service_order_items`, mas a quantidade restante do produto em `products_inventory.quantity` não é deduzida de forma automática.
    *   *Pendência*: Implementar um trigger no Supabase que realize a baixa automática da quantidade de produtos em estoque assim que o status da ordem de serviço for alterado para **"Em Execução"** ou **"Finalizado"**, além de enviar um alerta se a quantidade cair abaixo de `min_stock_alert`.
5.  **Restrição nas Políticas do Bucket de Storage (`os-media`)**:
    *   *Cenário Atual*: A política de upload para o bucket `os-media` permite inserção por qualquer usuário autenticado (`authenticated`).
    *   *Pendência*: Refinar a regra do Storage RLS do Supabase para garantir que o usuário logado só consiga realizar upload de imagens/vídeos caso a OS em questão pertença ao mesmo `company_id` que ele, organizando os caminhos lógicos em pastas estruturadas (ex: `/os-media/company_id/os_id/arquivo.jpg`).
