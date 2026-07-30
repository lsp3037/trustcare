# Plano de Implementação — Redesign do Front End

**Data:** 2026-07-29
**Escopo:** `app/`, `components/`, `app/globals.css`
**Objetivo:** eliminar a aparência genérica ("cara de IA") sem regressão funcional, e deixar uma base onde a identidade visual seja alterável em um lugar só.

---

## 1. Contexto

O front end é funcional, mas foi construído tela a tela sem um sistema compartilhado. O resultado agregado tem os sintomas clássicos de layout automático:

| Sintoma | Medição no repo |
|---|---|
| Nenhum componente primitivo | `components/ui/` tem 3 arquivos, nenhum é Button/Card/Badge/Input |
| Botão primário reescrito inline | 20+ arquivos |
| Famílias de cor Tailwind em uso | 14 (slate, zinc, neutral, blue, indigo, sky, red, rose, ...) |
| Valores diferentes para o verde da marca | 4 (`emerald-400/450/500/600`) |
| Fontes carregadas | 4, para 2 papéis reais |
| `rounded-none` | 565 ocorrências |
| Escala tipográfica | 544 `text-xs` + 346 `text-[9/10/11px]` |
| Mapa de cor por status duplicado | 7 arquivos |

A causa raiz é única: **não existe camada de tokens nem de primitivos.** Todo o resto (drift de paleta, inconsistência de espaçamento, hacks no CSS global) é consequência disso. Por isso o plano ataca a base antes da estética.

### 1.1 Achado crítico — classes de cor que não geram CSS

Verificado no CSS compilado (`.next/dev/static/chunks/app_globals_css_*.css`):

O `@theme` em `globals.css` define apenas 6 shades customizados (`slate-850`, `slate-405`, `slate-455`, `slate-350`, `emerald-450`, `rose-450/455`). Mas o código usa **21 shades não-padrão que não estão declarados**. Tailwind v4 não gera utility para eles — as classes são inertes e o elemento herda a cor do pai.

Confirmado como **morto** (0 ocorrências no CSS compilado):

```
text-slate-450  (34×)   text-slate-650  (20×)   text-slate-550  (17×)
text-zinc-550   (10×)   text-blue-450    (9×)   text-slate-250   (4×)
text-zinc-450    (3×)   text-slate-555   (3×)   text-rose-550    (3×)
text-zinc-650    (2×)   text-slate-150   (2×)   text-amber-450   (2×)
bg-slate-750     (2×)   bg-indigo-550    (2×)   border-zinc-650  (2×)
+ rose-650, rose-350, orange-450, indigo-650, blue-550, emerald-555, slate-750, amber-550
```

Total: **~120 usos de classe sem efeito.** Confirmado como **vivo**: `emerald-450`, `slate-850`, `slate-350`, `rose-450` (declarados no `@theme`).

Impacto real, não só cosmético: em `app/(dashboard)/dashboard/orders/[id]/_components/constants.ts:5`, o status **"Em Análise"** usa `text-blue-450` — o badge não tem cor de texto própria. O mesmo vale para os 6 arquivos que duplicam esse mapa.

Isso explica parte da sensação de "achatado": dezenas de elementos que deveriam ter hierarquia de cor estão herdando a mesma cor do container.

---

## 2. Princípio condutor

> A copy do produto já tem voz — específica, do vocabulário de bancada ("Sua bancada sob controle. Seu cliente parou de ligar."). **O visual precisa alcançar a copy, não substituí-la.**

A identidade sai do mundo real da assistência técnica, não de tendência de SaaS: ordem de serviço em papel carbonado (via branca / amarela / rosa), etiqueta de bancada, número de protocolo, carimbo de aprovação, lacre de garantia.

Esse vocabulário já apareceu **uma vez e funcionou**: o ticket perfurado do hero (`app/page.tsx:212-257`). É o único elemento autoral do projeto. O plano o promove de acidente a sistema.

**Regra de contenção:** o artefato-ticket é o elemento memorável. Tudo em volta fica quieto. Nada de segundo efeito competindo.

---

## 3. Fases

Ordenadas por dependência. Fases 0–2 não mudam a aparência (ou só corrigem o que está quebrado) e são pré-requisito para as demais.

---

### Fase 0 — Correções verificáveis
**Risco:** nenhum · **Impacto visual:** corrige o que já está errado

| # | Ação | Arquivo |
|---|---|---|
| 0.1 | Substituir os 21 shades inexistentes pelo vizinho válido mais próximo (`slate-450` → `slate-400`, `slate-650` → `slate-600`, `blue-450` → `blue-400`, etc.) | ~40 arquivos |
| 0.2 | Remover `+14.5%` hardcoded — é um número falso ao lado de números reais | `components/dashboard/KpiOverviewCards.tsx:59` |
| 0.3 | Remover shades órfãos do `@theme` (`slate-405` e `slate-455` têm o mesmo hex; `rose-450`/`rose-455` idem) | `app/globals.css:15-20` |

**Verificação:** `npx tsc --noEmit` + `npm run lint` + varredura confirmando 0 shades não-declarados restantes.
**Nota:** a 0.1 vai *revelar* cores que hoje estão invisíveis. Algumas telas vão mudar de aparência — essa é a correção, não uma regressão.

---

### Fase 1 — Camada de tokens semânticos
**Risco:** baixo · **Impacto visual:** nenhum (mapeamento 1:1)

Problema atual: `bg-slate-950` significa "fundo da página", mas está escrito como um valor de escala. É por isso que o tema claro precisou inverter as escalas (`globals.css:87-173`) e depois precisou de um `.text-white:not(...)` com **20 exceções hardcoded e `!important`** (`globals.css:127-157`) para o texto não sumir dentro dos botões. Esse seletor quebra silenciosamente sempre que alguém usa uma cor de botão nova — já há um `.bg-indigo-550` na lista, que nem existe.

**Ação:**

1. Definir tokens semânticos no `@theme`, com valores para claro e escuro:

```
--color-surface          fundo da página
--color-surface-raised   card, sidebar, modal
--color-surface-sunken   input, célula de tabela
--color-border           divisória padrão
--color-border-strong    divisória de ênfase
--color-text             texto primário
--color-text-muted       secundário
--color-text-subtle      terciário / legenda
--color-brand            ação primária (valor único)
--color-success / --color-warning / --color-danger / --color-info
```

2. Colapsar as escalas de cinza: escolher **uma** (slate **ou** zinc) e migrar zinc/neutral. Concentração atual de zinc/neutral: `app/page.tsx` (68), `orcamento/[id]/OrcamentoClient.tsx` (50), `ChecklistSection.tsx` (31), `AttachmentsSection.tsx` (19), `backoffice/` (25) — 12 arquivos no total, migração contida.

3. Colapsar blue/indigo/sky → `--color-info`; red/rose → `--color-danger`; amber/orange → `--color-warning`.

4. Reescrever o tema claro como troca de valores de token, e **deletar** o `.text-white:not(...)` inteiro. Com token semântico ele deixa de ser necessário.

**Verificação:** conferir as duas temas em Dashboard, OS, Estoque, Financeiro e na landing.

---

### Fase 2 — Primitivos
**Risco:** baixo · **Impacto visual:** unifica o que hoje diverge

Criar em `components/ui/`:

| Componente | Variantes | Substitui |
|---|---|---|
| `Button` | primary, secondary, ghost, danger · sm/md/lg · loading, disabled | botão inline em 20+ arquivos |
| `Card` | padrão, interativo | `bg-slate-900/60 border ... p-6` repetido |
| `Badge` | success, warning, danger, info, neutral | badges inline |
| `StatusBadge` | derivado do `STATUS_CONFIG` | os 7 mapas duplicados |
| `Input` / `Select` / `Textarea` | com label, erro, hint | inputs inline + hacks em `globals.css:71-84` |
| `Modal` | header/body/footer, foco preso, Esc | 6+ modais próprios |
| `Table` | header, row, célula, estado vazio | tabelas inline |
| `EmptyState` | ícone, título, ação | ausente hoje |

**Consolidar o status em um lugar só.** `STATUS_CONFIG` já existe em `orders/[id]/_components/constants.ts`, mas está copiado em `orders/page.tsx:154-168`, `OrderHeader.tsx`, `RecentOrdersTable.tsx` (via `lib/utils/orderStatus`), `clients/[id]/page.tsx`, `rastreio/RastreioClient.tsx`, `settings/billing/page.tsx`. Mover para `lib/design/status.ts` como fonte única e apagar as cópias.

**Verificação:** suíte Vitest existente + Playwright (`tests/`) verdes.

---

### Fase 3 — Migração das telas
**Risco:** médio (volume) · **Impacto visual:** consistência

Migrar para os primitivos, em ordem de tráfego, uma tela por commit:

1. Dashboard (`dashboard/page.tsx` + `components/dashboard/*`)
2. Ordens de Serviço (lista + detalhe + `_components/*`)
3. Novo Pedido (`components/new-order/*`)
4. Estoque, Clientes, Serviços
5. Financeiro
6. Configurações, Usuários, Leads, Agenda
7. Auth, Portal, Rastreio, Orçamento público, Backoffice

Durante a migração, aplicar a escala tipográfica da Fase 4 e uma escala de espaçamento única (múltiplos de 4; hoje há `py-2.5`, `py-3.5`, `gap-2.5`, `gap-3.5` misturados sem critério).

---

### Fase 4 — Tipografia
**Risco:** baixo · **Impacto visual:** alto — é o que mais desfaz o "cara de IA"

**Reduzir de 4 famílias para 2 + 1 utilitária.** Hoje `app/layout.tsx:6-24` carrega Geist, Geist Mono, Inter e JetBrains Mono — Geist e Inter são a mesma grotesca neutra; Geist Mono e JetBrains Mono são a mesma mono.

**Corrigir o uso de mono como display.** O `<h1>` da landing é JetBrains Mono bold uppercase (`app/page.tsx:184`). Mono como display é um dos tiques mais reconhecíveis de design gerado. Mono deve ficar restrito a **dado tabular**: valores em R$, códigos de OS, SKU, datas — onde o alinhamento de dígitos serve a um propósito.

**Definir escala real.** Hoje quase tudo vive entre 9px e 14px. Alvo: 7 degraus com salto perceptível (`display / h1 / h2 / h3 / body / small / caption`), tamanho mínimo de 12px para texto de interface.

Direção proposta (ver decisão pendente D1):
- **Display:** condensada industrial — vocabulário de etiqueta e formulário técnico
- **Corpo:** grotesca legível em tamanho pequeno e denso
- **Dados:** uma mono só

---

### Fase 5 — Identidade e landing
**Risco:** médio · **Impacto visual:** o redesign propriamente dito

**5.1 — Sair do preto puro.** `bg-black` + um accent verde-neon é o preset mais reconhecível de página gerada por IA. Base em grafite/tinta com temperatura, não `#000`.

**5.2 — Promover o artefato-ticket a sistema.** A perfuração, o carimbo rotacionado, a numeração de protocolo, as vias coloridas do papel carbonado viram o vocabulário recorrente: cabeçalho de OS, PDF de orçamento, comprovante do portal do cliente, tela de rastreio. Um artefato, aplicado com consistência.

**5.3 — Quebrar o ritmo da landing.** Hoje `dores`, `manifest` e os blocos de print usam a **mesma estrutura** — eyebrow → h2 → grid 2 colunas de ícone+título+parágrafo — três vezes seguidas. A página repete um bloco em vez de ter ritmo. Dar tratamento distinto a cada uma.

**5.4 — Remover numeração falsa.** `01–04` em "O Problema" (`app/page.tsx:40-65`) e `01–08` em "O Que Vai Na Bancada" (`:82-131`) numeram conteúdo que não é sequência — a ordem não carrega informação. **Manter numeração apenas em "Ciclo da Ordem de Serviço"** (`:67-73`), onde a sequência é real e é a própria informação.

**5.5 — Reduzir o eyebrow.** `text-[10px] emerald uppercase tracking-widest` aparece 6× na landing. Manter no máximo 2 usos, onde marcar a seção realmente ajuda a navegar.

**5.6 — Ícones.** Lucide genérico em quadradinho é o único recurso gráfico de todas as seções. Onde o ícone não distingue nada (8 cards de feature, todos com o mesmo tratamento), ele é ruído — remover ou substituir por algo do vocabulário do 5.2.

**Não mexer:** a copy. É a parte mais forte do projeto.

---

### Fase 6 — Limpeza
**Risco:** nenhum

| Ação | Onde |
|---|---|
| Remover `hover:scale-[1.01]` dos cards | 10 ocorrências |
| Remover `backdrop-blur` sobre fundo sólido (não produz efeito, custa GPU) | dos 53 usos, manter só onde há sobreposição real |
| Revisar os 489 backgrounds com opacidade (`bg-slate-900/60`) — usar cor sólida onde o efeito não é intencional | global |
| Revisar `rounded-none` (565×) — decisão consciente por componente, não default global | via primitivos |
| Auditoria de acessibilidade: foco visível em todos os interativos, contraste AA, `prefers-reduced-motion` | global |

---

## 4. Verificação por fase

Em toda fase:
1. `npx tsc --noEmit` — sem erros novos
2. `npm run lint`
3. `npm test` (Vitest) — verde
4. `npm run test:e2e` (Playwright) — verde
5. Inspeção visual em tema claro **e** escuro
6. Responsivo a 375px, 768px, 1440px

Commit por fase (por tela na Fase 3), para revert cirúrgico.

---

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Fase 0 "muda o visual" ao revelar cores hoje invisíveis | Esperado. Documentar as telas afetadas antes/depois |
| Regressão no tema claro ao remover o `.text-white:not(...)` | Fase 1 é pré-requisito; varrer as telas com botão colorido |
| Volume da Fase 3 (~50 arquivos) | Uma tela por commit; suíte de testes já existe |
| Landing em produção durante a Fase 5 | Fase 5 é independente do app — pode ir em branch própria |
| Fases 4–5 dependem de decisão de direção | Decisões D1/D2 abaixo, resolvidas antes da Fase 4 |

---

## 6. Sequência sugerida

```
Fase 0  ──►  Fase 1  ──►  Fase 2  ──►  Fase 3
                                          │
             D1 / D2 ──►  Fase 4  ────────┤
                                          ▼
                          Fase 5  ──►  Fase 6
```

Fases 0–3 são refactor de base: valor imediato, risco baixo, independentes da direção de arte.
Fases 4–5 são a decisão de identidade e precisam de D1/D2 resolvidas.

---

## 7. Decisões — resolvidas em 2026-07-29

**D3 — Escopo: executar as Fases 0 a 6.**

**D1 — Tipografia: superfamília técnica.**

Escolhida a **IBM Plex** — desenhada para contexto de engenharia, cobre os três papéis com uma só família e resolve as 4 fontes atuais de uma vez.

| Papel | Face | Uso |
|---|---|---|
| Display | IBM Plex Sans Condensed | h1, h2, títulos de seção, números de KPI |
| Corpo | IBM Plex Sans | texto de interface, labels, parágrafos |
| Dados | IBM Plex Mono | R$, código de OS, SKU, datas, protocolo |

Remover: Geist, Geist Mono, Inter, JetBrains Mono (`app/layout.tsx:6-24`).
Regra: **mono nunca como display.** Restrita a dado tabular.

Escala tipográfica (7 degraus, mínimo 12px para interface):

```
display  36/40  Condensed  700   herói, número grande
h1       28/34  Condensed  700
h2       22/28  Condensed  600
h3       17/24  Sans       600
body     15/22  Sans       400
small    13/18  Sans       400
caption  12/16  Sans       500   uppercase só aqui
```

**D2 — Base cromática: escuro em grafite/tinta.**

Sai do `#000` puro — o preto absoluto com accent neon é o tell principal. Base grafite levemente fria, com degraus de superfície reais em vez de opacidade empilhada.

```
surface           #16181C   fundo da página
surface-raised    #1D2024   card, sidebar, modal
surface-sunken    #101215   input, célula de tabela, poço
border            #2A2E34   divisória padrão
border-strong     #3A3F47   ênfase, foco
text              #E8E9EB   primário
text-muted        #9BA1A9   secundário
text-subtle       #6B7280   terciário, legenda
```

O verde da marca é preservado (identidade Trust Care), mas **dessaturado do neon** e fixado em **um único valor** — hoje são 4 (`emerald-400/450/500/600`). Sobre grafite ele não precisa da intensidade que precisava sobre preto puro.

Semânticas derivadas de um valor cada: `success`, `warning`, `danger`, `info` — substituindo as 14 famílias em uso.

**Artefatos (Fase 5.2)** permanecem no escuro, mas as vias do papel carbonado (branca / amarela / rosa) entram como acento de documento em OS, orçamento e portal do cliente.
