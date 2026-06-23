# Plano do Projeto: Rastreamento & Webhooks (`rastreio-webhooks`)

Este plano descreve a implementação do Portal Público de Rastreio e da Integração de Webhooks para notificações automáticas de status.

## 📋 Overview
- **O que**: Rota pública `/rastreio` para que os clientes acompanhem o status de seus aparelhos de forma simplificada e segura (usando o código UUID da OS), aliado a disparos de webhooks de notificação de rede em mudanças para status acionáveis.
- **Por que**: Reduzir a carga de suporte no WhatsApp administrativo ao automatizar o pós-venda e disponibilizar autoatendimento de consulta.

---

## 🎯 Project Type
- **Tipo de Projeto**: WEB (Next.js v15 App Router + Supabase + Tailwind CSS v4)

---

## 🏆 Success Criteria
1. **Segurança de Dados**: Absolutamente nenhuma informação pessoal (CPF, e-mail, telefone completo, endereço) do cliente ou valores financeiros devem ser expostos na página pública de rastreio `/rastreio`.
2. **Autoatendimento**: O cliente deve conseguir visualizar o status atual, o modelo do equipamento, o defeito relatado e a previsão de entrega caso acesse `/rastreio?id=UUID_VALIDO` ou pesquise o código diretamente na barra de busca.
3. **Disparo de Notificações**: Ao atualizar uma OS para um status de interesse do cliente ('Aguardando Peça', 'Pronta para Retirada', 'Cancelada'), o Next.js deve disparar um POST contendo as chaves `event`, `order_id`, `status`, `equipment`, `client_name`, `client_phone` e `tracking_url` para o webhook cadastrado.
4. **Sem Poluição**: Mudanças para status internos de bancada ('Na Bancada', 'Em Testes') não devem disparar webhooks.

---

## 💻 Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Banco de Dados**: PostgreSQL (Supabase JS Client + Custom RPC)
- **Estilização**: Tailwind CSS v4 (Design Escuro/Claro adaptativo, sem uso de cores violeta/roxo)
- **Iconografia**: Lucide React

---

## 📁 File Structure
```plaintext
os-manager/
├── app/
│   └── rastreio/
│       └── page.tsx                 # [NEW] Portal Público de Rastreio
├── supabase/
│   └── schema.sql                   # [MODIFY] Função Postgres get_public_service_order
└── app/
    └── (dashboard)/
        └── dashboard/
            └── orders/
                └── [id]/
                    └── page.tsx     # [MODIFY] Integração de gatilho do webhook
```

---

## 📝 Task Breakdown

### `task_1`: Configurar Função de Banco Pública no Supabase Schema
- **Agente**: `database-architect`
- **Skills**: `database-design`
- **Prioridade**: P0
- **Dependências**: Nenhuma
- **Descrição**: Adicionar a função `get_public_service_order(order_id UUID)` com o parâmetro `SECURITY DEFINER` na tabela `supabase/schema.sql`. Essa função permitirá ler dados de forma segura via anon key do Supabase.
- **INPUT**: Tabela `service_orders` com RLS restrito a usuários autenticados.
- **OUTPUT**: Script SQL contendo a função e sua adição no arquivo local `supabase/schema.sql`.
- **VERIFY**: Testar o SQL no editor de queries do Supabase ou executar localmente e validar que retorna os campos: `id`, `status`, `equipment_name`, `equipment_brand`, `equipment_model`, `reported_problem`, `created_at` e `delivery_prediction`.

### `task_2`: Criar a Página Pública de Rastreio
- **Agente**: `frontend-specialist`
- **Skills**: `frontend-design`, `nextjs-react-expert`
- **Prioridade**: P1
- **Dependências**: `task_1`
- **Descrição**: Desenvolver a rota `/rastreio` em `app/rastreio/page.tsx` para apresentar a timeline de progresso da ordem de serviço. A página deve se integrar à RPC do Supabase, conter animações suaves e estar em conformidade estética com o restante do painel escuro da aplicação.
- **INPUT**: Rota `/rastreio` inexistente.
- **OUTPUT**: Novo arquivo `app/rastreio/page.tsx` com formulário de busca e timeline interativa.
- **VERIFY**: Acessar `http://localhost:3000/rastreio?id=UUID` com um UUID válido e constatar que o layout renderiza corretamente o progresso e dados do equipamento.

### `task_3`: Integrar Disparo de Webhook na Edição de OS
- **Agente**: `frontend-specialist`
- **Skills**: `nextjs-react-expert`
- **Prioridade**: P1
- **Dependências**: Nenhuma
- **Descrição**: Modificar `app/(dashboard)/dashboard/orders/[id]/page.tsx` na função `handleSaveChanges` para enviar uma requisição HTTP POST para `process.env.NEXT_PUBLIC_WEBHOOK_URL` se o novo status da OS for crítico.
- **INPUT**: Mudança de status persistindo no Supabase sem notificações externas.
- **OUTPUT**: Código integrado que dispara requisições de webhook quando aplicável.
- **VERIFY**: Configurar um link temporário de captura no `.env.local` e alterar a OS para 'Pronta para Retirada'. Validar no serviço de escuta de rede se o payload completo e a URL de rastreio foram transmitidos com sucesso.

---

## 🏁 Phase X: Verification
- [x] Validar compilação do Next.js via `npm run build`
- [x] Verificar conformidade de design (sem cores puras violeta/roxo)
- [x] Checar conformidade com a LGPD (sem dados de identificação sensíveis na rota pública)
- [x] Passar nos scripts de verificação do AG Kit se disponíveis

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-23

