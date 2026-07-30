'use client';

import React from 'react';
import { Boxes, Wrench, Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  Card,
  CardTitle,
  Button,
  Field,
  Input,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface ItemsSectionProps {
  inventory: any[];
  currentProductId: string;
  setCurrentProductId: (id: string) => void;
  setIsNewProductModalOpen: (open: boolean) => void;
  currentProductQty: string;
  setCurrentProductQty: (qty: string) => void;
  productAddError: string;
  setProductAddError: (err: string) => void;
  handleAddProduct: () => void;
  selectedProducts: any[];
  handleRemoveProduct: (id: string) => void;
  availableServices: any[];
  currentServiceId: string;
  handleServiceSelect: (id: string) => void;
  currentServiceQty: string;
  setCurrentServiceQty: (qty: string) => void;
  currentServicePrice: string;
  setCurrentServicePrice: (price: string) => void;
  handleAddService: () => void;
  selectedServices: any[];
  handleRemoveService: (id: string) => void;
}

const brl = (value: number) => `R$ ${value.toFixed(2)}`;

/**
 * Tabela de itens adicionados. Peças e serviços usavam a mesma tabela
 * escrita duas vezes, com a única diferença sendo o rótulo da 1ª coluna.
 */
function ItemsTable({
  itemLabel,
  items,
  emptyLabel,
  idKey,
  onRemove,
}: {
  itemLabel: string;
  items: any[];
  emptyLabel: string;
  idKey: 'product_id' | 'service_id';
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-small text-text-subtle text-center py-2">{emptyLabel}</p>;
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH className="pl-0">{itemLabel}</TH>
          <TH align="center">Preço Unitário</TH>
          <TH align="center">Qtd.</TH>
          <TH align="right">Subtotal</TH>
          <TH align="center" className="pr-0">
            <span className="sr-only">Remover</span>
          </TH>
        </TR>
      </THead>
      <TBody>
        {items.map((item) => (
          <TR key={item[idKey]}>
            <TD className="pl-0 font-semibold">{item.name}</TD>
            <TD align="center" numeric className="text-text-muted">
              {brl(item.unit_price)}
            </TD>
            <TD align="center" numeric className="font-semibold">
              {item.quantity}
            </TD>
            <TD align="right" numeric className="font-semibold">
              {brl(item.quantity * item.unit_price)}
            </TD>
            <TD align="center" className="pr-0">
              <button
                type="button"
                onClick={() => onRemove(item[idKey])}
                aria-label={`Remover ${item.name}`}
                className="p-1 text-text-subtle hover:text-danger transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function ItemsSection({
  inventory,
  currentProductId, setCurrentProductId,
  setIsNewProductModalOpen,
  currentProductQty, setCurrentProductQty,
  productAddError, setProductAddError,
  handleAddProduct,
  selectedProducts,
  handleRemoveProduct,
  availableServices,
  currentServiceId,
  handleServiceSelect,
  currentServiceQty, setCurrentServiceQty,
  currentServicePrice, setCurrentServicePrice,
  handleAddService,
  selectedServices,
  handleRemoveService,
}: ItemsSectionProps) {
  // Disponibilidade da peça selecionada — antes recalculada três vezes
  // inline (na dica de estoque, no `disabled` e na classe do botão).
  const selectedProduct = inventory.find((p) => p.id === currentProductId);
  const requestedQty = parseInt(currentProductQty) || 0;
  const overStock = Boolean(selectedProduct) && requestedQty > selectedProduct.quantity;
  const isLowStock =
    Boolean(selectedProduct) && selectedProduct.quantity <= selectedProduct.min_stock_alert;
  const canAddProduct = Boolean(selectedProduct) && requestedQty > 0 && !overStock;

  return (
    <>
      {/* Seção de Peças e Produtos Utilizados */}
      <Card padding="sm" className="space-y-4">
        <CardTitle className="flex items-center gap-2 border-b border-border pb-2">
          <Boxes className="w-4 h-4 text-text-subtle" aria-hidden /> Peças de Reposição Utilizadas
        </CardTitle>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <Select
              label="Produto em Estoque"
              value={currentProductId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'create_new_product') {
                  setIsNewProductModalOpen(true);
                } else {
                  setCurrentProductId(val);
                  setProductAddError('');
                }
              }}
              wrapperClassName="flex-1"
            >
              <option value="">Selecione um item do estoque...</option>
              {inventory.map((prod) => (
                <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
                  {prod.name} (Qtd: {prod.quantity} | {brl(prod.sale_price)})
                </option>
              ))}
              <option value="create_new_product">+ Cadastrar Nova Peça</option>
            </Select>

            <Field label="Quantidade" className="w-24 shrink-0">
              <Input
                type="number"
                min="1"
                aria-label="Quantidade da peça"
                value={currentProductQty}
                onChange={(e) => {
                  setCurrentProductQty(e.target.value);
                  setProductAddError('');
                }}
                wrapperClassName="gap-0"
                className="text-center font-mono tabular-nums"
              />
              {selectedProduct && (
                <div className="space-y-1 mt-1.5">
                  <span
                    className={cn(
                      'block text-caption',
                      overStock ? 'text-danger font-semibold' : 'text-text-subtle',
                    )}
                  >
                    Estoque: {selectedProduct.quantity} un
                  </span>
                  {!overStock && isLowStock && (
                    <span className="text-caption text-warning flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                      Estoque Baixo (Mín: {selectedProduct.min_stock_alert})
                    </span>
                  )}
                </div>
              )}
            </Field>

            <Button
              icon={<Plus className="w-4 h-4" />}
              disabled={!canAddProduct}
              onClick={handleAddProduct}
              className="shrink-0 sm:mt-7"
            >
              Adicionar Peça
            </Button>
          </div>

          {productAddError && (
            <p
              role="alert"
              className="p-2.5 bg-danger/10 border border-danger/25 text-small font-semibold text-danger flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
              {productAddError}
            </p>
          )}
        </div>

        <ItemsTable
          itemLabel="Peça"
          items={selectedProducts}
          idKey="product_id"
          emptyLabel="Nenhuma peça adicionada a esta ordem de serviço."
          onRemove={handleRemoveProduct}
        />
      </Card>

      {/* Seção de Serviços Realizados (Catálogo) */}
      <Card padding="sm" className="space-y-4">
        <CardTitle className="flex items-center gap-2 border-b border-border pb-2">
          <Wrench className="w-4 h-4 text-text-subtle" aria-hidden /> Serviços Realizados (Catálogo)
        </CardTitle>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <Select
            label="Serviço do Catálogo"
            value={currentServiceId}
            onChange={(e) => handleServiceSelect(e.target.value)}
            wrapperClassName="flex-1"
          >
            <option value="">Selecione um serviço...</option>
            {availableServices.map((serv) => (
              <option key={serv.id} value={serv.id}>
                {serv.nome} (Preço Padrão: {brl(serv.preco_padrao)})
              </option>
            ))}
          </Select>

          <Input
            label="Qtd"
            type="number"
            min="1"
            value={currentServiceQty}
            onChange={(e) => setCurrentServiceQty(e.target.value)}
            wrapperClassName="w-20 shrink-0"
            className="text-center font-mono tabular-nums"
          />

          <Input
            label="Preço Unitário (R$)"
            type="number"
            step="0.01"
            min="0"
            value={currentServicePrice}
            onChange={(e) => setCurrentServicePrice(e.target.value)}
            wrapperClassName="flex-1 min-w-[120px]"
            className="font-mono tabular-nums"
          />

          <Button
            icon={<Plus className="w-4 h-4" />}
            disabled={!currentServiceId}
            onClick={handleAddService}
            className="shrink-0"
          >
            Adicionar Serviço
          </Button>
        </div>

        <ItemsTable
          itemLabel="Serviço"
          items={selectedServices}
          idKey="service_id"
          emptyLabel="Nenhum serviço do catálogo adicionado a esta ordem de serviço."
          onRemove={handleRemoveService}
        />
      </Card>
    </>
  );
}
