# Auditoria técnica — Trust Care (OS Manager)

Data: 2026-10-05 · Escopo: `app/`, `components/`, `lib/`, `supabase/`, `tests/`, `proxy.ts`, `scripts/`, docs de raiz.
Stack: Next.js 16.2 (App Router, `proxy.ts`), React 19, Supabase (Postgres + RLS + Storage), Resend, Asaas (stub).

## Como esta auditoria foi feita (e seus limites)

- Revisão **estática** do código. Nenhum comando gravou em banco, nenhuma chave de produção foi usada, `.env.local` **não foi lido**, nenhum arquivo existente foi alterado.
- Não tive acesso ao banco real. Tudo que depende do estado do Supabase em produção (políticas aplicadas, funções existentes, grants) está marcado **[verificar no banco]**. As migrations do repositório são a única fonte, e elas **não são reprodutíveis** (ver F-12), então o estado real pode diferir.
- Li integralmente: `proxy.ts`, todas as rotas `app/api/**`, `lib/**` (exceto utilitários de UI), todas as migrations + `schema.sql`, `useOrderForm`, `useDashboardData`, `OrderDetailsClient`, `financeiro/page.tsx` (e modais), contextos, login/registro/convite/equipe/usuários, portal, backoffice, trechos de orçamento público e rastreio.
- **Não li a fundo** (podem esconder falhas): `components/ui/*`, landing (`app/page.tsx`, `app/preview`), `agenda`, `leads`, `services`, `settings/checklists`, `clients/*`, `inventory/*` (só trechos), `temp-print`, `pdfGenerator` (só trechos). Tratar como lacuna da auditoria.
- Linhas citadas são do estado atual da árvore de trabalho (branch `master`).

---

## 1. Mapa do sistema

### 1.1 Módulos

| Módulo | Onde | Função |
|---|---|---|
| Autenticação / tenants | `app/(auth)/*`, `app/invite`, `proxy.ts`, trigger `handle_new_user` | Login/registro Supabase Auth; registro cria `companies` + `profiles(admin)`; convite por token vincula a empresa existente |
| Painel (dashboard) | `app/(dashboard)/dashboard/**` | Área logada; layout bloqueia tudo se assinatura `canceled`/`past_due` > 5 dias |
| Ordens de Serviço | `orders/`, `orders/[id]/`, `components/NewOrderForm`, `useOrderForm` | CRUD de OS, itens (peças + serviços), checklist entrada/saída, anexos, laudo, pagamento |
| Clientes / equipamentos | `clients/`, `clients/[id]/` | Cadastro PF/PJ, aparelhos, categorias |
| Estoque | `inventory/`, `inventory/[id]/` + triggers de baixa/estorno | Peças, SKU, mínimo; baixa automática ao inserir item na OS |
| Serviços (mão de obra) | `services/` | Catálogo com preço padrão |
| Financeiro | `financeiro/**` | KPIs, recebidos/pendentes, despesas (recorrência), gráficos, CSV |
| Leads (CRM) | `leads/` | Kanban de funil (não gera OS) |
| Agenda | `agenda/` | Calendário de OS |
| Configurações | `settings/{company,profile,team,checklists,billing}`, `usuarios/` | Empresa, perfil, equipe/convites, templates de checklist, plano |
| Público: orçamento | `app/(public)/orcamento/[id]` | Cliente vê orçamento e aprova com assinatura canvas (RPC `approve_budget_by_client`) |
| Público: rastreio | `app/rastreio`, `api/rastreio/*` | Busca por código/UUID → OTP de 6 dígitos por e-mail → status da OS |
| Público: portal | `app/(public)/portal/**` | "Login" por CPF/CNPJ + e-mail; lista OS do cliente |
| API pública | `app/api/v1/orders` | GET/POST de OS com `x-api-key` por empresa |
| Cobrança SaaS | `api/checkout/asaas`, `api/webhooks/asaas`, `settings/billing` | Planos starter/pro/premium; Asaas **ainda é stub** (501) |
| Notificações | `api/notify`, `lib/services/email.ts` | E-mail transacional (Resend) + webhook genérico (`WEBHOOK_URL`) |
| Backoffice "God Mode" | `app/(backoffice)/backoffice` | Lista de tenants (service role), restrito por e-mail fixo no `proxy.ts` |

### 1.2 Rotas

- **Públicas:** `/` (landing), `/preview` (cópia da landing), `/login`, `/register`, `/forgot-password`, `/update-password`, `/invite?token=`, `/rastreio`, `/orcamento/[id]`, `/portal`, `/portal/dashboard` (protegida só por cookie forjável).
- **Autenticadas:** `/dashboard/{,orders,orders/[id],orders/[id]/temp-print,clients,clients/[id],inventory,inventory/[id],services,financeiro,leads,agenda,usuarios,settings/*}`.
- **Restrita:** `/backoffice`.
- **API:** `POST /api/notify` · `POST /api/checkout/asaas` · `POST /api/webhooks/asaas` · `POST /api/rastreio/{request-token,verify-token}` · `POST /api/rate-limit` · `GET|POST /api/v1/orders` · `GET /api/auth/callback`.

### 1.3 Fluxos principais

1. **Cadastro de empresa:** `/register` → `auth.signUp` com `company_name` em metadata → trigger `handle_new_user` cria `companies` (`trialing`, plano `starter`) e `profiles(role=admin)`.
2. **Convite:** admin gera token (client-side) em `invites` → link `/invite?token=` → `signUp` com `invite_token` → trigger valida token+e-mail e usa a empresa do convite.
3. **Abertura de OS:** `useOrderForm` → insere `service_orders` (total calculado no browser) → insere `service_order_items` / `order_services` um a um → trigger baixa estoque → `POST /api/notify` (e-mail "Abertura").
4. **Ciclo da OS:** 10 status (`OS_STATUS_FLOW`): Aguardando Equipamento → Em Análise → Aguardando Aprovação → Aprovado → Aguardando Peças → Em Execução → Em Testes → Pronto para Retirada → Finalizado / Cancelado. Troca de status = `UPDATE` direto + `POST /api/notify`. `Finalizado` abre modal de pagamento. `Cancelado` apaga os itens (trigger) e devolve estoque.
5. **Aprovação de orçamento:** e-mail com link `/orcamento/{uuid}` → RPC `get_public_budget_details` → nome + assinatura canvas + IP (via ipify no browser) → RPC `approve_budget_by_client` → status `Aprovado`.
6. **Rastreio:** código/UUID → `request-token` (gera OTP, grava `os_verifications`, envia e-mail) → `verify-token` (5 tentativas) → devolve laudo, problema relatado e mídias.
7. **Pagamento da OS:** modal "Finalização e Caixa" ou `MarkAsPaidModal` → `pago=true`, `payment_status='pago'`, método e data.
8. **Financeiro:** carrega **todas** as OS + itens + despesas no browser e calcula receita recebida, custo de peças, despesas projetadas (recorrência), lucro.
9. **Assinatura SaaS:** `billing` → `/api/checkout/asaas` (modo simulação ativa o plano) → webhook Asaas atualiza `companies.subscription_*` → RLS (`is_company_read_only`) e UI bloqueiam escrita/uso.

---

## 2. Falhas encontradas

Legenda de severidade: **Crítica** (exploração remota / perda de controle de dinheiro ou dados de terceiros), **Alta**, **Média**, **Baixa**.
IDs `F-xx` são referenciados na seção 3.

### 2.1 Resumo

| ID | Sev. | Título |
|---|---|---|
| F-01 | Crítica | Senha do banco de produção commitada em `scripts/` (e no histórico git) |
| F-02 | Crítica | `/api/notify` sem autenticação: relay de e-mail/phishing e disparo de webhook |
| F-03 | Crítica | Checkout em "modo simulação" ativa plano pago sem pagamento se `ASAAS_API_KEY` faltar |
| F-04 | Crítica | RLS deixa o admin da empresa editar as próprias colunas de cobrança (plano, status, validade, `api_key`) |
| F-05 | Crítica | RPC pública `get_public_service_order` contorna o OTP e enumera OS de todos os tenants **[verificar no banco]** |
| F-06 | Crítica | `request-token` devolve o OTP na resposta quando `RESEND_API_KEY` não está definida |
| F-07 | Crítica* | `handle_new_user` em `schema.sql` aceita `company_id`/`role` do metadata do signUp **[verificar no banco]** |
| F-08 | Alta | Trial nunca expira (`trialing` jamais fica somente-leitura) |
| F-09 | Alta | RLS sem checagem de papel: viewer/técnico escrevem e apagam tudo; financeiro legível por todos |
| F-10 | Alta | Estoque devolvido em dobro na exclusão de OS (manual + trigger + RPC) |
| F-11 | Alta | Itens da OS regravados sem transação, sem checar erro; total vem do browser |
| F-12 | Alta | Migrations não reprodutíveis; `batch_delete_orders.sql` sobrescreve a versão segura da RPC |
| F-13 | Alta | Fallback "mock" em `localStorage` mascara falhas de gravação (dados somem, UI mostra sucesso) |
| F-14 | Alta | Dashboard exibe dados inventados (receita fake, 28 PJ / 14 PF, 3 itens baixos) |
| F-15 | Alta | Datas de pagamento salvas como 00:00 UTC deslocam recebimentos para o dia/mês anterior |
| F-16 | Alta | Custo de peças usa `cost_price` atual (sem snapshot); `cost_price` = 60% do preço fixo no cadastro rápido |
| F-17 | Alta | Relatórios carregam tudo no browser: corte silencioso em 1000 linhas do PostgREST |
| F-18 | Alta | Sem máquina de estados da OS (qualquer salto, kanban sem pagamento, cancelar destrói itens) |
| F-19 | Alta | Aprovação de orçamento não amarra valores nem identidade; IP vem do browser |
| F-20 | Alta | Portal do cliente sem autenticação real (cookie `portal-session-mock`) |
| F-21 | Alta | Rastreio: injeção de filtro PostgREST, busca global entre tenants, OTP fraco e contornável |
| F-22 | Alta | XSS armazenado via `dangerouslySetInnerHTML` sem sanitização |
| F-23 | Alta | Políticas de Storage: logos graváveis/apagáveis por qualquer tenant; `os-media` público sem validação |
| F-24 | Alta | `company_expenses` sem política de UPDATE: edição e "encerrar recorrência" falham em silêncio |
| F-25 | Alta | Cota de técnicos só vale em INSERT; admin troca papel e estoura o plano; sem proteção do último admin |
| F-26 | Alta | `codigo_os` global, com corrida, estouro >9999 e "contaminação" por código `ERR` |
| F-27 | Média | `/api/v1/orders`: chave em texto puro, sem rate limit, `client_id` sem checar tenant, sem paginação |
| F-28 | Média | Isolamento por subdomínio só no cliente; `request-token` ignora o subdomínio |
| F-29 | Média | Backdoor `admin@admin.com / admin123`; `localStorage` define papel de admin na UI |
| F-30 | Média | Open redirect em `/api/auth/callback` |
| F-31 | Média | Webhook Asaas: cancelamento por `PAYMENT_DELETED`, sem idempotência/ordem, comparação não constante |
| F-32 | Média | Backoffice protegido só por e-mail fixo no `proxy.ts`; página usa service role sem checar sessão |
| F-33 | Média | Rate limit: anon pode inserir em `rate_limit_hits`; fail-open; IP por `x-forwarded-for` |
| F-34 | Média | Total do e-mail de orçamento usa valor antigo da OS |
| F-35 | Média | Tela bloqueada por inadimplência esconde também a leitura/exportação dos dados |
| F-36 | Média | Funções `SECURITY DEFINER` sem `search_path`; `get_my_company_id()` sem `STABLE` |
| F-37 | Média | Políticas permissivas duplicadas anulam o bloqueio de somente-leitura (leads e outras) |
| F-38 | Média | Chave de API legível por qualquer papel (`select *` em `companies`) |
| F-39 | Baixa | `generateMetadata` do orçamento lê `params` de forma síncrona (removido no Next 16) |
| F-40 | Baixa | Demais: tokens de convite com `Math.random`, pagamento parcial inexistente, float em dinheiro, drift de recorrência mensal, etc. |

\* Crítica se a função implantada for a de `schema.sql`; a migration `add_invites_table_and_trigger.sql` já removeu o ramo.

### 2.2 Detalhe

#### F-01 — Senha do banco de produção commitada · **Crítica**
- `scripts/migrate_services.js:3` e `scripts/update_status_constraint.js:3` contêm a connection string completa do pooler Supabase do projeto `dbxdqolktavqngrxknum`, com usuário `postgres.*` e **senha em texto claro** (omitida aqui de propósito). Arquivos rastreados pelo git; introduzidos no commit `e862464` — a senha está no histórico.
- **Corrigir:** (1) **rotacionar a senha do banco agora** (Supabase → Database → Reset password) e reiniciar o que depende dela; (2) remover do histórico (`git filter-repo --path scripts/migrate_services.js --path scripts/update_status_constraint.js --invert-paths`) e forçar push *só depois* de alinhar com quem tem clone; (3) scripts devem ler `DATABASE_URL` do ambiente (já é o padrão em `scripts/migrate.js`/`import_data.js`); (4) apagar os ~13 scripts one-off de `scripts/` que não são mais usados; (5) ativar secret scanning (GitHub push protection / gitleaks no CI).

#### F-02 — `/api/notify` sem autenticação · **Crítica**
- `app/api/notify/route.ts:4-50`: qualquer pessoa na internet pode `POST` com `client_email`, `client_name`, `equipment`, `status`, `tracking_url`, `budget_url`, `total_value` e o servidor envia e-mail **do domínio Trust Care** via Resend. `lib/services/email.ts:52,58` coloca `budgetUrl`/`trackingUrl` direto em `href` e `:105,:119,:124,:130` interpolam os demais campos **sem escape** → phishing perfeito (remetente legítimo, link arbitrário, HTML injetável) e queima da reputação/cota do Resend. `:53-80` também dispara `WEBHOOK_URL` (WhatsApp/n8n) com dados arbitrários — spam de WhatsApp em nome do cliente.
- **Corrigir:** exigir sessão (`createServerClient` + `getUser()`, como `checkout/asaas/route.ts`); receber só `order_id` e **buscar** cliente, e-mail, equipamento e total no banco com RLS (nunca confiar no payload); montar as URLs no servidor a partir de `NEXT_PUBLIC_SITE_URL`; escapar HTML (`escapeHtml`) em todos os campos do template; rate limit por usuário/empresa; mover o disparo para trigger/queue server-side ao mudar o status (hoje depende do browser do atendente).

#### F-03 — Checkout "simulado" ativa plano sem pagar · **Crítica**
- `app/api/checkout/asaas/route.ts:63-88`: se `ASAAS_API_KEY` não existe, o endpoint grava `subscription_status='active'`, plano escolhido e +30 dias via service role. Qualquer admin de qualquer empresa pode chamar quantas vezes quiser. Basta a variável faltar/estar mal escrita em produção (falha aberta). Em produção a integração real nem existe (`:108-110` devolve 501), então o modo simulação **é** o caminho ativo.
- **Corrigir:** só permitir simulação com `NODE_ENV !== 'production'` **e** flag explícita (`ENABLE_BILLING_SIMULATION=1`); em produção sem chave → 503. Implementar Asaas de verdade (customer + subscription com `externalReference = companyId:planId`) e nunca ativar plano fora do webhook confirmado.

#### F-04 — Admin edita colunas de cobrança da própria empresa · **Crítica**
- `supabase/schema.sql:309-313` (`update_company`): admin pode `UPDATE` **qualquer coluna** de `companies`. Não há `REVOKE`/`GRANT` por coluna em nenhuma migration (única ocorrência de GRANT é `add_increment_product_quantity_rpc.sql:26`). Logo, pelo REST do Supabase com o JWT dele: `PATCH /rest/v1/companies?id=eq.<minha>` `{"subscription_plan":"premium","subscription_status":"active","subscription_expires_at":"2099-01-01"}` → plano máximo grátis e para sempre; também troca `api_key`, `asaas_*`, `subdomain`.
- **Corrigir:** `REVOKE UPDATE ON public.companies FROM authenticated, anon;` + `GRANT UPDATE (name, phone, email, logo_url, whatsapp) ON public.companies TO authenticated;` ou trigger `BEFORE UPDATE` que rejeita mudança de colunas de cobrança quando `auth.role() <> 'service_role'`. Mover `api_key` para tabela própria (F-27/F-38).

#### F-05 — RPC pública enumera OS de todos os tenants · **Crítica** **[verificar no banco]**
- `schema.sql:548-609` e `20260718_saas_setup.sql:340-388`: `get_public_service_order(search_query, tenant_subdomain)` é `SECURITY DEFINER` e, sem `REVOKE`, executável por `anon`. O filtro é `lower(codigo_os) LIKE lower(q) || '%'` (sem escapar `%`/`_`) e `so.id::text LIKE q || '%'`. Chamando `POST /rest/v1/rpc/get_public_service_order {"search_query":"TC-2026"}` (ou `"_"`) retorna **várias OS de todas as empresas** com `reported_problem`, `technical_report`, `media`, marca/modelo — sem OTP, sem tenant. A tela atual usa a API com OTP, mas a função continua exposta, anulando toda a proteção "LGPD" descrita em `contexto_mvp.md`.
- **Corrigir:** `DROP FUNCTION` (ela não é mais usada pelo front) ou `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`; se for mantida, exigir igualdade exata e `tenant_subdomain` obrigatório, nunca prefixo. Auditar `\df+` e `has_function_privilege('anon', ...)` para **todas** as funções `SECURITY DEFINER` (`get_public_budget_details`, `approve_budget_by_client`, `check_and_clean_rate_limit`, `get_company_storage_bytes`, `delete_service_orders_batch`).

#### F-06 — OTP devolvido na resposta · **Crítica**
- `app/api/rastreio/request-token/route.ts:146-148`: `if (!resendApiKey) responsePayload.devToken = code;` e `:132-136` loga o código. Em produção, se a chave faltar (ou for removida por engano), qualquer pessoa que souber o código da OS ganha acesso direto ao rastreio sem ter o e-mail. O front ainda renderiza o código (`RastreioClient.tsx:328-335`).
- **Corrigir:** só em `NODE_ENV === 'development'`; em produção sem chave → erro 503. Remover do front.

#### F-07 — Signup pode escolher empresa e papel · **Crítica\*** **[verificar no banco]**
- `schema.sql:506-509`: ramo "legado" usa `raw_user_meta_data->>'company_id'` e `->>'role'`. `raw_user_meta_data` é controlado pelo cliente em `supabase.auth.signUp({options:{data}})` → qualquer um entra como `admin` de qualquer empresa cujo UUID conheça. A migration `add_invites_table_and_trigger.sql:70-77` reescreve a função sem esse ramo, mas `schema.sql` (que parece ser a "fonte da verdade") ainda o contém.
- **Corrigir:** conferir `pg_get_functiondef('public.handle_new_user'::regproc)`; atualizar `schema.sql`; nunca derivar `company_id`/`role` de metadata. Se o ramo estiver ativo, tratar como incidente (auditar `profiles` por admins inesperados).

#### F-08 — Trial infinito · **Alta**
- `schema.sql:196-201`: `is_company_read_only` só bloqueia `canceled` e `past_due`+5 dias; `trialing` (default de toda empresa nova, `subscription_expires_at` nulo) **nunca** bloqueia. Duplicado em `CompanyContext.tsx:136-146`. Resultado: quem se cadastra usa grátis para sempre; nenhum job muda `trialing → past_due`.
- **Corrigir:** gravar `trial_ends_at` (ex.: `now()+14d`) no `handle_new_user`; em `is_company_read_only` tratar `trialing AND now() > trial_ends_at` como somente-leitura; job (pg_cron/Vercel cron) para expirar trials; mostrar contagem regressiva no painel.

#### F-09 — RLS não considera papel (viewer/técnico) · **Alta**
- Todas as políticas `write_*` (`schema.sql:329-421`, `:732-809`) checam só `company_id` + adimplência. Um `viewer` (recepcionista) ou técnico pode, pelo REST, apagar clientes, OS, estoque, serviços, alterar valores e marcar pagamentos. `company_expenses` (`add_expenses_table.sql:17-27`) é legível/gravável por todos os papéis; o financeiro só é "protegido" por redirect no cliente (`financeiro/page.tsx:254-258` — e `fetchData()` roda antes do redirect), `usuarios/page.tsx:137`, `settings/team/page.tsx:80`. Técnicos "só veem suas OS" apenas por filtro no browser (`useDashboardData.ts:213-216`).
- **Corrigir:** função `public.my_role()` (`STABLE SECURITY DEFINER`) e políticas por papel: viewer = SELECT; técnico = UPDATE nas OS atribuídas/da empresa mas sem DELETE/valores; admin = tudo; financeiro e despesas só admin. Testar com `pgTAP` ou com os clientes de teste (seção 3).

#### F-10 — Estoque devolvido em dobro · **Alta**
- `orders/page.tsx:241-275` (exclusão em lote): restaura estoque manualmente (`:243-262`) e em seguida `DELETE service_order_items` — o trigger `handle_inventory_change` (`add_inventory_auto_decrement.sql:27-32`, AFTER DELETE) devolve **de novo**. A RPC `delete_service_orders_batch` (`20260723_...sql:33-49`) repete o mesmo erro. O diálogo de `OrderDetailsClient.tsx:392-393` diz que as peças "não voltam", mas o `ON DELETE CASCADE` dispara o trigger e elas voltam. Além disso a exclusão devolve estoque de OS já `Finalizado` (peça consumida) e apaga receita paga sem trilha.
- **Corrigir:** remover toda restauração manual (deixar só o trigger, ou só o código); exclusão de OS vira **soft delete** (`deleted_at`), proibida quando `pago`/`Finalizado`; devolução de estoque só em cancelamento/remoção de item de OS ainda não consumida.

#### F-11 — Itens regravados sem transação; total vindo do browser · **Alta**
- `OrderDetailsClient.tsx:339-363`: `DELETE` de todos os itens e `INSERT` um a um, sem checar `error` (falha no meio = itens perdidos, estoque já devolvido pelo trigger, total gravado). `useOrderForm.ts:621-639` idem na criação. O total (`useOrderForm.ts:279-288,570-572`; `OrderDetailsClient.tsx:110-117,323-325`) é calculado em JS e gravado como veio; nada no banco recalcula `total_value`. Quem usa a API REST grava qualquer total. `GREATEST(0, quantity - n)` (`add_inventory_auto_decrement.sql:12`) esconde overselling em vez de falhar (o `CHECK quantity >= 0` nunca dispara).
- **Corrigir:** RPC `save_order(order jsonb, items jsonb, services jsonb)` transacional, que valida pertencimento ao tenant, **recalcula** `service_value/discount/total_value` e bloqueia estoque insuficiente (`SELECT ... FOR UPDATE`); remover `GREATEST`. Guardar em `service_order_items` o `unit_cost` e `unit_price` no momento (F-16).

#### F-12 — Migrations não reprodutíveis e ordem perigosa · **Alta**
- Vários arquivos **sem prefixo de data** (`add_*.sql`, `batch_delete_orders.sql`, `remove_public_select_policies.sql`, `update_status_constraint.sql`). O Supabase CLI exige `<timestamp>_nome.sql`; na ordem lexicográfica (`2026…` antes de letras) `batch_delete_orders.sql` roda **depois** de `20260723_fix_rpc_security_and_indexes.sql` e **restaura a versão vulnerável** da RPC (sem checar `company_id`, `SECURITY DEFINER`) **[verificar no banco qual está ativa]**.
- `20260718_saas_setup.sql:168-306` faz `DROP/CREATE POLICY` em `services`, `order_services`, `leads` etc. que só são criadas por outras migrations; `add_checklist_templates.sql`/`add_equipment_categories.sql` usam `CREATE TABLE` sem `IF NOT EXISTS`. Banco novo **não sobe** a partir das migrations. `schema.sql` omite `company_expenses`, `os_verifications`, `api_key`, `rate_limit_hits`, `avatar_url`, `whatsapp`, colunas de assinatura/pagamento etc. e ainda traz o `handle_new_user` antigo (F-07).
- **Corrigir:** gerar baseline fiel (`supabase db pull`/`pg_dump --schema-only`), renomear tudo com timestamp, uma migration por mudança, rodar `supabase db reset` no CI contra banco vazio, e **remover `schema.sql`** ou gerá-lo automaticamente.

#### F-13 — Fallback `localStorage` mascara falhas · **Alta**
- `useOrderForm.ts:333-343,362-370,437-445,581-619`: se o `INSERT` falhar (RLS de somente-leitura, CHECK, rede), a OS/cliente/peça é gravada **só no navegador**, a UI mostra sucesso e ainda baixa estoque local. O mesmo padrão em `usuarios/page.tsx:322-335` ("remoção aplicada apenas neste dispositivo" — a pessoa **continua com acesso**), `useDashboardData.ts:345-358`, `OrderDetailsDataFetcher.tsx:17-21`, `CompanyContext.tsx:75-94`, `RastreioClient.tsx:86-98,131-159` (OTP fixo `123456` com `mock-token-id`) e `portal/*`. `companyId` inicial `'mock-tenant-id'` (`useOrderForm.ts:49,550`).
- **Corrigir:** remover todos os ramos `mock-*` do código de produção (mover para fixtures de teste/MSW). Erro de gravação deve **falhar visivelmente** com mensagem acionável (ex.: "conta em somente-leitura").

#### F-14 — Dados fictícios exibidos como reais · **Alta**
- `useDashboardData.ts:117-121`: em períodos > 35 dias sem receita, o gráfico recebe `(idx+1)*200` — **faturamento inventado**. `:133-138,172-174,186`: contagem 28 PJ / 14 PF / 3 estoque baixo e OS de exemplo. `:290,311`: a decisão "mostrar mock" é `company.name !== 'Trust Care T.I.'` — qualquer empresa cujo nome seja o padrão (default do `CompanyContext`) vê números falsos.
- **Corrigir:** remover os mocks; estado vazio explícito ("sem dados no período").

#### F-15 — Datas de pagamento deslocadas por fuso · **Alta**
- `OrderDetailsClient.tsx:71,329,451`, `MarkAsPaidModal.tsx:43,56`, `AddExpenseModal.tsx:84,86`: `new Date('2026-10-01').toISOString()` = `2026-10-01T00:00:00Z` = **30/09 21:00 em Brasília**. Os filtros (`financeiro/page.tsx:375-380`, `useDashboardData.ts:79`, `.split('T')[0]`) comparam em horário local/UTC de forma inconsistente: pagamentos do dia 1º caem no **mês anterior**. Os próprios modais mostram `toDateInput(new Date(payment_date))` em horário local (`MarkAsPaidModal.tsx:43`) → ao reabrir, aparece **um dia antes**, e salvar de novo recua mais um dia. O comentário `:18` mostra que o problema é conhecido, mas só metade foi tratada.
- **Corrigir:** coluna `payment_date DATE` (ou `timestamptz` com meio-dia local) e enviar a string `YYYY-MM-DD` sem conversão; consultas de período por `date`/`at time zone 'America/Sao_Paulo'`; centralizar em `lib/utils/dates.ts` com testes de virada de mês.

#### F-16 — Custo e margem incorretos · **Alta**
- `financeiro/page.tsx:136-145,269` calcula custo via `products_inventory.cost_price` **atual**: editar o custo da peça reescreve o lucro histórico; item removido/produto apagado (`ON DELETE CASCADE` em `service_order_items.product_id`, `schema.sql:166`) some do custo; OS cancelada perde os itens (`add_auto_restock_on_cancel.sql:15-17`).
- `useOrderForm.ts:425`: no cadastro rápido de peça `cost_price = sale_price * 0.6` — custo **inventado** que alimenta o lucro.
- Mão de obra (`service_value`, `order_services`) não tem custo; despesas recorrentes sem competência/pago.
- **Corrigir:** colunas `unit_cost`/`unit_price` em `service_order_items` preenchidas por trigger no INSERT; `cost_price` obrigatório no cadastro rápido (sem default 60%); em cancelamento **manter** os itens (marcar `released=true`) em vez de apagar.

#### F-17 — Cálculos no browser com corte silencioso em 1000 linhas · **Alta**
- `financeiro/page.tsx:264-271`, `useDashboardData.ts:205-211,270`, `orders/page.tsx:132-133`: `select(...)` sem filtro de período, sem `range()`/`limit()`; o PostgREST do Supabase corta em `max_rows` (padrão 1000) **sem erro**. A partir da 1001ª OS os KPIs, pendentes e recebidos ficam errados sem aviso. Também `select('*')` traz `client_signature` (base64) e `media` de todas as OS. `totalClients` conta com `select('type')` (mesmo corte, `useDashboardData.ts:270-273`).
- `useDashboardData.ts:275`: `.lt('quantity', 'min_stock_alert')` compara com a **string** `'min_stock_alert'`, não com a coluna → contagem de estoque baixo errada/erro.
- **Corrigir:** agregar no banco (views/RPC `financial_summary(from,to)` com `SUM`/`COUNT`), listas paginadas por cursor, `select` com colunas explícitas, `count: 'exact', head: true` para totais.

#### F-18 — Regras de status da OS inexistentes · **Alta**
- `OrderDetailsClient.tsx:415-442,544-560` + `lib/design/status.ts:103-114`: qualquer status pode ir para qualquer outro — `Finalizado → Em Análise`, `Cancelado → Em Execução`, pular `Aprovado`, `Em Execução` sem orçamento, criar OS já `Finalizado` (`useOrderForm.ts:34`, select de status). Não há CHECK/trigger de transição.
- `Cancelado` apaga os itens (trigger) e **não são recriados** ao reabrir; pagamentos já registrados não são tratados (sem estorno).
- Caminhos divergentes: o kanban do dashboard (`useDashboardData.ts:334-344`) muda status **sem** modal de pagamento e **sem** notificação; `Finalizado` exige `pago=true` (`OrderDetailsClient.tsx:444-455`) → impossível entregar "a prazo"; `payment_status='parcial'` existe no CHECK (`add_financial_module.sql:9`) mas nada grava.
- Status legados espalhados: `'Novo'` (`OrderDetailsClient.tsx:64`), `'Entregue'` (`:416,585`, `useDashboardData.ts:78,107,154`, `financeiro/page.tsx:84`) não existem no CHECK; `STATUS` (`status.ts:63-87`) mistura leads, aliases e OS.
- `analysis_started_at` só é preenchido em `BEFORE UPDATE` (`add_analysis_started_at.sql:25-27`): OS criadas já em `Em Análise` (default) ficam com `NULL` → `SlaTracker` sem base (`orders/page.tsx:556,639`).
- **Corrigir:** tabela `order_status_transitions` ou trigger `BEFORE UPDATE OF status` com matriz de transições permitidas; só `approve_budget_by_client` (ou admin com justificativa) pode ir a `Aprovado`; `Finalizado` exige itens/valor e permite pagamento pendente/parcial; histórico `order_status_history(order_id, from, to, by, at)`; um único serviço `changeOrderStatus()` (RPC) usado por kanban, detalhe e API v1.

#### F-19 — Aprovação de orçamento sem amarração · **Alta**
- `add_signature_and_aprovado_status.sql:85-112` (`approve_budget_by_client`): anon com o UUID aprova; `client_ip` e `client_name` vêm do cliente (IP obtido em `OrcamentoClient.tsx:227-233` via `api.ipify.org`, fallback `'0.0.0.0'` — **falsificável**); `signature_base64` é `TEXT` sem limite/validação de formato; sem rate limit; sem user-agent, sem hash do conteúdo aprovado. Depois de `Aprovado`, a equipe ainda pode editar itens e `total_value` (F-11) → o cliente assinou um valor e a OS passa a ter outro. A tela se vende como "juridicamente auditável" (`contexto_mvp.md` §E).
- **Corrigir:** aprovar via route handler/RPC que capture IP e User-Agent no servidor (`x-forwarded-for`), grave `approved_total` + hash SHA-256 do snapshot (itens, valores, termos); limitar assinatura (≤ 200 KB, `data:image/png;base64`); bloquear edição de itens/valores após `Aprovado` (nova versão exige nova aprovação); confirmar identidade com o mesmo OTP do rastreio.

#### F-20 — Portal do cliente sem autenticação real · **Alta**
- `proxy.ts:57,85-89` libera `/portal/dashboard` com o cookie `portal-session-mock=true`, **inclusive em produção** (só o mock do admin é restrito a `isDev`, `:60-61`). `portal/page.tsx:37-62` "autentica" consultando `clients` com a chave anon (bloqueado pela RLS → cai no `localStorage`, `:51-62`) e grava o cookie no browser (`:69-70`); `portal/dashboard/page.tsx:46-60` busca `service_orders.*` pelo `client_id` guardado no `localStorage`. Na prática: o portal **não funciona com RLS ativa** e, se alguém "abrir" a RLS para fazê-lo funcionar, vira IDOR por `client_id` e CPF+e-mail adivinháveis.
- **Corrigir:** autenticar via OTP por e-mail (reusar `os_verifications` ou Supabase magic link para `clients`), sessão assinada (JWT/cookie `httpOnly`), e RPC/route handler server-side que devolve só as OS do cliente autenticado. Remover os cookies `*-mock` do `proxy.ts`.

#### F-21 — Rastreio: injeção, enumeração e OTP fraco · **Alta**
Em `app/api/rastreio/request-token/route.ts`:
- `:41,48`: `.or(`codigo_os.eq.${cleanId},id.eq.${cleanId}`)` interpola entrada não sanitizada em filtro PostgREST. Vírgula/parêntese permitem injetar condições (ex.: `abcdefgh,id.neq.00000000-0000-0000-0000-000000000000`) → retorna **qualquer** OS. O ramo `ilike %x%` (`:45-48`) casa múltiplas OS e o código usa `orders[0]` (`:58`) — o OTP vai para o e-mail de uma OS arbitrária e revela `maskedEmail` de terceiros.
- `:38-49` busca **global** entre tenants; `subdomain` é lido (`:30`) e **ignorado**.
- `:31`: `searchId.trim()` antes de validar → `TypeError` → 500 com `err.message` (`:153`).
- `:68`: OTP com `Math.random()` (não criptográfico). Cada token tem 5 tentativas (`verify-token/route.ts:4,47`), mas o atacante pode pedir tokens novos sem limite além do rate limit por IP (30/min), e o IP vem de `x-forwarded-for` (`:20-21`, falsificável) e **falha aberta** se a RPC errar (`:22-28`: `allowed === false` é a única condição de bloqueio). Espaço de 10⁶ → força bruta viável.
- `:107`: `client.name` vai sem escape no HTML do e-mail.
- `verify-token/route.ts:52-57`: leitura-incremento-gravação de `attempts` sem atomicidade (corrida permite >5 palpites paralelos); comparação do código não é de tempo constante.
- **Corrigir:** validar `searchId` com regex estrita (`^TC-\d{4}-\d{4}$` ou UUID) antes de qualquer query; usar `.eq()` encadeado (nunca `.or` com string interpolada); exigir `company_id`/subdomínio resolvido no servidor; `crypto.randomInt(0, 1_000_000)`; `UPDATE os_verifications SET attempts = attempts+1 ... RETURNING` atômico; hash do código no banco; invalidar tokens anteriores da mesma OS ao emitir um novo; limite por OS **e** por IP (usar `x-real-ip`/IP da plataforma, fail-closed); sempre responder o mesmo texto (não revelar existência/e-mail mascarado).

#### F-22 — XSS armazenado · **Alta**
- `dangerouslySetInnerHTML` com HTML cru: `RastreioClient.tsx:424` (`reported_problem`) e `:570` (`technical_report`), `portal/dashboard/page.tsx:204`. O conteúdo é HTML do Quill, mas também pode entrar por `POST /api/v1/orders` (`reported_problem` livre, `route.ts:64-77`) ou por qualquer técnico/viewer (F-09). Executa no navegador do **cliente final** no domínio do app.
- **Corrigir:** sanitizar na saída com DOMPurify (allowlist de tags do Quill) ou renderizar Delta/markdown; sanitizar também na entrada da API v1; adicionar CSP (`next.config.ts` hoje não define headers).

#### F-23 — Storage · **Alta**
- `company-logos`: `schema.sql:699-706` permite `INSERT`/`DELETE` a **qualquer** `authenticated`, em qualquer caminho, com `upsert: true` (`settings/company/page.tsx:117-119`) → um tenant sobrescreve/apaga o logo de outro (que aparece em orçamentos e PDFs). Como o `SELECT` é público, a listagem revela os caminhos.
- `os-media` é **público** (`schema.sql:668-673`; `20260720_p2:56-61`): fotos do aparelho/cliente acessíveis por URL sem expiração; o upload não valida tipo nem tamanho (`OrderDetailsClient.tsx:221-224`: extensão vem do nome do arquivo, `upsert:true`) → HTML/SVG servidos do domínio Supabase. Há políticas **duplicadas e conflitantes** de INSERT/DELETE (`schema.sql:676-688` vs `p2:47-71`); como são permissivas, vale a mais frouxa. `can_upload_to_os_media` confia em `metadata->>'size'` informado pelo cliente.
- **Corrigir:** logos por `(storage.foldername(name))[1] = get_my_company_id()::text` em INSERT/UPDATE/DELETE; `os-media` privado com `createSignedUrl` (TTL curto) e URLs assinadas geradas no servidor para rastreio/orçamento; `allowed_mime_types` e `file_size_limit` no bucket; consolidar em uma política por operação.

#### F-24 — `company_expenses` sem UPDATE · **Alta**
- `add_expenses_table.sql:17-27` cria só SELECT/INSERT/DELETE. `AddExpenseModal.tsx:89-95` (editar) e `financeiro/page.tsx:346-350` (encerrar recorrência) fazem `UPDATE`: o Postgres filtra 0 linhas **sem erro**, o código não checa quantidade e mostra "Despesa atualizada"/"Recorrência encerrada" — o usuário acredita que corrigiu e os números do lucro ficam errados. Também sem bloqueio de somente-leitura nem de papel (F-09).
- **Corrigir:** policy `UPDATE` (admin, adimplente) e `.select()` + checagem de `data.length` em todos os `update` do front (o padrão já existe em `OrderDetailsClient.tsx:335-337`).

#### F-25 — Cota de técnicos e último admin · **Alta**
- `schema.sql:269-302`: trigger só `BEFORE INSERT ON profiles`. `usuarios/page.tsx:283-285` faz `UPDATE profiles SET role` — viewer → técnico/admin sem recontar. A checagem de limite no front (`usuarios/page.tsx:196-197`) usa lista local e `maxTechnicians` duplicado (`CompanyContext.tsx:149-154`). Sem proteção para remover/rebaixar o **último admin** (`:283,322`) — empresa fica sem administrador. Remover o perfil (`:322`) não revoga o usuário no Auth; `UserContext.tsx:88-97` ainda trata "usuário sem perfil" como `admin` na UI.
- **Corrigir:** estender o trigger a `BEFORE INSERT OR UPDATE OF role, company_id`; impedir rebaixar/apagar o último admin; remoção desativa (`active=false`) e revoga sessões (`auth.admin.signOut`) via route handler; trocar o fallback de papel por "sem acesso".

#### F-26 — Numeração `codigo_os` · **Alta**
- `schema.sql:616-660`: (a) sequência **global** — o contador conta OS de todas as empresas (`WHERE codigo_os LIKE 'TC-yyyy-%'` sem `company_id`), logo cada tenant vê saltos e deduz o volume dos outros; `codigo_os` é `UNIQUE` global; prefixo `TC-` fixo. (b) Corrida: `SELECT último` + `INSERT` sem lock; duas criações simultâneas geram o mesmo código → violação de unique (23505) que **não** cai no `EXCEPTION` (ocorre fora da função) → "Erro ao criar OS" (e, pelo F-13, cai no mock). (c) Após `9999`, `substring(... from 9 for 4)` e a ordenação textual (`'TC-2026-9999' > 'TC-2026-10000'`) travam a sequência. (d) O fallback `TC-yyyy-ERR-xxxx` (`:650-654`) ordena **depois** dos números; na próxima inserção `last_code` é `ERR-…`, o `::integer` falha e todos os códigos seguintes viram `ERR` — uma única exceção contamina a numeração para sempre.
- `os-numbering-payment.md` descreve outro formato (`TC-YYMM-XXXX`, status "Entregue") — documentação divergente.
- **Corrigir:** tabela `company_counters(company_id, year, next_val)` com `UPDATE ... RETURNING` (lock de linha), `UNIQUE(company_id, codigo_os)`, prefixo e formato configuráveis por empresa (seção 4), sem `WHEN OTHERS` silencioso.

#### F-27 — API pública `/api/v1/orders` · **Média**
- `route.ts:5-22`: chave em **texto puro** (`companies.api_key`, `p3_api_keys.sql:9`), comparada com `eq` (sem hash, sem tempo constante); sem rate limit; sem checar plano/assinatura/somente-leitura (usa service role, então um tenant inadimplente continua escrevendo); sem rotação nem UI para ver/gerar (nenhuma referência a `api_key` em `app/`).
- `:64-75`: `client_id` não é validado contra `companyId` (permite OS apontando para cliente de outro tenant); `status` livre (cria OS direto em `Finalizado`); `reported_problem` sem sanitização (F-22); `GET` sem paginação (`:35-39`); `err.message` devolvido (`:48,98`).
- **Corrigir:** tabela `api_keys(id, company_id, key_hash, prefix, scopes, last_used_at, revoked_at)`, mostrar a chave uma vez; validar `client_id` com `.eq('company_id', companyId)`; paginação; rate limit; gate por plano.

#### F-28 — Isolamento por subdomínio só no front · **Média**
- `OrcamentoClient.tsx:174-186` compara o subdomínio depois de receber os dados (e só se `activeSubdomain` existir); `get_public_budget_details` não filtra tenant. `proxy.ts:22-24` define `x-tenant-subdomain`, mas **nada o lê** (e o cabeçalho enviado pelo cliente atravessa quando não há subdomínio — spoofável). Não existe UI para definir `companies.subdomain` (nenhuma ocorrência em `settings/company`).
- **Corrigir:** resolver o tenant no servidor (header do `proxy.ts` sobrescrito/limpo, lido em RSC/route handlers) e filtrar por `company_id` em toda consulta pública; UI de subdomínio com validação/unicidade/lista de reservados.

#### F-29 — Backdoor e papel por `localStorage` · **Média**
- `login/page.tsx:55-64`: `admin@admin.com / admin123` grava `os-session` com `role: 'admin'` e cookie mock; a mensagem de erro anuncia a credencial (`:78`). `UserContext.tsx:44-62` confia em `localStorage['os-session']` para definir o papel — qualquer usuário (inclusive `viewer`) pode digitar no console `localStorage.setItem('os-session', '{"role":"admin"}')` e ver a UI de admin (a RLS atual não impede o resto — F-09). O `proxy.ts` só aceita o cookie mock em `development`, o que limita o dano no servidor, mas não na UI.
- **Corrigir:** remover o ramo mock do código de produção (build com flag), nunca derivar papel do `localStorage`.

#### F-30 — Open redirect · **Média**
- `api/auth/callback/route.ts:8,40`: `NextResponse.redirect(`${origin}${next}`)` com `next=@evil.com` vira `https://app.com@evil.com`; `next=.evil.com` vira `https://app.com.evil.com`. Usado em login Google e recuperação de senha.
- **Corrigir:** aceitar só caminhos relativos: `next.startsWith('/') && !next.startsWith('//')`, ou allowlist.

#### F-31 — Webhook Asaas · **Média**
- `webhooks/asaas/route.ts:11` compara o token com `!==` (não constante). `:91-97`: `PAYMENT_DELETED`/`PAYMENT_REFUNDED` **cancelam a assinatura inteira** imediatamente — apagar uma cobrança avulsa/duplicada derruba o tenant. Sem idempotência nem ordenação: um `PAYMENT_OVERDUE` atrasado após `PAYMENT_RECEIVED` volta o tenant a `past_due`. `:71-72,79`: data inválida → `RangeError` → 500 e Asaas reenvia. `:117`: troca de plano em qualquer evento. Acesso renovado por `dueDate + 30` fixo, não pelo ciclo da assinatura.
- **Corrigir:** `crypto.timingSafeEqual`; tabela `billing_events(asaas_event_id unique)` para idempotência; mapear `PAYMENT_DELETED` só para a fatura (não para a assinatura); definir validade pelo `nextDueDate` da assinatura; validar `payload` com zod.

#### F-32 — Backoffice · **Média**
- `proxy.ts:66-72`: super-admin é `user.email === 'lsp3037@gmail.com'` (e-mail fixo no código, sem exigir e-mail verificado nem MFA). `backoffice/page.tsx:9-21` usa **service role** sem validar a sessão na própria página (depende 100% do `matcher` do proxy; qualquer mudança nele expõe todos os tenants). `layout.tsx` importa `supabase` e `redirect` sem usar.
- **Corrigir:** papel `platform_admin` em `app_metadata` (não editável pelo usuário) + checagem na página/route handlers (defesa em profundidade); exigir `email_confirmed_at`/MFA; log de auditoria de acessos.

#### F-33 — Rate limit · **Média**
- `p1_setup.sql:12-14`: `INSERT ... WITH CHECK (true)` permite que **anon** insira linhas arbitrárias em `rate_limit_hits` via REST (envenenar o contador de um IP-alvo = negar rastreio a ele, ou inchar a tabela). `check_and_clean_rate_limit` (`:17-40`) faz `DELETE ... WHERE created_at < ...` a **cada** chamada (índice só em `(ip,path,created_at)`) e é executável por anon. `api/rate-limit/route.ts:27,40` e `lib/utils/rateLimit.ts:19-21`: fail-open. Todos os usos derivam o IP de `x-forwarded-for` (primeiro valor, falsificável). `api/rate-limit` não é usado como barreira real (o cliente é quem chama).
- **Corrigir:** remover a policy de INSERT para anon; limpeza por cron; limitar no edge (Vercel Firewall/Upstash) com IP real da plataforma; fail-closed nas rotas sensíveis.

#### F-34 — Total errado no e-mail · **Média**
- `OrderDetailsClient.tsx:299` usa `order?.total_value` (estado carregado ao abrir a tela); `handleSaveChanges` chama `triggerWebhook` (`:365-367`) **sem atualizar** `order`. O cliente recebe "Orçamento pronto — Valor Total R$ X" com o valor **anterior** à edição.
- **Corrigir:** enviar o valor recém-gravado (`updatedOs[0].total_value`) — ou, melhor, F-02: o servidor lê do banco.

#### F-35 — Bloqueio por inadimplência esconde os dados · **Média**
- `(dashboard)/layout.tsx:509-523`: `isReadOnly || canceled` troca **todo** o conteúdo por `SubscriptionBlockedScreen`; o banner promete "modo apenas-leitura", mas o cliente não consegue nem ler/exportar os próprios dados (LGPD, portabilidade). A regra existe em três lugares (`is_company_read_only`, `CompanyContext.tsx:136-146`, `layout`).
- **Corrigir:** manter leitura/exportação (CSV/backup) liberadas, bloquear só escrita; expor `is_read_only` via uma view/RPC única.

#### F-36 — Funções SECURITY DEFINER · **Média**
- Nenhuma função define `SET search_path` (`get_my_company_id`, `is_company_read_only`, `handle_new_user`, `check_and_clean_rate_limit`, RPCs públicas…) — risco de *search_path hijacking*. `get_my_company_id()` (`schema.sql:180-183`) não é `STABLE` e é chamada por linha nas policies → plano ruim em tabelas grandes. `delete_service_orders_batch` e `handle_os_cancel_restock` (`SECURITY DEFINER`) ignoram papel e somente-leitura.
- **Corrigir:** `SET search_path = public, pg_temp`; `STABLE`; nas policies usar `(select public.get_my_company_id())`; `REVOKE EXECUTE ... FROM PUBLIC` e conceder só ao necessário.

#### F-37 — Políticas permissivas duplicadas · **Média**
- `add_leads_table.sql:33-37` cria `FOR ALL` só por `company_id`, **somado** (OR) ao `write_leads` com bloqueio de inadimplência (`20260718_saas_setup.sql:298-306`): tenant inadimplente continua escrevendo em leads. Padrão repetido nas políticas `manage_*` originais de `checklist_templates`/`equipment_categories` (`add_checklist_templates.sql:16-18`, `add_equipment_categories.sql:12-14`) se a ordem de aplicação for diferente da esperada (F-12). `add_signature_and_aprovado_status.sql:33-34` cria `public_select_service_orders USING (true)` (removida depois por `remove_public_select_policies.sql`; depende de ordem alfabética `a` < `r`).
- **Corrigir:** auditar `pg_policies` e deixar **uma** política por (tabela, operação, papel).

#### F-38 — Chave de API exposta a todos os papéis · **Média**
- `CompanyContext.tsx:51-54`: `companies.select('*')` no browser; `select_company` (`schema.sql:306-307`) permite a qualquer membro. `api_key`, `asaas_customer_id`, `asaas_subscription_id` ficam no navegador de viewer/técnico. Com a chave dá para criar OS contornando RLS e papéis (F-27).
- **Corrigir:** selecionar colunas explícitas; mover `api_key`/ids Asaas para tabela só de admin/service role.

#### F-39 — `generateMetadata` com `params` síncrono · **Baixa**
- `app/(public)/orcamento/[id]/page.tsx:6,10`: `params: { id: string }` e `const { id } = params;`. No Next 16 o acesso síncrono foi **removido** (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:298`); `id` fica `undefined`, a query falha e o título cai sempre no fallback. Corrigir com `params: Promise<{id:string}>` e `await params` (como em `orders/[id]/page.tsx:5-6`). Aproveitar para trocar o service role por RPC que devolve só o nome da empresa.

#### F-40 — Outras falhas menores · **Baixa**
- Tokens de convite com `Math.random()` (`usuarios/page.tsx:235`, `settings/team/page.tsx:111`) em vez do default seguro do banco (`gen_random_bytes`). Convite não envia e-mail (só copia link); comparação `email = new.email` sensível a caixa (`add_invites…:51-54`); convite inválido cria **nova empresa** silenciosamente (`:62-69`); se a cota estourar, o signup falha com "Database error saving new user".
- `lib/supabase/admin.ts:5-12`: se `SUPABASE_SERVICE_ROLE_KEY` faltar, cai silenciosamente para a chave anon — operações administrativas passam a falhar de forma obscura. Deve lançar erro no boot.
- Dinheiro em `number` de ponto flutuante em todas as somas (`reduce(... Number(total_value))`): erros de centavos; usar centavos inteiros ou `numeric` no banco.
- `financeiro/page.tsx:123-124`: recorrência mensal com `setMonth(+1)` acumula deriva (31/jan → 3/mar → 3/abr…); recomputar a partir da data-base (`addMonths(start, n)`).
- `discount` maior que o subtotal é aceito e o total é "grampeado" em 0 (`useOrderForm.ts:287`); desconto negativo falha no CHECK e cai no mock (F-13). Validar no formulário e no banco (`CHECK (discount <= service_value + itens)` via trigger).
- Sem unicidade de `(company_id, sku)` em `products_inventory`; SKU gerado no browser a partir do estoque carregado (`useOrderForm.ts:401-414`) → duplicados em concorrência.
- Inventário edita `quantity` por valor absoluto (`inventory/[id]/page.tsx:195`) e o trigger não trata `UPDATE` de item: sem **livro de movimentações** não há trilha de por que o saldo mudou. O trigger `handle_inventory_change` (`SECURITY DEFINER`) não verifica que `product_id` pertence à mesma empresa do item.
- CPF/CNPJ: validação só no front (`useOrderForm.ts:308`); `clients.document` sem unicidade nem `CHECK`; `client_number SERIAL` global (`schema.sql:62`).
- `err.message` devolvido ao cliente em rotas API (`notify:91`, `request-token:153`, `checkout:114`, `webhooks:136`); `console.log` com e-mails e OTP (`request-token:133-135`).
- Resposta de `request-token` revela existência da OS e e-mail mascarado (enumeração).
- Landing duplicada em `app/preview/page.tsx` (512 linhas, rota pública sem uso); `app/(dashboard)/dashboard/orders/[id]/temp-print/page.tsx` com nome "temp"; pasta `scripts/` com 13 scripts de correção pontual; docs desatualizadas (`contexto_mvp.md` cita `NEXT_PUBLIC_WEBHOOK_URL`, o código usa `WEBHOOK_URL` no servidor; `os-numbering-payment.md` descreve formato/status que não existem).
- Cobertura de testes mínima: 5 arquivos unitários (formulário, CSV, e-mail simulado, PDF) e 2 specs e2e que **mockam** RPCs (`tests/e2e/fixtures.ts:48,59`). Nada cobre RLS, rotas API, cálculo financeiro, transições de status nem multi-tenant. Não há CI/`npm test` obrigatório no repositório.

---

## 3. Melhorias propostas (priorizadas por impacto × esforço)

Esforço: P = ≤ 1 dia · M = 2–5 dias · G = > 1 semana.

### Faça agora (impacto crítico, esforço pequeno)

| # | Ação | Resolve | Esforço |
|---|---|---|---|
| 1 | Rotacionar senha do banco; limpar histórico; remover scripts com credencial; ativar secret scanning | F-01 | P |
| 2 | Proteger `/api/notify` (sessão + ler dados do banco + escapar HTML + rate limit) | F-02, F-34 | P–M |
| 3 | Desligar simulação de checkout fora de dev; falhar fechado | F-03 | P |
| 4 | Travar colunas de cobrança de `companies` (REVOKE/GRANT por coluna ou trigger) | F-04, F-38 | P |
| 5 | `DROP`/`REVOKE` de `get_public_service_order`; auditar `EXECUTE` de todas as funções | F-05, F-36 | P |
| 6 | Remover `devToken` e logs do OTP em produção; `crypto.randomInt` | F-06, F-21 | P |
| 7 | Conferir `handle_new_user` implantado; atualizar `schema.sql` | F-07 | P |
| 8 | Corrigir `next` do callback e `params` assíncrono | F-30, F-39 | P |
| 9 | Policies de Storage por pasta da empresa; logos e `os-media` | F-23 | P–M |

### Próximas duas semanas (alto impacto, esforço médio)

| # | Ação | Resolve | Esforço |
|---|---|---|---|
| 10 | Baseline de migrations com timestamp + `supabase db reset` no CI | F-12, F-37 | M |
| 11 | RLS por papel (`my_role()`), financeiro só admin, UPDATE de despesas | F-09, F-24, F-25 | M |
| 12 | RPC transacional `save_order`/`change_order_status` com recálculo de total, estoque com lock, matriz de transições e histórico | F-10, F-11, F-18, F-34 | M–G |
| 13 | Remover todos os `mock-*`/`localStorage` de produção e mocks do dashboard | F-13, F-14, F-29 | M |
| 14 | Datas de pagamento sem fuso (`date`) + testes de virada de mês | F-15 | M |
| 15 | Snapshot de `unit_cost`/`unit_price` em `service_order_items`; manter itens no cancelamento | F-16 | M |
| 16 | Financeiro por RPC agregada + paginação/cursores | F-17 | M |
| 17 | Trial com expiração e job; unificar regra de somente-leitura e permitir leitura/exportação | F-08, F-35 | M |
| 18 | Aprovação de orçamento server-side (IP/UA/hash/limites) + lock pós-aprovação | F-19 | M |
| 19 | Portal e rastreio com OTP real, sessão `httpOnly`, validação estrita, tenant resolvido no servidor | F-20, F-21, F-28 | M–G |
| 20 | Sanitização (DOMPurify) + CSP | F-22 | P–M |
| 21 | Numeração por empresa com contador transacional | F-26 | M |

### Depois (qualidade e escala)

| # | Ação | Esforço |
|---|---|---|
| 22 | Chaves de API com hash, escopo, rotação e UI; rate limit na API | M |
| 23 | Asaas real (customer/subscription/webhook idempotente) | G |
| 24 | Livro de movimentações de estoque e auditoria (`audit_log`) | M |
| 25 | Soft delete e retenção para OS/clientes (LGPD: exportar/anonimizar) | M |
| 26 | Suíte de testes: pgTAP para RLS multi-tenant, testes de contrato das rotas API, testes de cálculo financeiro (centavos, fuso, recorrência), e2e sem mock de RPC; CI com `lint + tsc + vitest + db reset` | G |
| 27 | Dinheiro em centavos inteiros (ou `numeric` + biblioteca) em todo o front | M |
| 28 | Observabilidade: Sentry, logs estruturados sem PII, alertas de webhook | M |
| 29 | Limpeza: `scripts/`, `app/preview`, `temp-print`, docs, `as any` | P–M |

---

## 4. Lacunas para virar SaaS (hoje fixo na Trust Care, deveria ser por empresa)

### 4.1 Identidade e comunicação
- **Marca em e-mails:** `TRUST CARE` e texto de rodapé em `lib/services/email.ts:93,96,142`; assunto `... - Trust Care` (`api/notify/route.ts:25`); remetente `Trust Care <noreply@trustcare.com.br>` (`request-token/route.ts:102`) e `onboarding@resend.dev` (`email.ts:18`). Falta: nome/logo/cores/rodapé por empresa, **domínio de envio próprio** (SPF/DKIM por tenant) e templates editáveis.
- **Dados padrão da Trust Care vazam para outras empresas:** `CompanyContext.tsx:35-37,61-63,84-86,118-120` (nome "Trust Care T.I.", telefone `(66) 99999-9999`, e-mail `contato@trustcare.com.br` como fallback), `temp-print/page.tsx:37-39,142-144` (impressão da OS), `OrcamentoClient.tsx:321`, `pdfGenerator.ts:14` (`'TRUST CARE'`), `OnboardingModal.tsx:139-140,179-182` (detecta "primeiro acesso" comparando com esses literais), `useDashboardData.ts:290,311`, `leads/page.tsx:546`, placeholders `(66)…` em registro/empresa.
- **Termos e garantia fixos:** garantia de 90 dias e prazo "2 a 5 dias úteis" em `OrcamentoClient.tsx:513-517` e `pdfGenerator.ts:188-197`; falta texto de termos/garantia/LGPD por empresa (com versão registrada na aprovação).
- **Notificações:** um único `WEBHOOK_URL` global (`api/notify/route.ts:53`) e uma conta Resend; falta integração por tenant (WhatsApp Cloud API/Evolution, SMTP próprio), escolha de eventos e templates por status.
- **Subdomínio/domínio:** coluna `companies.subdomain` existe, mas **não há UI** para defini-lo, nem domínio customizado; `getSubdomain` (`lib/utils/subdomain.ts`) tem regras fixas para `vercel.app`/`trustcare`; tema/logo públicos (rastreio/orçamento) por tenant não existem (`RastreioClient.tsx:224,599` são "TrustCare").

### 4.2 Regras de negócio configuráveis
- **Numeração da OS:** prefixo `TC-`, formato `TC-YYYY-XXXX`, reinício anual e 4 dígitos fixos no trigger (`schema.sql:616-660`) → prefixo, padrão, zeros e contador por empresa.
- **Fluxo/status da OS:** 10 status no `CHECK` (`add_signature_and_aprovado_status.sql:9-21`), em `OS_STATUS_FLOW` e em `status.ts`. Cada assistência tem etapas diferentes (ex.: "Aguardando Cliente", "Em Garantia", "Retrabalho"). → tabela `order_statuses(company_id, key, label, tone, order, is_final, notifies, requires_payment…)` + `order_status_transitions`.
- **SLA:** 72 h fixas (`SlaTracker.tsx:12`) → SLA por empresa/prioridade/categoria.
- **Prioridades, formas de pagamento, categorias de despesa, origem de lead e status de lead:** todos em `CHECK` do banco e duplicados no front (`OrderDetailsClient.tsx:22-30`, `MarkAsPaidModal.tsx:8-16`, `lead-origin.ts`, `add_expenses_table.sql:8`) → tabelas de domínio por empresa (ou JSON de configuração) com padrões iniciais.
- **Checklists padrão por categoria:** palavras-chave em português e listas fixas (`orders/[id]/_components/constants.ts:14-104`); só o template customizado é por empresa. Falta biblioteca de modelos e escolha de "tipo de equipamento" estruturado em vez de reconhecer por nome.
- **Catálogo:** tratamento especial de categorias `'Memória RAM'`/`'SSD'` e geração de SKU `CAT-MAR-001` no front (`useOrderForm.ts:112-131,401-414`); margem de 60% (`:425`). → regras de SKU/campos por categoria configuráveis.
- **Moeda, idioma, fuso, documentos:** `R$`, `pt-BR`, CPF/CNPJ e telefone brasileiro fixos (`email.ts:130`, `financeiro/page.tsx:418-419`, `documentValidation.ts`); `America/Sao_Paulo` implícito. Para vender fora do Brasil/outros fusos: `company.locale/currency/timezone` e i18n.
- **Impostos/NFS-e/comissão de técnico/margem-alvo:** inexistentes.

### 4.3 Multi-tenancy, planos e operação
- **Planos:** limites replicados em 4 lugares (tabela `plans`, `CompanyContext.tsx:149-161`, `checkout/asaas/route.ts:14`, `webhooks/asaas/route.ts:117`) e **preços fixos no front** (`settings/billing/page.tsx:95-99`). → `plans` com preço, limites (técnicos, OS/mês, storage, API, módulos) e *feature flags*; função única `get_entitlements(company_id)`. Limites de OS/mês, clientes e acesso à API não são aplicados.
- **Um usuário = uma empresa** (`profiles.user_id UNIQUE`); consultor/rede não consegue alternar entre empresas; sem filiais/unidades; **só 3 papéis fixos** (admin/técnico/viewer) sem permissões granulares; sem SSO/2FA.
- **Ciclo de vida do tenant:** sem fluxo de trial → pago → cancelamento → exportação/exclusão de dados; sem política de retenção; sem termos de uso/DPA/aceite LGPD no cadastro (`register/page.tsx` não coleta consentimento); sem verificação de e-mail tratada (`setSuccess` sem checar confirmação).
- **Backoffice:** só lista (read-only). Faltam suspender/reativar, trocar plano, impersonar com auditoria, métricas (MRR, churn), ver webhooks de cobrança, `platform_admin` por papel (F-32).
- **Auditoria e conformidade:** sem `audit_log` (quem mudou status/valor/pagamento), sem trilha de acesso ao rastreio, sem exportação de dados do titular.
- **Operação:** sem rate limit por tenant, sem quotas de e-mail/WhatsApp, sem observabilidade por tenant, sem ambientes (preview/staging) com banco separado, sem backups testados/PITR documentado.

---

## 5. Checklist de verificação no banco (somente leitura)

Para confirmar os itens marcados **[verificar no banco]** sem alterar nada (SQL Editor do Supabase, role com `SELECT`):

```sql
-- F-07: ramo legado de metadata ainda ativo?
select pg_get_functiondef('public.handle_new_user'::regproc);

-- F-05/F-36: quem pode executar as funções SECURITY DEFINER?
select p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef;

-- F-12: qual versão de delete_service_orders_batch está ativa? (procure por get_my_company_id)
select pg_get_functiondef('public.delete_service_orders_batch(uuid[])'::regprocedure);

-- F-04/F-09/F-24/F-37/F-23: políticas realmente aplicadas
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname in ('public','storage') order by 1,2,3;

-- F-04: privilégios de coluna em companies
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema='public' and table_name='companies' and grantee in ('anon','authenticated');

-- F-08: tenants em trial sem expiração
select subscription_status, count(*), count(subscription_expires_at) from public.companies group by 1;

-- F-26: contaminação da numeração
select count(*) filter (where codigo_os like '%ERR%') as err_codes from public.service_orders;
```

Também: confirmar no painel do Supabase `max_rows` da API (F-17), se **Confirm email** está habilitado (F-07/F-32/F-40) e se `RESEND_API_KEY`, `ASAAS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `ASAAS_WEBHOOK_TOKEN` estão definidos em produção (F-03, F-06, F-40).
