# Plano de Implementação: Mídias no Problema Relatado & Drag-and-Drop em Anexos da O.S.

## 🎯 Objetivo
1. Adicionar uma seção dedicada para anexar fotos e mídias ao **"Problema Relatado / Sintomas"** tanto na abertura de Nova O.S. (`NewOrderForm`, `ProblemSection`, `useOrderForm`) quanto na tela de detalhes/edição de O.S. (`OrderDetailsClient`, `TechnicalReportSection`).
2. Implementar suporte completo a **arrastar e soltar (Drag and Drop)** para anexar arquivos, complementando o seletor tradicional de arquivos.
3. Modernizar a seção existente **"Mídias e Anexos do Serviço"** (reservada a técnicos em `AttachmentsSection.tsx`) adicionando suporte a Drag and Drop.
4. Manter o design em total conformidade com o **Design System Trust Care** (Apple HIG, superfícies translúcidas, cantos curvos contínuos, ausência de tons roxos/violetas) e convenções de projeto (criação de branch dedicada).

---

## 👥 Equipe de Subagentes Especialistas

| Subagente | Domínio | Responsabilidade | Status |
|---|---|---|---|
| **`project-planner`** | Arquitetura & Planejamento | Estruturação de tarefas, fluxo de dados entre componentes e acompanhamento das fases. | Concluído ✅ |
| **`frontend-specialist`** | UI / UX & Componentes | Criação do componente reutilizável `FileDropzone`, integração visual em `ProblemSection`, refatoração de `AttachmentsSection` com drag-and-drop e visualizador de miniaturas/preview. | Concluído ✅ |
| **`backend-specialist`** | Storage & Persistência | Estrutura de dados em `service_orders.media` (suporte a categorias `'problem'` vs `'service'`), ciclo de upload no Supabase Storage (`os-media`) para OS novas e existentes. | Concluído ✅ |
| **`test-engineer`** | QA & Validação | Testes de regressão, testes de dropzone (arraste, soltura, tipos inválidos), validação TypeScript (`tsc --noEmit`) e testes unitários. | Concluído ✅ |

---

## 📋 Divisão de Tarefas

### Fase 0: Setup & Branch Dedicada (Convenção do Projeto)
- [x] Criar e alternar para a branch de desenvolvimento `feature/media-attachments-drag-and-drop`.

### Fase 1: Arquitetura de Dados & Componente Reutilizável de Upload (Frontend + Backend)
- [x] **Componente `FileDropzone` (`components/ui/FileDropzone.tsx`)**:
  - Área com suporte a arrastar e soltar (`onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop`) e clique (`<input type="file" multiple />`).
  - Estado visual intuitivo para arraste ativo (borda destacada em `border-brand`, fundo translúcido sutil).
  - Suporte a filtros de tipos MIME (`accept="image/*,video/*"`) e restrição de tamanho máximo (15MB).
  - Indicador de carregamento (`LoadingSpinner`), listagem de arquivos anexados com miniaturas, badges de tipo, botão de remoção e modal de visualização em tela cheia (preview com suporte a imagens e vídeos).
  - Rótulos customizáveis (ex: "Fotos do Problema / Sintomas" vs "Mídias e Anexos do Serviço").

### Fase 2: Mídias do Problema Relatado na Abertura de Nova O.S. (Frontend + Backend)
- [x] **Atualização do hook `useOrderForm.ts`**:
  - Adicionar estado `problemMediaFiles: Array<{ file?: File, name: string, url: string, type: string, category: 'problem' }>`.
  - Tratamento de upload: ao criar a OS com sucesso (`insertedId`), é realizado o upload em lote para o bucket `os-media/${company_id}/${insertedId}/...`, atualizando o registro da OS no Supabase com `{ media: uploadedList }`.
  - Revogação de URLs de blob com `URL.revokeObjectURL` para prevenir vazamento de memória.
- [x] **Atualização de `components/new-order/ProblemSection.tsx`**:
  - Incorporar a nova área de upload logo abaixo do editor de texto do problema relatado.
  - Exibir fotos de entrada do equipamento (ex: tela trincada, marcas de queda, conectores oxidados).
- [x] **Atualização de `components/NewOrderForm.tsx`**:
  - Encaminhar estados e handlers de mídias de `useOrderForm` para `ProblemSection`.

### Fase 3: Modernização de "Mídias e Anexos do Serviço" com Drag and Drop (Frontend)
- [x] **Refatoração de `AttachmentsSection.tsx`**:
  - Substituir o seletor simples pelo novo padrão com área de soltura (Drag and Drop) integrada e clique via `FileDropzone`.
  - Manter compatibilidade com a flag "Apenas Técnicos" e layout existente.
- [x] **Atualização de `OrderDetailsClient.tsx` & `TechnicalReportSection.tsx`**:
  - Separar visualmente: "Fotos / Mídias do Problema Relatado" (fotos de entrada) e "Mídias do Serviço" (execução técnica).
  - Suporte a arrastar e soltar arquivos a qualquer momento na edição da O.S. com categorização e persistência no banco.

### Fase 4: Validação & Testes (Test Engineer)
- [x] Validação estática de tipos: `npx tsc --noEmit` aprovada com 0 erros.
- [x] Testes unitários do hook `useOrderForm.test.ts` (9 testes passando).
- [x] Testes unitários do componente `FileDropzone.test.tsx` (5 testes passando).
- [x] Linting e verificação de conformidade de design (sem tons roxos/violetas, uso correto de tokens semânticos).

---

## 🔒 Critérios de Aceite (Done When)
- [x] É possível anexar fotos/vídeos diretamente na seção "Problema Relatado / Sintomas" na Nova O.S.
- [x] É possível arrastar e soltar arquivos tanto na seção do Problema Relatado quanto em "Mídias e Anexos do Serviço".
- [x] A seleção tradicional via clique no botão continua funcionando normalmente em ambos os lugares.
- [x] As fotos de entrada aparecem salvas e visíveis na edição da O.S.
- [x] Zero erros no TypeScript e conformidade com o Design System (sem tons roxos/violetas, uso correto de tokens semânticos).
