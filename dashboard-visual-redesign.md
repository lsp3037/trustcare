# Plan: Dashboard Visual Redesign & Expressive Motion

> **Branch:** `feature/dashboard-visual-redesign`  
> **Status:** Concluído com Sucesso & Build Verificado (Exit Code 0)  
> **Escopo:** Redesign visual completo dos Cards de KPI, Banner de SLA Operacional e Gráfico Financeiro Integrado.

---

## 🎯 Objetivos de Design & Experiência Alcançados

1. **Glassmorphism Apple Depth Real:**
   - Superfícies translúcidas de alta fidelidade com desfoque de fundo (`backdrop-blur-2xl`), gradiente de luz especular na borda superior (`border-t-white/20`) e sombras volumétricas em múltiplas camadas.
2. **Iluminação Ambiental Dinâmica (Halo Glow):**
   - Halo radial suave emitido a partir de cada indicador (Esmeralda para Faturamento, Âmbar para SLA/Ordens Abertas, Azul para Ticket Médio, Carmesim para Estoque Baixo).
3. **Micro-Sparklines SVG Integradas:**
   - Curvas de tendência fluidas dos últimos 7 dias embutidas diretamente no fundo dos cards de KPI com opacidade reativa ao hover.
4. **Banner SLA Estilo Dynamic Island:**
   - Cápsula flutuante premium com borda incandescente e radar de pulso concêntrico vivo.
5. **Spline Area Chart & Pagamentos com Preenchimento Orgânico:**
   - Gráfico de área contínua com gradiente translúcido esmeralda (`type="monotone"`) e barras de distribuição de pagamento com cards individuais e animação de preenchimento fluido.

---

## 📋 Fases de Execução

- [x] **Fase 1: Preparação & Branching**
  - Criar branch `feature/dashboard-visual-redesign`.
  - Instalar dependência `motion` para React 19.
- [x] **Fase 2: Protótipo Interativo Completo no Oil-UI**
  - Criar `antes.html` com a seção inteira do Dashboard atual (Cards + SLA + Gráfico + Pagamentos).
  - Criar `depois.html` com o redesign completo integrado.
  - Compilar `style-explorer.html` e capturar screenshots reais com `shoot.mjs`.
- [x] **Fase 3: Validação Visual com o Usuário**
  - Apresentar o comparador interativo e relatório visual (Aprovado).
- [x] **Fase 4: Implementação nos Componentes de Produção**
  - Atualizar `components/dashboard/KpiOverviewCards.tsx`.
  - Atualizar `components/dashboard/FinancialChartSection.tsx`.
  - Atualizar `app/(dashboard)/dashboard/page.tsx` (Banner de SLA e Header).
  - Executar verificação e testes: `npx tsc --noEmit` (0 erros) e `npm run build` (Exit Code 0, 48 páginas estáticas geradas com sucesso).
