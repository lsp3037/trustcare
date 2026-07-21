# Tarefas - Padronização de Status das Ordens de Serviço (OS)

- [x] Atualizar a definição do schema em `supabase/schema.sql` com a nova lista de status CHECK e DEFAULT
- [x] Atualizar o formulário de cadastro de OS `components/NewOrderForm.tsx` (status padrão e dropdown)
- [x] Refatorar o Dashboard `app/(dashboard)/dashboard/page.tsx` (cores, KPIs, mock data e prompt de ações)
- [x] Ajustar o header dinâmico no layout (`app/(dashboard)/layout.tsx`) e remover o card de Tenant redundante e gradiente do logo.
- [x] Refatorar a alteração de status de OS no Dashboard (`app/(dashboard)/dashboard/page.tsx`) para usar um modal/dropdown customizado `rounded-none` ao invés de `window.prompt()`.
- [x] Refatorar a criação de categoria inline na página de cliente (`app/(dashboard)/dashboard/clients/[id]/page.tsx`) para usar um input inline ao invés de `window.prompt()`.
- [x] Validar a compilação do projeto com `npm.cmd run build`
