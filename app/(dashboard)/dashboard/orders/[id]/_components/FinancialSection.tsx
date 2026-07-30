'use client';
import React from 'react';
import { Boxes, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardTitle, Button, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

interface FinancialSectionProps {
  serviceValue: string;
  setServiceValue: (v: string) => void;
  discount: string;
  setDiscount: (v: string) => void;
  inventory: any[];
  currentProductId: string;
  setCurrentProductId: (v: string) => void;
  currentProductQty: string;
  setCurrentProductQty: (v: string) => void;
  handleAddProduct: () => void;
  selectedProducts: any[];
  handleRemoveProduct: (id: string) => void;
  availableServices: any[];
  currentServiceId: string;
  handleServiceSelect: (id: string) => void;
  currentServiceQty: string;
  setCurrentServiceQty: (v: string) => void;
  currentServicePrice: string;
  setCurrentServicePrice: (v: string) => void;
  handleAddService: () => void;
  selectedServices: any[];
  handleRemoveService: (id: string) => void;
  totalValue: string;
  productAddError: string;
  setProductAddError: (v: string) => void;
}

const brl = (value: number) => `R$ ${value.toFixed(2)}`;

/** Rótulo de subseção dentro do card. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-caption uppercase tracking-wider text-text-subtle">{children}</p>
  );
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

/**
 * Lista de itens alocados (peças ou serviços). Os dois blocos eram
 * markup idêntico duplicado.
 */
function LineItemList({
  label,
  items,
  emptyLabel,
  onRemove,
  removeLabel,
}: {
  label: string;
  items: LineItem[];
  emptyLabel: string;
  onRemove: (item: any) => void;
  removeLabel: string;
}) {
  return (
    <div className="pt-3 border-t border-border">
      <SectionLabel>{label}</SectionLabel>
      {items.length === 0 ? (
        <p className="text-center py-4 mt-2 text-small text-text-subtle bg-surface-sunken border border-border">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2 mt-2 max-h-[180px] overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-surface-sunken border border-border p-3 flex justify-between items-center gap-3"
            >
              <div className="min-w-0">
                <p className="text-small font-semibold text-text truncate">{item.name}</p>
                <p className="text-caption font-mono tabular-nums text-text-subtle mt-0.5">
                  {item.quantity} un • {brl(Number(item.unit_price))}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-small font-mono tabular-nums font-semibold text-text">
                  {brl(item.quantity * item.unit_price)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  aria-label={`${removeLabel}: ${item.name}`}
                  className="p-1 text-text-subtle hover:text-danger transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FinancialSection({
  serviceValue, setServiceValue,
  discount, setDiscount,
  inventory,
  currentProductId, setCurrentProductId,
  currentProductQty, setCurrentProductQty,
  handleAddProduct,
  selectedProducts, handleRemoveProduct,
  availableServices,
  currentServiceId, handleServiceSelect,
  currentServiceQty, setCurrentServiceQty,
  currentServicePrice, setCurrentServicePrice,
  handleAddService,
  selectedServices, handleRemoveService,
  totalValue,
  productAddError, setProductAddError
}: FinancialSectionProps) {
  // Disponibilidade da peça selecionada. Antes esse cálculo estava repetido
  // três vezes inline (na dica, no disabled e na classe do botão).
  const selectedProduct = inventory.find((p) => p.id === currentProductId);
  const requestedQty = parseInt(currentProductQty) || 0;
  const alreadyAllocated =
    selectedProducts.find((p) => p.product_id === currentProductId)?.quantity ?? 0;
  const stockAvailable = selectedProduct ? selectedProduct.quantity + alreadyAllocated : 0;
  const overStock = Boolean(selectedProduct) && requestedQty > stockAvailable;
  const isLowStock =
    Boolean(selectedProduct) && selectedProduct.quantity <= selectedProduct.min_stock_alert;
  const canAddProduct =
    Boolean(selectedProduct) && requestedQty > 0 && !overStock;

  const servicesTotal = selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const partsTotal = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  return (
    <Card className="space-y-6 h-fit">
      <CardTitle className="flex items-center gap-2 border-b border-border pb-3">
        <Boxes className="w-5 h-5 text-text-subtle" aria-hidden /> Peças e Mão de Obra
      </CardTitle>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Mão de Obra (R$)"
          type="number"
          step="0.01"
          min="0"
          value={serviceValue}
          onChange={(e) => setServiceValue(e.target.value)}
          className="font-mono tabular-nums"
        />
        <Input
          label="Desconto (R$)"
          type="number"
          step="0.01"
          min="0"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className="font-mono tabular-nums"
        />
      </div>

      <div className="space-y-3 pt-3 border-t border-border">
        <SectionLabel>Adicionar Peças do Estoque</SectionLabel>
        <Select
          aria-label="Buscar peça no estoque"
          value={currentProductId}
          onChange={(e) => {
            setCurrentProductId(e.target.value);
            setProductAddError('');
          }}
        >
          <option value="">Buscar peça no estoque...</option>
          {inventory.map((prod) => (
            <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
              {prod.name} (SKU: {prod.sku} • Saldo: {prod.quantity} un • R$ {prod.sale_price})
            </option>
          ))}
        </Select>

        <div className="flex gap-2 items-start">
          <div className="w-24 shrink-0">
            <Input
              type="number"
              min="1"
              aria-label="Quantidade de peças"
              placeholder="Qtd"
              value={currentProductQty}
              onChange={(e) => {
                setCurrentProductQty(e.target.value);
                setProductAddError('');
              }}
              className="text-center font-mono tabular-nums"
            />
            {selectedProduct && (
              <div className="mt-1.5 space-y-1">
                <span
                  className={cn(
                    'block text-caption',
                    overStock ? 'text-danger font-semibold' : 'text-text-subtle',
                  )}
                >
                  Saldo + Alocado: {stockAvailable} un
                </span>
                {!overStock && isLowStock && (
                  <span className="text-caption text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                    Estoque Baixo (Mín: {selectedProduct.min_stock_alert})
                  </span>
                )}
              </div>
            )}
          </div>
          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            disabled={!canAddProduct}
            onClick={handleAddProduct}
            className="flex-1"
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

      <LineItemList
        label="Peças Alocadas"
        items={selectedProducts}
        emptyLabel="Nenhuma peça vinculada"
        onRemove={(prod) => handleRemoveProduct(prod.product_id)}
        removeLabel="Remover peça"
      />

      <div className="space-y-3 pt-3 border-t border-border">
        <SectionLabel>Adicionar Serviços</SectionLabel>
        <Select
          aria-label="Buscar serviço do catálogo"
          value={currentServiceId}
          onChange={(e) => handleServiceSelect(e.target.value)}
        >
          <option value="">Buscar serviço do catálogo...</option>
          {availableServices.map((serv) => (
            <option key={serv.id} value={serv.id}>
              {serv.nome} (Preço Padrão: {brl(Number(serv.preco_padrao))})
            </option>
          ))}
        </Select>
        <div className="flex gap-2 items-start">
          <Input
            type="number"
            min="1"
            aria-label="Quantidade de serviços"
            placeholder="Qtd"
            value={currentServiceQty}
            onChange={(e) => setCurrentServiceQty(e.target.value)}
            wrapperClassName="w-16 shrink-0"
            className="text-center font-mono tabular-nums"
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            aria-label="Valor unitário do serviço"
            placeholder="Valor Unitário (R$)"
            value={currentServicePrice}
            onChange={(e) => setCurrentServicePrice(e.target.value)}
            wrapperClassName="flex-1"
            className="font-mono tabular-nums"
          />
          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            disabled={!currentServiceId}
            onClick={handleAddService}
            className="shrink-0"
          >
            Adicionar
          </Button>
        </div>
      </div>

      <LineItemList
        label="Serviços Vinculados"
        items={selectedServices}
        emptyLabel="Nenhum serviço vinculado"
        onRemove={(serv) => handleRemoveService(serv.service_id)}
        removeLabel="Remover serviço"
      />

      <div className="pt-4 border-t border-border">
        <dl className="bg-surface-sunken border border-border p-4 space-y-2.5">
          {[
            { label: 'Mão de Obra Geral', value: parseFloat(serviceValue || '0') },
            { label: 'Serviços do Catálogo', value: servicesTotal },
            { label: 'Peças Utilizadas', value: partsTotal },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-baseline gap-3 text-small">
              <dt className="text-text-muted">{row.label}</dt>
              <dd className="font-mono tabular-nums font-semibold text-text">{brl(row.value)}</dd>
            </div>
          ))}

          {parseFloat(discount) > 0 && (
            <div className="flex justify-between items-baseline gap-3 text-small pt-2.5 border-t border-border">
              <dt className="text-danger font-semibold">Desconto Aplicado</dt>
              <dd className="font-mono tabular-nums font-semibold text-danger">
                − {brl(parseFloat(discount))}
              </dd>
            </div>
          )}

          <div className="flex justify-between items-baseline gap-3 pt-2.5 border-t border-border-strong">
            <dt className="text-caption uppercase tracking-wider text-text">Valor Total do Serviço</dt>
            <dd className="text-h3 font-mono tabular-nums text-brand">
              {brl(parseFloat(totalValue))}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
