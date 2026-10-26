# Suporte a Peças Sob Demanda / Sob Encomenda na Criação e Edição de Nova O.S

## Goal
Adicionar suporte completo para orçar e cadastrar "Peças Sob Demanda / Sob Encomenda" tanto na abertura de uma Nova O.S (`NewOrderForm`, `ItemsSection`, `useOrderForm`) quanto na tela de edição da O.S (`FinancialSection`, `OrderDetailsClient`), garantindo que o técnico possa orçar peças que não existem no estoque local sem bloqueio de saldo.

## Tasks
- [x] Task 1: Atualizar o hook `useOrderForm.ts` para gerenciar estado de peças sob demanda (`handleAddCustomProduct`, `custom_name`, `unit_cost`, `unit_price`, `supplier_link`, `part_status`) e enviar payload compatível com `save_order` → Verify: Testar cálculo de subtotal/total com peça sob demanda adicionada.
- [x] Task 2: Atualizar o componente `components/new-order/ItemsSection.tsx` adicionando alternador (SegmentedControl ou abas) entre "Do Estoque" e "Sob Encomenda (Para Pedido)", com campos de descrição, custo estimado, preço de venda e link do fornecedor → Verify: Renderizar formulário de Nova O.S e adicionar peça personalizada.
- [x] Task 3: Atualizar tabela de listagem de peças em `ItemsSection.tsx` para exibir badges de "Sob Encomenda", link do fornecedor e permitir exclusão segura por ID → Verify: Remover peças tanto de estoque quanto sob encomenda.
- [x] Task 4: Validar e sincronizar a tela de edição de O.S (`app/(dashboard)/dashboard/orders/[id]/_components/FinancialSection.tsx`) garantindo consistência visual e funcional idêntica à abertura de OS → Verify: Conferir se ambas as telas possuem o mesmo comportamento de seleção de peças sob demanda.
- [x] Task 5: Executar testes de unidade e verificação de tipagem TypeScript (`tsc --noEmit`) → Verify: Zero erros no compilador TypeScript.

## Done When
- [x] O formulário de "Nova O.S" permite adicionar peças sob demanda / sob encomenda sem exigir estoque físico.
- [x] O valor da peça sob demanda soma no total da O.S na criação e na edição.
- [x] Ao salvar a Nova O.S, os itens sob encomenda são gravados com status "pendente" / "a_comprar" e sem diminuir saldo do inventário.
- [x] A tela de edição de O.S e a tela de Nova O.S operam de forma 100% alinhada.

## Notes
- `product_id` é nulo para peças sob demanda.
- As peças sob demanda aparecem automaticamente na aba "Peças Sob Encomenda / A Pedir" em `/dashboard/inventory` após a criação.
