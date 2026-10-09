# Implementation Plan — correções da auditoria (Trust Care)

Base: `AUDITORIA.md` (IDs `F-xx`). Esforço: P ≤ 1 dia · M 2–5 dias · G > 1 semana.
Regra do plano: **nenhuma migration é aplicada em produção sem antes rodar em branch/staging do Supabase** e sem backup (PITR) confirmado.

## Visão geral

| Fase | Objetivo | Itens | Esforço total |
|---|---|---|---|
| 0 | Conter sangramento (24–48 h) | F-01, F-03, F-04, F-05, F-06, F-07, F-02 (mínimo) | ~2 dias |
| 1 | Base confiável (migrations, CI, RLS) | F-12, F-36, F-37, F-09, F-24, F-25, F-23 | ~1,5 semana |
| 2 | Integridade da OS e do dinheiro | F-10, F-11, F-18, F-15, F-16, F-17, F-26, F-34, F-13, F-14 | ~3 semanas |
| 3 | Superfície pública (rastreio, orçamento, portal, API) | F-19, F-20, F-21, F-22, F-28, F-27, F-30, F-33, F-39 | ~2 semanas |
| 4 | Cobrança e ciclo do tenant | F-08, F-31, F-35, F-38, F-29, F-32 | ~1,5 semana |
| 5 | SaaS configurável | Seção 4 da auditoria | ~4–6 semanas |
| 6 | Qualidade contínua | testes, observabilidade, limpeza (F-40) | contínuo |

Dependências críticas: **Fase 1 (baseline de migrations + CI) antes de qualquer mudança de schema das fases 2–5.** Fase 0 usa SQL pontual e reversível.

---

## Fase 0 — Contenção imediata

Sem refatoração; cada item é pequeno, isolado e reversível.

| # | Tarefa | Arquivos / ação | Aceite |
|---|---|---|---|
| 0.1 | **Rotacionar senha do banco** (F-01) | Supabase → Database → Reset password; atualizar `DATABASE_URL` na Vercel/CI | Senha antiga não conecta |
| 0.2 | Limpar histórico e scripts | Remover `scripts/migrate_services.js`, `scripts/update_status_constraint.js` (e one-offs sem uso); `git filter-repo` no commit `e862464` combinado com a equipe; ativar secret scanning/gitleaks | `gitleaks detect` limpo no histórico |
| 0.3 | Fechar checkout simulado (F-03) | `app/api/checkout/asaas/route.ts:63-88`: simulação só se `NODE_ENV!=='production' && ENABLE_BILLING_SIMULATION==='1'`; senão 503 | Em produção sem chave → 503; teste de rota |
| 0.4 | Travar colunas de cobrança (F-04) | SQL: `REVOKE UPDATE ON companies FROM authenticated, anon; GRANT UPDATE (name,phone,email,logo_url,whatsapp) ...` | `PATCH companies {subscription_plan}` com JWT de admin → 403/ignorado |
| 0.5 | Remover RPC pública de rastreio (F-05) | `DROP FUNCTION get_public_service_order(text,text)`; `REVOKE EXECUTE` das demais funções DEFINER de `anon` que não precisam (ver query da seção 5 da auditoria) | `rpc/get_public_service_order` → 404 para anon |
| 0.6 | OTP fora da resposta (F-06) | `request-token/route.ts:132-148`: `devToken`/log só em `development`; remover bloco em `RastreioClient.tsx:328-335` | Sem `RESEND_API_KEY` em prod → 503 |
| 0.7 | Conferir `handle_new_user` (F-07) | `select pg_get_functiondef(...)`; se tiver o ramo `company_id`, aplicar a versão de `add_invites_table_and_trigger.sql` e auditar `profiles` | Função sem leitura de `company_id`/`role` do metadata |
| 0.8 | `/api/notify` mínimo (F-02) | Exigir sessão (`createServerClient().auth.getUser()`), 401 sem sessão; `escapeHtml` em `email.ts`; ignorar `*_url` do payload (montar no servidor) | `curl` anônimo → 401; HTML injetado sai escapado |
| 0.9 | Checar env de produção | `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_WEBHOOK_TOKEN` definidos; `admin.ts` passa a **lançar erro** sem service role (F-40) | Boot falha se faltar |

**Rollback:** 0.4 → `GRANT UPDATE ON companies`; 0.5 → recriar função do `schema.sql`; demais por revert do commit.

---

## Fase 1 — Base confiável

### 1.1 Baseline de migrations (F-12) · M
1. `supabase db pull` do banco real → `supabase/migrations/<ts>_baseline.sql`.
2. Mover as migrations antigas para `supabase/legacy/` (não executadas); renomear qualquer correção nova com `YYYYMMDDHHMMSS_nome.sql`.
3. Remover `supabase/schema.sql` (ou gerar via `supabase db dump` no CI).
4. CI: `supabase db reset` em banco vazio + `supabase test db`.
5. **Aceite:** banco vazio sobe só com as migrations; `delete_service_orders_batch` na baseline é a versão segura.

### 1.2 Pipeline de CI · P
`.github/workflows/ci.yml`: `npm ci`, `lint`, `tsc --noEmit`, `vitest run`, `supabase db reset`, pgTAP. PR bloqueado se falhar.

### 1.3 Funções e RLS (F-36, F-37, F-09, F-24, F-25) · M
Uma migration por tema:
- **Funções:** `SET search_path = public, pg_temp`; `get_my_company_id()` `STABLE`; policies usam `(select get_my_company_id())`; `REVOKE EXECUTE ... FROM PUBLIC` e conceder só o necessário.
- **Papéis:** `public.my_role()`; reescrever políticas: viewer = SELECT; técnico = SELECT/UPDATE em OS/itens (sem DELETE e sem colunas de valor/pagamento); admin = tudo; `company_expenses` e financeiro só admin.
- **Limpeza de policies duplicadas:** uma por (tabela, operação) — remover `Leads isolation per company` e `manage_*`.
- **Despesas:** policy `UPDATE` (admin, adimplente); front passa a conferir `data.length` em todo `update` (`AddExpenseModal.tsx:89`, `financeiro/page.tsx:346`).
- **Equipe:** trigger `BEFORE INSERT OR UPDATE OF role, company_id` em `profiles` para a cota; impedir remover/rebaixar o último admin; remoção = `active=false` + revogar sessões por route handler; `UserContext.tsx:88-97` sem perfil ⇒ "sem acesso".
- **Testes pgTAP:** viewer não escreve; técnico não deleta; tenant A não lê/escreve B; admin não altera cobrança.

### 1.4 Storage (F-23) · M
- `company-logos`: INSERT/UPDATE/DELETE só em `(storage.foldername(name))[1] = get_my_company_id()::text`.
- `os-media` privado: `createSignedUrl` (TTL curto) no servidor para rastreio/orçamento/portal; `allowed_mime_types`, `file_size_limit`; migração das URLs públicas existentes (`media[].url` → guardar `path`).
- Consolidar políticas duplicadas; `can_upload_to_os_media` usa tamanho real do objeto.
- Front: `OrderDetailsClient.tsx:221-224` valida tipo/tamanho; sem `upsert`.

---

## Fase 2 — Integridade da OS e do dinheiro

Pré-requisito: Fase 1.

### 2.1 Numeração por empresa (F-26) · M
- Tabela `company_counters(company_id, year, next_val)`; trigger usa `UPDATE ... RETURNING` (lock de linha); `UNIQUE(company_id, codigo_os)` no lugar do unique global; sem `WHEN OTHERS`.
- Backfill: recalcular contadores a partir do maior número por empresa/ano; corrigir códigos `ERR`.
- Prefixo/formato vêm de `company_settings` (prepara Fase 5).
- **Aceite:** teste de concorrência (50 inserts paralelos) sem colisão; >9999 funciona.

### 2.2 RPCs transacionais da OS (F-10, F-11, F-34) · G
- `save_order(order jsonb, items jsonb, services jsonb)`: valida tenant, trava estoque (`FOR UPDATE`), **recalcula** subtotal/desconto/total no servidor, upsert de itens, erro se estoque insuficiente.
- Remover `GREATEST(0, ...)` do trigger de estoque; trigger valida que `product_id` pertence à mesma empresa.
- Exclusão de OS vira **soft delete** (`deleted_at`), proibida se `pago`/`Finalizado`; remover restauração manual de estoque (`orders/page.tsx:241-275`) e a RPC em lote duplicada; texto do diálogo (`OrderDetailsClient.tsx:392`) reflete o comportamento real.
- Front: `useOrderForm.ts` e `OrderDetailsClient.tsx` chamam `save_order`; total exibido é prévia, o servidor é a fonte.
- **Aceite:** falha no meio não deixa OS sem itens; excluir lote não altera estoque duas vezes (teste).

### 2.3 Máquina de estados (F-18) · M
- Tabela `order_status_transitions` (ou matriz em trigger `BEFORE UPDATE OF status`) + `order_status_history(order_id, from, to, by, at)`.
- RPC `change_order_status(order_id, to, payment jsonb?)` única para kanban (`useDashboardData.ts:334`), detalhe (`OrderDetailsClient.tsx:415`) e API v1. Regras: `Aprovado` só via aprovação do cliente (ou admin com justificativa); `Finalizado` exige itens/valor e aceita pagamento pendente/parcial; cancelar **mantém** itens (`released=true`) e estorna estoque; reabrir reserva de novo.
- `analysis_started_at` também no INSERT; remover status legados (`Entregue`, `Novo`) do código.
- **Aceite:** matriz coberta por testes pgTAP; kanban e detalhe produzem o mesmo resultado.

### 2.4 Financeiro correto (F-15, F-16, F-17) · G
- **Datas:** `payment_date` → `date` (migration com conversão `at time zone 'America/Sao_Paulo'`); front envia `YYYY-MM-DD` sem `toISOString` (`OrderDetailsClient.tsx:71,329,451`, `MarkAsPaidModal.tsx:43,56`, `AddExpenseModal.tsx:84,86`); `lib/utils/dates.ts` + testes de virada de mês/UTC-3.
- **Custo:** `service_order_items.unit_cost`/`unit_price` preenchidos por trigger no INSERT; backfill com `cost_price` atual (documentar a imprecisão histórica); remover `cost_price = 60%` (`useOrderForm.ts:425`) — custo obrigatório.
- **Pagamentos:** tabela `order_payments(order_id, amount, method, paid_at)`; `payment_status` derivado (pendente/parcial/pago); UI de pagamento parcial e estorno.
- **Agregação no banco:** RPC/views `financial_summary(from,to)`, `receivables`, `expenses_projection(from,to)` (recorrência com `addMonths(base, n)`); listas por cursor; `select` com colunas explícitas; `count` com `head:true`; corrigir `lt('quantity','min_stock_alert')` (`useDashboardData.ts:275`) via view/RPC.
- Unificar definição de "faturamento" (recebido) entre dashboard e financeiro.
- Dinheiro em centavos (`bigint`) nas RPCs novas; front formata.
- **Aceite:** dataset de 5.000 OS dá os mesmos totais que o SQL de referência; pagamento do dia 1º entra no mês correto.

### 2.5 Remover mocks (F-13, F-14) · M
Eliminar todos os ramos `mock-*`/`localStorage` e dados fictícios: `useOrderForm.ts`, `useDashboardData.ts:117-138,172-186,290,311`, `UserContext.tsx`, `CompanyContext.tsx`, `usuarios/page.tsx`, `OrderDetailsDataFetcher.tsx`, `RastreioClient.tsx`, `portal/*`, `leads`, `inventory`, `clients`. Erros de gravação viram mensagens claras (ex.: "conta em somente-leitura"). Fixtures de teste migram para MSW/Playwright.
**Aceite:** `grep -r "mock-" app components lib` vazio; estados vazios explícitos.

---

## Fase 3 — Superfície pública

Pré-requisitos: 1.4 (URLs assinadas), 2.2 (aprovação bloqueia edição).

| # | Tarefa | Detalhe | Esforço |
|---|---|---|---|
| 3.1 | **Rastreio seguro** (F-21, F-28) | Validar `searchId` por regex (`^[A-Z]{2,5}-\d{4}-\d{4,}$` ou UUID); `.eq()` encadeado, nunca `.or()` interpolado; resolver tenant no servidor (header do proxy sobrescrito/limpo) e filtrar por `company_id`; OTP `crypto.randomInt`, guardado com hash; `attempts` incrementado atomicamente (`UPDATE ... RETURNING`); invalidar tokens anteriores da OS; limite por OS e por IP (fail-closed); respostas uniformes | M |
| 3.2 | **Aprovação de orçamento** (F-19) | Route handler/RPC captura IP e User-Agent no servidor; `approved_total` + hash SHA-256 do snapshot (itens, valores, termos versionados); assinatura ≤ 200 KB `data:image/png`; confirmar com OTP; trava edição de itens/valores após `Aprovado` (nova versão ⇒ nova aprovação); remover ipify | M |
| 3.3 | **Portal do cliente** (F-20) | OTP por e-mail → cookie `httpOnly` assinado; route handlers/RPC devolvem só OS do cliente; remover cookies `*-mock` de `proxy.ts:57,85-89` e `portal/*` | M |
| 3.4 | **XSS e headers** (F-22) | DOMPurify (allowlist Quill) em `RastreioClient.tsx:424,570`, `portal/dashboard:204` e na entrada da API v1; CSP, `X-Content-Type-Options`, `Referrer-Policy` em `next.config.ts` | P–M |
| 3.5 | **API v1** (F-27, F-38) | Tabela `api_keys(key_hash, prefix, scopes, last_used_at, revoked_at)`; UI para gerar/revogar (mostrar uma vez); validar `client_id` por `company_id`; status inicial fixo; paginação; rate limit; bloquear se assinatura somente-leitura/plano sem API; `api_key` e ids Asaas saem de `companies` legível pelo front | M |
| 3.6 | **Open redirect** (F-30) | `callback/route.ts`: aceitar só `next` iniciando com `/` e sem `//` | P |
| 3.7 | **Rate limit** (F-33) | Remover policy `insert_hits WITH CHECK (true)`; limitar no edge (Vercel Firewall/Upstash) com IP da plataforma; limpeza por cron; fail-closed nas rotas sensíveis | M |
| 3.8 | **Metadata do orçamento** (F-39) | `params: Promise`, `await params`; trocar service role por RPC que devolve só o nome | P |

---

## Fase 4 — Cobrança e ciclo do tenant

| # | Tarefa | Detalhe | Esforço |
|---|---|---|---|
| 4.1 | **Trial real** (F-08) | `trial_ends_at` no `handle_new_user`; `is_company_read_only` considera `trialing` expirado; cron diário (pg_cron/Vercel) move trials vencidos; contador no painel | M |
| 4.2 | **Somente-leitura de verdade** (F-35) | Layout deixa ler/exportar (CSV/backup); bloqueia só escrita; regra única via RPC/view `company_access_state` consumida por RLS e UI | M |
| 4.3 | **Asaas real + webhook** (F-31, F-03) | Customer + subscription com `externalReference=companyId:planId`; `billing_events(asaas_event_id unique)` para idempotência; `timingSafeEqual`; `PAYMENT_DELETED` só afeta a fatura; validade pelo `nextDueDate`; validação zod; plano só muda por evento confirmado | G |
| 4.4 | **Papel de super-admin** (F-32) | `platform_admin` em `app_metadata`; checagem em página e handlers do backoffice; exigir e-mail verificado/MFA; log de auditoria; remover e-mail fixo de `proxy.ts:66-72` | M |
| 4.5 | **Sem backdoor/papel local** (F-29) | Remover login `admin@admin.com` (`login/page.tsx:55-64`) e leitura de `os-session` (`UserContext.tsx:44-62`) | P (junto de 2.5) |

---

## Fase 5 — SaaS configurável

Pré-requisitos: fases 1–4. Introduz `company_settings` e tabelas de domínio por empresa. Ordem sugerida (cada item entregável sozinho):

1. **Identidade e dados padrão (M):** colunas/JSON de marca (nome, logo, cores, rodapé, contato); remover defaults da Trust Care (`CompanyContext.tsx:35-37,61-63,84-86,118-120`, `temp-print/page.tsx:37-39`, `pdfGenerator.ts:14`, `OnboardingModal.tsx:139-182`, `useDashboardData.ts:290`); onboarding detecta "perfil incompleto" por flag, não por literal.
2. **Subdomínio (M):** UI em `settings/company` com validação, unicidade e lista de reservados; resolução no `proxy.ts`; tema/logo nas páginas públicas; depois domínio customizado.
3. **Numeração (P):** prefixo/padrão/zeros por empresa sobre `company_counters` (2.1).
4. **Status e SLA (G):** `order_statuses` por empresa (chave, rótulo, tom, final, notifica, exige pagamento) + transições; SLA por empresa/prioridade; `status.ts` e `OS_STATUS_FLOW` leem do banco.
5. **Tabelas de domínio (M):** prioridades, formas de pagamento, categorias de despesa, origens/status de lead — com defaults de seed; remover `CHECK` e constantes duplicadas (`OrderDetailsClient.tsx:22-30`, `MarkAsPaidModal.tsx:8-16`, `lead-origin.ts`).
6. **Documentos e termos (M):** termos/garantia/prazo por empresa com versão registrada na aprovação (`OrcamentoClient.tsx:513-517`, `pdfGenerator.ts:188-197`); aceite LGPD/ToS no cadastro.
7. **Comunicação (G):** templates de e-mail por status, domínio de envio por tenant (SPF/DKIM), integração WhatsApp por tenant (substitui `WEBHOOK_URL` global), escolha de eventos, quotas.
8. **Planos/entitlements (M):** `plans` com preço, limites (técnicos, OS/mês, storage, API) e feature flags; `get_entitlements(company_id)` única; remover duplicações (`CompanyContext.tsx:149-161`, `checkout:14`, `webhooks:117`, `billing/page.tsx:95-99`); aplicar limites de OS/mês e API.
9. **Checklists e catálogo (M):** biblioteca de modelos por tipo de equipamento estruturado; regras de SKU/campos por categoria (`constants.ts:14-104`, `useOrderForm.ts:112-131,401-414`).
10. **Locale (M, opcional):** moeda/idioma/fuso por empresa.
11. **Modelo de usuário (G, opcional):** usuário em várias empresas (`profiles.user_id` deixa de ser único → `memberships`), filiais, papéis customizados, 2FA/SSO.
12. **Ciclo de vida e conformidade (G):** exportação e exclusão de dados do tenant, `audit_log` (status, valores, pagamento, acessos ao rastreio), retenção, backups documentados.

---

## Fase 6 — Qualidade contínua

- **Testes:** pgTAP (RLS multi-tenant e papéis), contrato das rotas API, cálculo financeiro (centavos, fuso, recorrência), transições de status, e2e **sem** mock de RPC (Playwright contra branch Supabase).
- **Observabilidade:** Sentry, logs estruturados sem PII (remover `console.log` de OTP/e-mail, `err.message` nas respostas), alertas de webhook/cobrança.
- **Limpeza (F-40):** `scripts/`, `app/preview`, `temp-print`, `as any`, tokens de convite via `gen_random_bytes` (`usuarios/page.tsx:235`, `team/page.tsx:111`), convite inválido não cria empresa nova, unicidade `(company_id, sku)`, `clients.document`, livro de movimentações de estoque, docs atualizadas (`contexto_mvp.md`, `os-numbering-payment.md`).

---

## Ordem de execução e marcos

```
Fase 0 ──► Fase 1 (1.1 baseline + 1.2 CI primeiro) ──► Fase 2 ──► Fase 3
                                   │                       │
                                   └──────► Fase 4 ◄───────┘ (4.1/4.2 podem começar após 1.3)
                                                    └──► Fase 5 ──► Fase 6 (contínua desde a Fase 1)
```

| Marco | Critério de saída |
|---|---|
| M0 | Fase 0 concluída; nenhuma credencial no repositório; rotas críticas fechadas |
| M1 | CI verde com `db reset` + pgTAP; RLS por papel e isolamento entre tenants testados |
| M2 | OS, estoque e financeiro corretos (suite de cálculo + concorrência); zero `mock-*` |
| M3 | Rastreio/orçamento/portal/API sem os achados F-19…F-22/F-27/F-28 |
| M4 | Trial, somente-leitura e Asaas funcionando de ponta a ponta em staging |
| M5 | Segundo tenant real configurado só por painel (marca, subdomínio, status, termos) |

## Riscos e cuidados de rollout

- **Migrações destrutivas** (`payment_date` → `date`, `codigo_os`, soft delete, itens com custo): ensaiar em branch com cópia dos dados; janela de manutenção curta; script de verificação de totais antes/depois.
- **Storage privado** quebra links já enviados por e-mail: manter rota de redirecionamento temporária que gera URL assinada.
- **Remoção de mocks** pode expor erros hoje escondidos (RLS de somente-leitura, CHECK): acompanhar logs na primeira semana.
- **RLS por papel** pode bloquear fluxos usados hoje por técnicos/recepção: mapear com os usuários reais antes e liberar por feature flag.
- **Trial com expiração** afeta contas existentes: definir `trial_ends_at` generoso para quem já usa e comunicar.
- Feature flags (`ENABLE_*`) para ativar em staging → 10% → 100% nas fases 2–4.
