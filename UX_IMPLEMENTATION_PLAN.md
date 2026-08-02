# Trust Care — Revisão de UI/UX do Sistema + Implementation Plan

Escopo: área logada (`app/(dashboard)`, `components/ui`, `components/dashboard`, `components/new-order`).
Fora de escopo: landing page (`app/page.tsx`, `app/preview`) e portal público.

Base do diagnóstico (contagens reais no código, 2026-08-01):

| Métrica | Valor |
|---|---|
| Arquivos `.tsx/.ts` em `app/` + `components/` | 97 |
| Literais `slate-*` (bypass de token) | 674 |
| Literais `emerald-*` (bypass de token) | 332 |
| `text-[9px|10px|11px]` (abaixo do piso de 12px do próprio DS) | 234 |
| `text-xs` | 321 |
| `alert()` / `confirm()` nativos | 43 (em 13 arquivos) |
| `<input>` nativos vs. componente `Input` | 114 |
| `<button>` nativos | 75 |
| Regiões `aria-live` | 0 |
| `animate-pulse` ad-hoc (sem componente Skeleton) | 22 |

---

## 1. Pontos fortes (preservar)

1. **Camada de tokens semântica e bem pensada** (`app/globals.css`). Superfícies em degraus reais (`surface` / `raised` / `sunken` / `overlay`), 3 níveis de texto, rampa de 10 status por *temperatura* (bloqueado = quente, em movimento = frio). Isso é maduro — a maioria dos SaaS não chega aí.
2. **Escala tipográfica com saltos perceptíveis** (7 degraus, `display` → `caption`) e superfamília única IBM Plex com 3 papéis (condensada = display, grotesca = corpo, mono = dado tabular). A regra "mono nunca como display, só dado tabular" é uma decisão de identidade forte.
3. **Sem FOUC de tema**: script inline no `<head>` do `app/layout.tsx` aplica `.light` antes da primeira pintura. Feito certo.
4. **`Modal` acessível de verdade**: foco preso, Esc, retorno de foco ao elemento anterior, `aria-modal`, scroll lock. Raro de ver implementado completo.
5. **Fonte única de status** (`lib/design/status.ts` + `StatusBadge`), eliminando o mapa que vivia duplicado em 7 arquivos.
6. **`EmptyState` com ação** — a página de OS trata vazio-com-filtro e vazio-real com CTAs diferentes. É o padrão correto.
7. **`prefers-reduced-motion`** respeitado globalmente.
8. **Dados tabulares em `font-mono tabular-nums`** — valores, códigos de OS e datas não "dançam" ao atualizar.

---

## 2. Problemas encontrados

### P0 — Quebra funcional ou de confiança

**P0.1 — Glassmorphism é cego a tema: cards somem no modo claro.**
`Card` usa `bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]`. No tema claro o fundo da página é `#f9f9fb` — um branco a 4% sobre branco-acinzentado é invisível, e a borda a 8% de branco também. `Modal` (`border-white/[0.1]`), o `aside` (`bg-slate-900/60`) e o `header` (`bg-slate-950/70`) têm o mesmo problema em graus diferentes. Efeito: **todo o modo claro perde hierarquia de superfície.** O DS ainda documenta essas classes literais como regra, o que propaga o bug.

**P0.2 — 43 `alert()` / `confirm()` nativos como canal de feedback.**
Em OS, clientes, estoque, financeiro, usuários, billing. São diálogos bloqueantes, sem estilo, sem contexto, impossíveis de testar e que quebram o fluxo em mobile. Toda confirmação destrutiva (excluir OS em massa, restaurar estoque) passa por um `window.confirm` genérico. Não existe sistema de toast no projeto.

**P0.3 — Sidebar abre por cima do conteúdo em todo carregamento no mobile.**
`useState(true)` em `sidebarOpen` + drawer `fixed` com backdrop `md:hidden`. Em telas < 768px o usuário abre qualquer página e encontra o menu aberto cobrindo o conteúdo, tendo que fechá-lo manualmente. O estado também não é persistido (tema e modo de visualização são).

**P0.4 — Zero `aria-live`.**
Nenhuma mudança assíncrona (salvar, excluir, atualizar status em massa, erro de rede) é anunciada. Combinado com P0.2, o feedback de sucesso/erro depende inteiramente de diálogos modais nativos.

### P1 — Consistência e escala

**P1.1 — 1.006 literais de cor fora dos tokens** (674 `slate-*` + 332 `emerald-*`). O `globals.css` compensa isso redefinindo as escalas do Tailwind no `.light` — uma gambiarra explicitamente marcada como "legado, remover ao fim da Fase 3" que virou permanente. Enquanto existir, qualquer ajuste de identidade tem que ser feito em dois lugares.

**P1.2 — 234 tamanhos de fonte abaixo do piso de 12px** que o próprio DS estabelece, mais 321 `text-xs` avulsos concorrendo com a escala de 7 degraus. A escala existe mas não é o caminho de menor resistência.

**P1.3 — Título duplicado em toda página.** O header do layout resolve o título por `pathname` (`getHeaderTitle()`) e cada página repete o mesmo texto num `<h1>`. "Ordens de Serviço" aparece duas vezes, a ~60px de distância, custando uma faixa inteira de altura útil.

**P1.4 — Ausência de componentes de composição.** Não existem `PageHeader`, `Toolbar/FilterBar`, `ConfirmDialog`, `Toast`, `Skeleton`, `DropdownMenu`, `Tabs`. Resultado: 10 cabeçalhos de página reescritos à mão, 2 barras de ação em massa com estilos divergentes (`inventory` usa `rounded-xl bg-slate-900/90`, `orders` usa `bg-surface-overlay` sem raio), 22 skeletons ad-hoc e barras de filtro copiadas por página.

**P1.5 — Interação exagerada em elementos pequenos.** `BASE` do `Button` aplica `hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]` a *todos* os botões, incluindo ícones `sm` em célula de tabela — eles pulam ao passar o mouse. O `Card` interativo soma `-translate-y-0.5` + `scale-[0.98]` + `shadow-lg`. O HIG pede deferência: o movimento deve ser proporcional ao peso do elemento.

**P1.6 — CSS global brigando com o componente.** `globals.css` estiliza `input:focus` com borda `slate-500` + `box-shadow`, enquanto `Field.tsx` define `focus:border-brand focus:outline-brand/40 focus:shadow-md`. Dois sistemas de foco no mesmo elemento; o resultado visual é um híbrido não intencional.

### P2 — Refinamento

- **P2.1** — Densidade fixa. Tabelas com `py-3 px-4` sempre; um técnico com 200 OS não tem modo compacto.
- **P2.2** — Tabelas em mobile só têm scroll horizontal. Apenas `orders` oferece modo card; `clients`, `inventory`, `services`, `usuarios`, `financeiro` não.
- **P2.3** — Breakpoints misturados no layout: drawer usa `md:`, botão de recolher usa `lg:flex`, hamburger usa `lg:hidden`, e o handler de fechar usa `window.innerWidth < 768`. Quatro fontes de verdade para o mesmo comportamento.
- **P2.4** — Sem estados de erro de rede na UI. As páginas caem para `localStorage` silenciosamente (`console.warn`) — o usuário vê dados mock achando que são reais.
- **P2.5** — Sem busca global / atalhos de teclado (`⌘K`). Navegar entre OS exige passar pelo menu.
- **P2.6** — `Card` sem `interactive` ainda recebe `onClick` em vários lugares sem `role`/`tabIndex` (o `KpiCard` faz certo; outros não).
- **P2.7** — `ThemeSync.tsx` duplica o script inline do `layout.tsx`. Código morto.

---

## 3. Implementation Plan

Princípio: **primeiro corrigir o que quebra, depois criar os componentes que impedem a regressão, só então migrar as telas.** Migrar telas antes de ter os componentes é o que produziu os 1.006 literais atuais.

### Fase 0 — Correções de quebra (1–2 dias)

| # | Ação | Arquivos |
|---|---|---|
| 0.1 | Trocar o glass literal por tokens conscientes de tema: criar `--color-glass-bg` / `--color-glass-border` no `@theme` e no bloco `html.light`, e substituir `bg-white/[0.04] border-white/[0.08]` por `bg-glass border-glass-border`. | `app/globals.css`, `components/ui/Card.tsx`, `components/ui/Modal.tsx`, `app/(dashboard)/layout.tsx` |
| 0.2 | Atualizar o `DESIGN_SYSTEM.md` para documentar os tokens de glass em vez das classes literais (hoje o documento ensina o bug). | `DESIGN_SYSTEM.md` |
| 0.3 | Sidebar fechada por padrão em telas < 1024px e estado persistido em `localStorage` (`os-sidebar`), lendo no mesmo script inline do tema para não haver salto. | `app/(dashboard)/layout.tsx`, `app/layout.tsx` |
| 0.4 | Unificar breakpoints do layout em `lg` (1024px) e substituir `window.innerWidth` por `matchMedia`. | `app/(dashboard)/layout.tsx` |
| 0.5 | Remover o bloco `input:focus` de `globals.css`; o foco passa a ser exclusivamente do `Field`. | `app/globals.css` |
| 0.6 | Excluir `ThemeSync.tsx` e sua chamada. | `components/ThemeSync.tsx`, `app/layout.tsx` |

**Critério de aceite:** alternar para o tema claro em `/dashboard`, `/dashboard/orders` e num modal — cards e bordas visíveis com hierarquia de superfície preservada. Abrir qualquer página em 390px — conteúdo visível sem interação.

### Fase 1 — Componentes que faltam (3–4 dias)

Todos em `components/ui/`, exportados por `index.ts`.

| # | Componente | Contrato |
|---|---|---|
| 1.1 | `ToastProvider` + `useToast()` | `toast.success/error/info(msg, { action })`. Empilhado no canto inferior direito, `role="status"` + `aria-live="polite"` (erros em `assertive`), auto-dismiss 5s, pausa no hover. Provider montado em `app/(dashboard)/layout.tsx`. |
| 1.2 | `ConfirmDialog` + `useConfirm()` | Promise-based (`await confirm({ title, description, destructive, confirmLabel })`), sobre o `Modal` existente. Substitui todo `window.confirm`. |
| 1.3 | `PageHeader` | `{ title, description, badges, actions, breadcrumb }`. Assume o título hoje duplicado; o `<h1>` vive aqui e o header do layout passa a mostrar só breadcrumb/contexto. |
| 1.4 | `Toolbar` / `FilterBar` | Slot de busca + filtros + toggle de visualização + ações. Extraído do que `orders` já faz melhor. |
| 1.5 | `BulkActionBar` | Unifica as duas barras flutuantes divergentes. `role="toolbar"`, `rounded-[20px]`, contagem em mono tabular. |
| 1.6 | `Skeleton` | `<Skeleton className="h-4 w-28" />` + `SkeletonTable`/`SkeletonCards`. Substitui os 22 `animate-pulse` soltos. |
| 1.7 | `DropdownMenu` | Menu acessível (setas, Esc, foco) para os menus de ação já existentes em Inventory/Clients/Services. |
| 1.8 | `Checkbox` | Hoje são `<input type="checkbox">` crus com classes repetidas em cada tela. |

**Ajustes nos componentes existentes:**
- `Button`: mover `hover:-translate-y-0.5 hover:shadow-md` para apenas `size="lg"` e `variant="primary"`; `sm`/`ghost` ficam só com mudança de cor + `active:scale-[0.97]`. Adicionar `variant="icon"`.
- `Card`: `interactive` sem `translate-y` — só borda + sombra + `active:scale-[0.99]`. Quando recebe `onClick`, garantir `role`/`tabIndex`/`onKeyDown` no próprio componente.
- `Table`: prop `density?: 'comfortable' | 'compact'` e prop `stickyHeader`.

### Fase 2 — Migração das telas (5–7 dias, uma tela por PR)

Ordem por impacto: `orders` → `clients` → `inventory` → `financeiro` → `leads` → `services` → `usuarios` → `agenda` → `settings/*` → `orders/[id]`.

Checklist por tela (o mesmo em todo PR):
1. Substituir `<h1>` manual por `<PageHeader>` e remover o texto duplicado.
2. Substituir `alert()` → `toast`, `confirm()` → `useConfirm()`.
3. Substituir `<input>`/`<button>`/`<table>` nativos pelos componentes de `ui`.
4. Substituir literais `slate-*`/`emerald-*` pelos tokens semânticos.
5. Substituir `text-[10px]`/`text-xs` pelos degraus `text-caption`/`text-small`.
6. Trocar `animate-pulse` ad-hoc por `Skeleton`.
7. Estado de erro de rede visível (banner "sem conexão, exibindo dados locais") em vez de `console.warn` silencioso.
8. Verificação em 390px: tabela vira lista de cards abaixo de `md`.

### Fase 3 — Guarda-corpo (1 dia)

| # | Ação |
|---|---|
| 3.1 | Regra ESLint (`no-restricted-syntax`) proibindo `alert(`, `confirm(`, `prompt(` em `app/**` e `components/**`. |
| 3.2 | Regra ESLint proibindo `className` com `slate-`/`emerald-`/`text-[Npx]` fora de `globals.css`. |
| 3.3 | Script `npm run ds:audit` que reporta as contagens da tabela do topo — a métrica de progresso das Fases 2/3. |
| 3.4 | `DESIGN_SYSTEM.md` ganha seção "Componentes disponíveis e quando usar cada um", com a regra: nova tela não escreve cabeçalho, filtro, confirmação ou skeleton à mão. |

### Fase 4 — Refinamento (opcional, pós-migração)

- Busca global `⌘K` (OS por código/cliente, cliente, produto).
- Toggle de densidade da tabela, persistido por usuário.
- Preferência de tema no perfil (hoje só em `localStorage`, não segue o usuário entre dispositivos).
- Revisão de contraste AA em toda a rampa de status nos dois temas.

---

## 4. Sequência recomendada e métrica

| Fase | Esforço | Bloqueia | Métrica de saída | Status |
|---|---|---|---|---|
| 0 | 1–2 d | — | Modo claro utilizável; mobile sem drawer intrusivo | ✅ concluída |
| 1a | 1 d | — | `Toast` + `ConfirmDialog` + tela de OS migrada como referência | ✅ concluída |
| 1b | 2–3 d | Fase 2 | 6 componentes restantes + 3 ajustados | ✅ concluída |
| 3 | 1 d | — | Auditoria em CI, regressão impossível | ✅ concluída (antecipada) |
| 2 | 5–7 d | — | `alert/confirm` → 0; literais de cor → 0 | ✅ concluída |
| 4 | — | — | — | opcional |

A Fase 3 foi antecipada para antes da 2: com o lint como portão, cada PR de migração se autoverifica.

**Resultado das Fases 0–3 — `npm run ds:audit`:**

| Indicador | Baseline | Final | No dashboard |
|---|---|---|---|
| Diálogos nativos | 39 | **2** | **0** |
| Cores fora dos tokens | 817 | 457 | 0 (fora `temp-print`) |
| Texto abaixo de 12px | 209 | 60 | 0 |
| `text-xs` avulso | 302 | 129 | resíduo |
| `animate-pulse` fora do `Skeleton` | 20 | 8 | 0 |

**O dashboard está zerado.** O que sobra vive fora do escopo da revisão do sistema: telas públicas (`orcamento`, `rastreio`), autenticação (`login`, `register`, `invite`) e a landing.

`temp-print` é exceção permanente e documentada: a via impressa sai em papel branco, então cores claras fixas ali são a decisão certa.

**Telas migradas (11/11):** orders, leads, clients, clients/[id], inventory, inventory/[id], services, usuarios, agenda, financeiro (+5 componentes), settings/* (5 telas), orders/[id].

---

## 5. Sugestão de próximo passo

As telas públicas somam **169 cores fora dos tokens** e são o que o cliente final vê — orçamento e rastreio. Ficaram fora por decisão de escopo, não por estarem certas. Seria a continuação natural.

A Fase 0 é independente e pode ir para produção sozinha. A Fase 1 não altera nenhuma tela — é aditiva e sem risco. O risco real está concentrado na Fase 2, mitigado por ser uma tela por PR com checklist fixo.
