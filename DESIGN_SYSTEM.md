# Trust Care - Design System

Este documento define as regras absolutas de interface e identidade visual (UI/UX) da Trust Care. As definições aqui descritas consolidam o **"Swiss Technical Minimalism" fluido**, garantindo uma estética moderna, polida e de alto contraste em toda a aplicação.

## 🎨 Princípios Fundamentais
1. **Alto Contraste & Minimalismo**: Uso de fundo escuro, fontes brancas/cinzas para dados secundários, e cores de destaque vibrantes (neon/brand) apenas onde for estritamente necessário para guiar a atenção.
2. **Tipografia Monospatial**: Dados técnicos, valores financeiros, IDs numéricos e códigos devem SEMPRE utilizar tipografia monoespaçada (`font-mono`) com `tabular-nums`.
3. **Fluidez e Elevação**: Elementos interativos devem parecer vivos, reagindo sutilmente ao `hover` com elevação e reforço de sombra.

---

## 🧩 Componentes e Formas (Shapes)

A regra de ouro da plataforma atualizada é a remoção completa de cantos secos (`rounded-none`). Toda a plataforma utiliza a seguinte hierarquia de arredondamento:

### 1. Cards e Painéis (Dashboard e Containers)
- **Shape**: Cantos bem arredondados (`rounded-2xl`).
- **Sombras**: Sombra base sutil (`shadow-sm`).
- **Interação**: Efeito fluido de "elevação" ao passar o mouse (`hover:-translate-y-0.5 hover:shadow-md`), dando vida à interface.
- **Fundo**: Uso de `bg-surface-raised` ou `bg-surface-sunken` para hierarquia de profundidade em relação ao fundo global.

### 2. Botões
- **Shape**: Arredondamento suave (`rounded-xl`).
- **Interação**: Efeito fluido de elevação no hover (idêntico ao da tela de login e dos cards).

### 3. Inputs (Formulários, Buscas e Filtros)
- **Shape**: Arredondamento suave (`rounded-xl`).
- **Interação**: Transições suaves de sombra e cor de borda ao receberem foco (ex: `focus:border-brand focus:ring-1 focus:ring-brand/40`).

### 4. Modais
- **Shape**: As janelas que se abrem por cima da tela acompanham rigidamente as bordas macias dos cards, utilizando `rounded-2xl`.

### 5. Badges (Etiquetas de Status/PJ/PF)
- **Shape**: Formato de pílula clássico (`rounded-full`).
- **Uso**: Retira o visual quadrado e traz um ar perfeitamente polido, ideal para identificadores curtos.

### 6. Ícones (Estilo "Soft Circle")
O estilo oficial para contêineres de ícones na Trust Care (sejam ícones de KPI, avatares de tabelas ou botão de WhatsApp) é o **Soft Circle**:
- **Shape**: Círculo perfeito (`rounded-full`).
- **Estética**: Efeito "glassmorphism" com desfoque de fundo (`backdrop-blur-md`) e uma borda translúcida ultrafina (`border border-white/5` ou similar dependendo do tema).
- **Cores**: Geralmente utilizam um fundo semi-transparente da cor de destaque (`bg-brand/15 text-brand`).

---

## 🛠️ Regras de Implementação para IA / Desenvolvedores

Ao criar **qualquer nova página ou componente**, você deve:
1. **Evitar tags nativas** puras (`<input>`, `<table>`, `<div>` simulando botões). Tente sempre reutilizar os componentes da pasta `@/components/ui`.
2. Se precisar customizar um container nativo, **NUNCA** utilize `rounded-none`. Consulte a tabela de Shapes acima.
3. Não introduza novas paletas de gradientes genéricos. Mantenha as cores sólidas e controle a estética através de opacidade (ex: `/10`, `/15`) para fundos de ícones e badges.
