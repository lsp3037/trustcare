# Plano do Projeto: Novo Padrão de OS & Controle de Pagamento (`os-numbering-payment`)

Este plano descreve o fluxo de trabalho para implementar a numeração híbrida de Ordens de Serviço (TC-YYMM-XXXX) e a flag de pagamento controlada pelo status "Entregue".

## 📋 Overview
- **O que**: 
  - Geração automática de `codigo_os` no formato `TC-YYMM-XXXX` (com incremento mensal do sequencial XXXX) via trigger e função no PostgreSQL do Supabase.
  - Atualização automática retroativa de todos os registros passados.
  - Campo booleano `pago` adicionado ao banco e exposto no frontend Next.js.
  - Interface do usuário restringindo a alteração do toggle de pagamento apenas para quando o status da OS for "Entregue".

---

## 🎯 Project Type
- **Tipo de Projeto**: WEB (Next.js App Router + Supabase + PostgreSQL)

---

## 🏆 Success Criteria
1. **Unicidade de Código**: Todo registro de OS precisa de um `codigo_os` único seguindo o padrão especificado.
2. **Geração Automática**: Novos cadastros de OS devem gerar o código automaticamente sem intervenção do usuário.
3. **Restrição de Pagamento**: O controle visual do status de pagamento só pode ser ativado e modificado se o status for "Entregue".
4. **Filtro Avançado**: O usuário do painel deve conseguir pesquisar OSs na listagem digitando tanto o ID UUID quanto o novo código híbrido.

---

## 📁 File Structure
```plaintext
os-manager/
├── supabase/
│   └── schema.sql                   # [MODIFY] Alterações de tabelas, triggers e Rpc
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           ├── orders/
│           │   ├── page.tsx         # [MODIFY] Listagem com codigo_os e busca
│           │   └── [id]/
│           │       └── page.tsx     # [MODIFY] Detalhes com cabeçalho, toggle pago e RLS
│           └── clients/
│               └── [id]/
│                   └── page.tsx     # [MODIFY] Atualização de refs de OS para exibir código curto
```

---

## 📝 Task Breakdown

### `task_1`: Alterar Banco e Executar Migração Retroativa
- **Agente**: `database-architect`
- **Skills**: `database-design`
- **Prioridade**: P0
- **Descrição**: Rodar script para criar as colunas `codigo_os` e `pago` em `service_orders`, atualizar os registros antigos divididos por mês de criação e aplicar o trigger `BEFORE INSERT` para novos registros.
- **INPUT**: Tabela sem as colunas adicionais.
- **OUTPUT**: Colunas adicionadas, dados migrados e trigger operacional no Supabase.
- **VERIFY**: Executar consulta de teste no banco online e conferir se todos os registros antigos ganharam códigos `TC-YYMM-XXXX` válidos.

### `task_2`: Atualizar Listagem de Ordens de Serviço
- **Agente**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`, `frontend-design`
- **Prioridade**: P1
- **Dependências**: `task_1`
- **Descrição**: Ajustar a página de listagem (`orders/page.tsx`) para exibir a coluna/campo `codigo_os` e estender o filtro de busca textual para abranger este campo.
- **INPUT**: Listagem exibindo hash de UUID curto (`order.id.slice(0, 5)`).
- **OUTPUT**: Listagem apresentando códigos estruturados `TC-YYMM-XXXX` e busca compatível.
- **VERIFY**: Digitar parte do código (ex: `TC-`) na caixa de pesquisa e validar os resultados filtrados.

### `task_3`: Ajustar Detalhes da OS e Integrar Flag Pago
- **Agente**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`
- **Prioridade**: P1
- **Dependências**: `task_1`
- **Descrição**: Modificar `orders/[id]/page.tsx` para apresentar o `codigo_os` no cabeçalho. Adicionar o controle de pagamento ("Pago") ativo somente se o status for "Entregue" e persistir essa informação no Supabase (online) e no fallback local (offline).
- **INPUT**: Página de detalhes sem exibição de código de OS e sem controle de pagamento.
- **OUTPUT**: Toggle interativo de pagamento condicional e dados salvos no banco.
- **VERIFY**: Abrir OS em andamento, constatar que o toggle está desativado. Mudar para "Entregue", habilitar o toggle, salvar e verificar se no banco online o campo `pago` foi atualizado para `true`.

---

## 🏁 Phase X: Verification
- [x] Validar compilação do Next.js via `npm run build`
- [x] Verificar conformidade de design (sem cores puras violeta/roxo)
- [x] Testar persistência do estado "Pago" no Supabase e no localStorage offline

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-23

