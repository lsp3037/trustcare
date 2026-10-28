'use client';

import React, { useState } from 'react';
import { Boxes, Wrench, Plus, Trash2, Pencil, AlertTriangle, ShoppingBag, Package, ExternalLink } from 'lucide-react';
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
  Badge,
  SegmentedControl,
} from '@/components/ui';
import { EditCustomPartModal } from '@/components/orders/EditCustomPartModal';
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
  handleRemoveProduct: (itemOrId: any) => void;
  handleUpdateCustomProduct?: (item: any) => void;
  // Peça Sob Demanda / Sob Encomenda
  customPartName: string;
  setCustomPartName: (val: string) => void;
  customPartQty: string;
  setCustomPartQty: (val: string) => void;
  customPartPrice: string;
  setCustomPartPrice: (val: string) => void;
  customPartCost: string;
  setCustomPartCost: (val: string) => void;
  customPartLink: string;
  setCustomPartLink: (val: string) => void;
  handleAddCustomProduct: () => void;
  // Serviços
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
 * Tabela de itens adicionados (peças ou serviços).
 */
function ItemsTable({
  itemLabel,
  items,
  emptyLabel,
  onRemove,
  onEdit,
  isParts = false,
}: {
  itemLabel: string;
  items: any[];
  emptyLabel: string;
  onRemove: (itemOrId: any) => void;
  onEdit?: (item: any) => void;
  isParts?: boolean;
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
            <span className="sr-only">Ações</span>
          </TH>
        </TR>
      </THead>
      <TBody>
        {items.map((item, idx) => {
          const isCustom = item.is_custom || !item.product_id;
          const rowKey = item.id || item.product_id || item.service_id || `item-${idx}`;

          return (
            <TR key={rowKey}>
              <TD className="pl-0 font-semibold">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{item.name}</span>
                  {isParts && isCustom && (
                    <Badge tone="warning">
                      Sob Encomenda
                    </Badge>
                  )}
                  {isParts && item.supplier_link && (
                    <a
                      href={item.supplier_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-caption text-brand hover:underline font-normal"
                      title="Abrir fornecedor"
                    >
                      <ExternalLink className="w-3 h-3" /> Link
                    </a>
                  )}
                </div>
                {isParts && isCustom && item.unit_cost > 0 && (
                  <span className="text-caption text-text-muted block font-mono">
                    Custo estimado: {brl(item.unit_cost)}
                  </span>
                )}
              </TD>
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
                <div className="flex items-center justify-center gap-1">
                  {isParts && isCustom && onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      aria-label={`Editar ${item.name}`}
                      title="Editar peça sob encomenda"
                      className="p-1 text-text-subtle hover:text-brand transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(item.id || item.product_id || item.service_id || item)}
                    aria-label={`Remover ${item.name}`}
                    className="p-1 text-text-subtle hover:text-danger transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </TD>
            </TR>
          );
        })}
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
  handleUpdateCustomProduct,
  customPartName, setCustomPartName,
  customPartQty, setCustomPartQty,
  customPartPrice, setCustomPartPrice,
  customPartCost, setCustomPartCost,
  customPartLink, setCustomPartLink,
  handleAddCustomProduct,
  availableServices,
  currentServiceId,
  handleServiceSelect,
  currentServiceQty, setCurrentServiceQty,
  currentServicePrice, setCurrentServicePrice,
  handleAddService,
  selectedServices,
  handleRemoveService,
}: ItemsSectionProps) {
  const [partMode, setPartMode] = useState<'inventory' | 'custom'>('inventory');
  const [editingCustomItem, setEditingCustomItem] = useState<any | null>(null);

  const selectedProduct = inventory.find((p) => p.id === currentProductId);
  const requestedQty = parseInt(currentProductQty) || 0;
  const overStock = Boolean(selectedProduct) && requestedQty > selectedProduct.quantity;
  const isLowStock =
    Boolean(selectedProduct) && selectedProduct.quantity <= selectedProduct.min_stock_alert;
  const canAddProduct = Boolean(selectedProduct) && requestedQty > 0 && !overStock;

  // Atalho rápido: se o produto selecionado no estoque estiver com saldo zero, permite mudar direto para encomenda
  const handleConvertToCustom = () => {
    if (!selectedProduct) return;
    setCustomPartName(selectedProduct.name);
    setCustomPartQty(currentProductQty || '1');
    setCustomPartPrice(selectedProduct.sale_price?.toString() || '');
    setCustomPartCost(selectedProduct.cost_price?.toString() || '');
    setPartMode('custom');
    setCurrentProductId('');
    setProductAddError('');
  };

  return (
    <>
      {/* Seção de Peças e Produtos Utilizados */}
      <Card padding="sm" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-text-subtle" aria-hidden /> Peças de Reposição da O.S.
          </CardTitle>

          <SegmentedControl
            label="Origem da Peça"
            value={partMode}
            onChange={(val) => {
              setPartMode(val);
              setProductAddError('');
            }}
            options={[
              { value: 'inventory', label: 'Do Estoque', icon: <Package className="w-3.5 h-3.5" /> },
              { value: 'custom', label: 'Sob Encomenda (Para Pedido)', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
            ]}
          />
        </div>

        {partMode === 'inventory' ? (
          /* Modo: Peça do Estoque Físico */
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
                  <option key={prod.id} value={prod.id}>
                    {prod.name} (Saldo: {prod.quantity} un | {brl(prod.sale_price)})
                    {prod.quantity === 0 ? ' [SEM ESTOQUE]' : ''}
                  </option>
                ))}
                <option value="create_new_product">+ Cadastrar Novo Produto no Inventário</option>
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
                {selectedProduct && selectedProduct.quantity > 0 && (
                  <div className="space-y-1 mt-1.5">
                    <span
                      className={cn(
                        'block text-caption',
                        overStock ? 'text-danger font-semibold' : 'text-text-subtle',
                      )}
                    >
                      Saldo: {selectedProduct.quantity} un
                    </span>
                    {!overStock && isLowStock && (
                      <span className="text-caption text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                        Estoque Baixo
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

            {selectedProduct && selectedProduct.quantity === 0 && (
              <div className="p-2.5 bg-warning/10 border border-warning/25 text-small text-text flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-warning font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Item zerado no estoque físico.
                </span>
                <button
                  type="button"
                  onClick={handleConvertToCustom}
                  className="text-caption font-bold text-brand hover:underline cursor-pointer"
                >
                  Pedir Sob Encomenda →
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Modo: Peça Sob Encomenda / Externa */
          <div className="space-y-3 bg-surface-sunken p-3.5 border border-border">
            <div className="flex items-center gap-2 text-caption text-text-subtle">
              <ShoppingBag className="w-3.5 h-3.5 text-warning" />
              <span>Esta peça será orçada ao cliente e só será pedida ao fornecedor após autorização.</span>
            </div>

            <Input
              label="Descrição / Nome da Peça"
              placeholder="Ex: Tela OLED iPhone 15 Pro Original Nacional"
              value={customPartName}
              onChange={(e) => {
                setCustomPartName(e.target.value);
                setProductAddError('');
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Qtd"
                type="number"
                min="1"
                value={customPartQty}
                onChange={(e) => setCustomPartQty(e.target.value)}
                className="text-center font-mono tabular-nums"
              />
              <Input
                label="Custo Est. (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={customPartCost}
                onChange={(e) => setCustomPartCost(e.target.value)}
                className="font-mono tabular-nums"
              />
              <Input
                label="Preço Venda ao Cliente (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={customPartPrice}
                onChange={(e) => {
                  setCustomPartPrice(e.target.value);
                  setProductAddError('');
                }}
                className="font-mono tabular-nums font-semibold"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="Link do Fornecedor / Anúncio (opcional)"
                  placeholder="https://mercadolivre.com.br/..."
                  value={customPartLink}
                  onChange={(e) => setCustomPartLink(e.target.value)}
                />
              </div>

              <Button
                icon={<Plus className="w-4 h-4" />}
                disabled={!customPartName.trim() || !(parseFloat(customPartPrice) > 0)}
                onClick={handleAddCustomProduct}
                className="shrink-0 w-full sm:w-auto"
              >
                Adicionar Peça Sob Encomenda
              </Button>
            </div>
          </div>
        )}

        {productAddError && (
          <p
            role="alert"
            className="p-2.5 bg-danger/10 border border-danger/25 text-small font-semibold text-danger flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            {productAddError}
          </p>
        )}

        <ItemsTable
          itemLabel="Peça"
          items={selectedProducts}
          emptyLabel="Nenhuma peça vinculada a esta ordem de serviço."
          onRemove={handleRemoveProduct}
          onEdit={(item) => setEditingCustomItem(item)}
          isParts
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
          emptyLabel="Nenhum serviço do catálogo adicionado a esta ordem de serviço."
          onRemove={handleRemoveService}
        />
      </Card>

      <EditCustomPartModal
        open={Boolean(editingCustomItem)}
        onClose={() => setEditingCustomItem(null)}
        item={editingCustomItem}
        onSave={(updated) => {
          if (handleUpdateCustomProduct) {
            handleUpdateCustomProduct(updated);
          }
          setEditingCustomItem(null);
        }}
      />
    </>
  );
}
