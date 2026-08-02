# Trust Care - Design System

Este documento define as regras absolutas de interface e identidade visual (UI/UX) da Trust Care, orientadas pelo **Apple Human Interface Guidelines (HIG)**. Nosso objetivo é entregar uma interface imersiva, polida e intuitiva, focada em **Clareza, Deferência e Profundidade**.

## 🍎 Princípios Fundamentais (Apple HIG)
1. **Clareza (Clarity)**: O texto deve ser legível em todos os tamanhos, os ícones (estilo SF Symbols) devem ser precisos e reconhecíveis instantaneamente, e o layout deve respirar com grid de 8px.
2. **Deferência (Deference)**: A interface cede espaço ao conteúdo. Usamos animações fluidas, respostas táteis (`active:scale-[0.97]`) e backgrounds translúcidos que ajudam o usuário a focar nos dados sem que a UI compita por atenção.
3. **Profundidade (Depth & Materials)**: Uso de camadas visuais, desfoque/translucência (`backdrop-blur-xl bg-glass`) e sombras suaves para criar uma hierarquia clara. O que está acima (modais, popovers, dropdowns) utiliza superfícies com *Vibrancy* (efeito vidro/glassmorphism).

---

## 🪟 Tokens de Material (Vidro)

> **Regra crítica:** nunca escreva o vidro como cor literal (`bg-white/[0.04]`, `border-white/[0.08]`). No tema claro isso pinta branco translúcido sobre um fundo quase branco e **o elemento desaparece**. Use sempre os tokens abaixo — cada tema define seu próprio valor para o mesmo papel.

| Token | Papel | Dark | Light |
|---|---|---|---|
| `bg-glass` | Superfície de vidro (card, painel) | branco 4% | branco 72% |
| `border-glass-border` | Borda do vidro | branco 8% | preto 8% |
| `border-glass-border-strong` | Borda em hover / painel de modal | branco 12% | preto 14% |
| `border-glass-divider` | Divisória interna (header de modal, sidebar) | branco 6% | preto 7% |

Superfícies **opacas** continuam usando a escala semântica (`bg-surface`, `bg-surface-raised`, `bg-surface-sunken`, `bg-surface-overlay`). Vidro é só para o que flutua sobre conteúdo.

---

## 🧩 Componentes e Formas (Shapes)

A regra de ouro da plataforma é a remoção completa de cantos secos (`rounded-none`). Toda a plataforma utiliza as seguintes convenções baseadas na curva contínua da Apple:

### 1. Cards e Painéis (Dashboard e Containers)
- **Shape**: Cantos com curvatura macia contínua (`rounded-[20px]`).
- **Material**: Superfícies translúcidas com efeito de vidro fosco (`bg-glass backdrop-blur-xl border border-glass-border`).
- **Interação**: Efeito fluido de "elevação" e resposta tátil ao passar o mouse e clicar (`hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 hover:border-glass-border-strong active:scale-[0.98] transition-all duration-300`).

### 2. Botões
- **Shape**: Formato de cápsula perfeita (`rounded-full`) para todos os botões primários e secundários.
- **Interação**: Resposta tátil com compressão sutil no clique (`active:scale-[0.97]`), além de elevação e clareamento suave no hover.

### 3. Inputs (Formulários, Buscas e Filtros)
- **Shape**: Arredondamento suave (`rounded-xl`).
- **Interação**: Transições suaves de sombra e cor de borda ao receberem foco (`focus:border-brand focus:ring-1 focus:ring-brand/40 focus:outline-none`).

### 4. Modais, Menus de Contexto e Popovers
- **Backdrop**: Fundo escuro profundo com desfoque pesado (`bg-black/60 backdrop-blur-xl`).
- **Painel/Container**: Superfície translúcida de alta opacidade (`bg-surface-raised/90 backdrop-blur-2xl border border-glass-border-strong rounded-[20px] shadow-2xl`).
- **Divisores**: Linhas ultra-sutís e translúcidas (`border-glass-divider`).

### 5. Badges (Etiquetas de Status/PJ/PF)
- **Shape**: Formato de pílula clássico (`rounded-full`).
- **Uso**: Retira o visual quadrado e traz um ar perfeitamente polido, ideal para identificadores curtos e status.

### 6. Ícones (Estilo SF Symbols em Squircles)
- **Traço Constante**: Todos os ícones utilizam peso de linha consistente (`stroke-width={1.8}` ou `2.0`).
- **Contêineres de Ícone (Squircle)**:
  - **Shape**: Cantos arredondados contínuos (`rounded-2xl`) em vez de círculos perfeitos.
  - **Estética**: Fundo semi-transparente da cor semântica do contexto (ex: `bg-brand/15 text-brand`, `bg-emerald-500/10 text-emerald-400`) com `backdrop-blur-md` e borda translúcida ultrafina (`border border-white/5`).

---

## 🛠️ Regras de Implementação para IA / Desenvolvedores

Ao criar **qualquer nova página ou componente**, você deve:
1. **Reutilizar componentes do `@/components/ui`**: Evitar tags nativas puras sem estilizar.
2. **NUNCA utilizar `rounded-none`**. Consulte a tabela de Shapes acima.
3. **Hierarquia de texto — sempre por token, nunca por opacidade literal.**
   As classes `white/90`, `white/60`, `white/40` só funcionam no tema escuro;
   no claro produzem texto branco sobre fundo branco.
   - Primário (Títulos/Valores): `text-text`
   - Secundário (Labels): `text-text-muted`
   - Terciário (Descrições): `text-text-subtle`
   - Divisórias: `border-border` (opaca) ou `border-glass-divider` (sobre vidro)
4. **Cores sólidas apenas para elementos interativos primários** (`bg-brand text-brand-contrast rounded-full`). Containers e superfícies usam `bg-surface-*` (opaco) ou `bg-glass` (translúcido).
5. **Piso tipográfico de 12px.** Use os degraus da escala (`text-caption` … `text-display`). Nada de `text-[10px]`/`text-[11px]`.
6. **Um único breakpoint de layout: `lg` (1024px).** É onde a sidebar deixa de ser drawer sobreposto e passa a empurrar o conteúdo. Em JS use `matchMedia('(min-width: 1024px)')`, nunca `window.innerWidth`.

---

## 🧰 Componentes disponíveis — o que NÃO escrever à mão

> **Regra:** tela nova não escreve cabeçalho, filtro, confirmação, menu, seleção ou skeleton do zero. Se você está prestes a montar um destes com `<div>`, pare e use o componente. Foi exatamente essa reescrita à mão que produziu 10 cabeçalhos divergentes e 2 barras de ação em massa diferentes.

Tudo importado de `@/components/ui`.

### Estrutura de página
| Componente | Use para | Em vez de |
|---|---|---|
| `PageHeader` | Título, descrição, badges e ações da tela | `<div>` com `<h1>` + `<p>` + flex de botões |
| `Toolbar` + `ToolbarSearch` / `ToolbarGroup` / `ToolbarDivider` | Barra de busca e filtros da listagem | `<Card>` com input de busca montado à mão |
| `SegmentedControl` | Escolha exclusiva entre poucas opções (visualização, densidade) | Grupo de `<button>` com `aria-pressed` manual |
| `BulkActionBar` + `BulkDivider` | Ações sobre itens selecionados | `<div class="fixed bottom-6...">` |

### Feedback e decisão
| Componente | Use para | Em vez de |
|---|---|---|
| `useToast()` | Confirmar que algo aconteceu, avisar de falha | **`alert()`** — bloqueia a aba, não tem estilo |
| `useConfirm()` | Confirmar ação destrutiva ou irreversível | **`window.confirm()`** — trata "excluir 12 OS" igual a "descartar rascunho" |
| `Modal` | Diálogo com formulário ou conteúdo próprio | `<div>` posicionado com estado de aberto/fechado |
| `EmptyState` | Lista vazia — sempre com a ação que sai do estado | Um `<p>` dizendo "nenhum registro" |
| `Skeleton` / `SkeletonText` / `SkeletonCards` / `SkeletonTable` | Carregamento | `animate-pulse` avulso |

Os toasts têm duração por severidade: sucesso e info somem em 5s, aviso em 8s e **erro não some sozinho**. Não passe `duration` para contornar isso sem um motivo.

### Dados e controles
| Componente | Use para | Em vez de |
|---|---|---|
| `Table` / `THead` / `TBody` / `TR` / `TH` / `TD` | Qualquer tabela. `density="compact"` para listas longas; `stickyHeader` para cabeçalho fixo | `<table>` com classes por célula |
| `DropdownMenu` + `DropdownMenuItem` | Menu de ações por linha | `<div>` absoluto (é recortado pelo scroll da tabela e não tem teclado) |
| `Checkbox` | Seleção. Passe `indeterminate` no "selecionar todos" quando a seleção for parcial | `<input type="checkbox">` cru |
| `Input` / `Select` / `Textarea` / `Field` | Campos de formulário, com rótulo, dica e erro | `<input>` com classes soltas |
| `Button` / `buttonClasses()` | Ações. Use `buttonClasses()` quando precisar de um `<a>`/`<Link>` de verdade | `<button>` estilizado à mão |
| `Badge` / `StatusBadge` | Etiquetas. `StatusBadge` deriva cor e rótulo de `lib/design/status` | Mapa de status copiado na tela |
| `Card` | Superfície de conteúdo. Recebe `role`/`tabIndex`/teclado sozinho quando tem `onClick` | `<div>` com as classes de vidro |

### Verificação automática
- `npm run lint` **falha** em `alert`/`confirm`/`prompt`, em cores fora dos tokens (`slate-*`, `emerald-*`, `zinc-*`, `gray-*`, `neutral-*`) e em `text-[10px]`/`text-[11px]`.
- As listas de exceção em `eslint.config.mjs` são uma **catraca: só encolhem**. Ao migrar uma tela, apague a linha dela. Nunca acrescente um arquivo.
- `npm run ds:audit` mostra o passivo restante e as piores telas — é por onde começar.
