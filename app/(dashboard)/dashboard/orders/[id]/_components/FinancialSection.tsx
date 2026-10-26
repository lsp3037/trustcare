'use client';
import React, { useState } from 'react';
import { Boxes, Plus, Trash2, AlertTriangle, ExternalLink, ShoppingBag, Package } from 'lucide-react';
import { Card, CardTitle, Button, Input, Select, Badge, SegmentedControl } from '@/components/ui';
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
  handleRemoveProduct: (item: any) => void;
  // Peça sob encomenda / avulsa
  customPartName: string;
  setCustomPartName: (v: string) => void;
  customPartQty: string;
  setCustomPartQty: (v: string) => void;
  customPartPrice: string;
  setCustomPartPrice: (v: string) => void;
  customPartCost: string;
  setCustomPartCost: (v: string) => void;
  customPartLink: string;
  setCustomPartLink: (v: string) => void;
  handleAddCustomProduct: () => void;
  // Serviços
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
    <p className="text-caption uppercase tracking-wider text-text-subtle font-semibold">{children}</p>
  );
}

const PART_STATUS_LABELS: Record<string, { label: string; tone: 'warning' | 'info' | 'success' | 'neutral' }> = {
  pendente: { label: 'Aguardando Aprovação', tone: 'neutral' },
  a_comprar: { label: 'A Comprar', tone: 'warning' },
  pedido_realizado: { label: 'Em Trânsito / Pedido', tone: 'info' },
  recebido: { label: 'Recebido na Loja', tone: 'success' },
  em_estoque: { label: 'Em Estoque', tone: 'neutral' },
};

/**
 * Lista de itens alocados (peças ou serviços).
 */
function LineItemList({
  label,
  items,
  emptyLabel,
  onRemove,
  removeLabel,
  isPartsList = false,
}: {
  label: string;
  items: any[];
  emptyLabel: string;
  onRemove: (item: any) => void;
  removeLabel: string;
  isPartsList?: boolean;
}) {
  return (
    <div className="pt-3 border-t border-border">
      <SectionLabel>{label}</SectionLabel>
      {items.length === 0 ? (
        <p className="text-center py-4 mt-2 text-small text-text-subtle bg-surface-sunken border border-border">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2 mt-2 max-h-[220px] overflow-y-auto pr-1">
          {items.map((item) => {
            const isCustom = item.is_custom || !item.product_id;
            const statusConfig = isCustom && item.part_status ? PART_STATUS_LABELS[item.part_status] : null;

            return (
              <li
                key={item.id}
                className="bg-surface-sunken border border-border p-3 flex justify-between items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-small font-semibold text-text truncate">{item.name}</p>
                    {isCustom && (
                      <Badge tone="warning">
                        Sob Encomenda
                      </Badge>
                    )}
                    {statusConfig && (
                      <Badge tone={statusConfig.tone}>
                        {statusConfig.label}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-caption font-mono tabular-nums text-text-subtle mt-0.5">
                    <span>{item.quantity} un • {brl(Number(item.unit_price))}</span>
                    {isCustom && item.unit_cost > 0 && (
                      <span>(Custo Est: {brl(Number(item.unit_cost))})</span>
                    )}
                    {item.supplier_link && (
                      <a
                        href={item.supplier_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-caption text-brand hover:underline font-sans ml-1"
                        title="Abrir link do fornecedor"
                      >
                        <ExternalLink className="w-3 h-3" aria-hidden /> Fornecedor
                      </a>
                    )}
                  </div>
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
            );
          })}
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
  customPartName, setCustomPartName,
  customPartQty, setCustomPartQty,
  customPartPrice, setCustomPartPrice,
  customPartCost, setCustomPartCost,
  customPartLink, setCustomPartLink,
  handleAddCustomProduct,
  availableServices,
  currentServiceId, handleServiceSelect,
  currentServiceQty, setCurrentServiceQty,
  currentServicePrice, setCurrentServicePrice,
  handleAddService,
  selectedServices, handleRemoveService,
  totalValue,
  productAddError, setProductAddError
}: FinancialSectionProps) {
  const [partSourceMode, setPartSourceMode] = useState<'inventory' | 'custom'>('inventory');

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

  // Ação rápida para transferir produto zerado do estoque para encomenda
  const handleConvertToCustom = () => {
    if (!selectedProduct) return;
    setCustomPartName(selectedProduct.name);
    setCustomPartQty(currentProductQty || '1');
    setCustomPartPrice(selectedProduct.sale_price?.toString() || '');
    setCustomPartCost(selectedProduct.cost_price?.toString() || '');
    setPartSourceMode('custom');
    setCurrentProductId('');
    setProductAddError('');
  };

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

      {/* Adicionar Peças */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <SectionLabel>Peças da Ordem de Serviço</SectionLabel>
          <SegmentedControl
            label="Origem da Peça"
            value={partSourceMode}
            onChange={(val) => {
              setPartSourceMode(val);
              setProductAddError('');
            }}
            options={[
              { value: 'inventory', label: 'Do Estoque', icon: <Package className="w-3.5 h-3.5" /> },
              { value: 'custom', label: 'Sob Encomenda (Para Pedido)', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
            ]}
          />
        </div>

        {partSourceMode === 'inventory' ? (
          /* Modo: Peça do Estoque Físico */
          <div className="space-y-3">
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
                <option key={prod.id} value={prod.id}>
                  {prod.name} (SKU: {prod.sku} • Saldo: {prod.quantity} un • R$ {prod.sale_price})
                  {prod.quantity === 0 ? ' [SEM ESTOQUE]' : ''}
                </option>
              ))}
            </Select>

            {selectedProduct && selectedProduct.quantity === 0 && (
              <div className="p-2.5 bg-warning/10 border border-warning/25 text-small text-text flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-warning font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Item sem saldo no estoque físico.
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
                {selectedProduct && selectedProduct.quantity > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <span
                      className={cn(
                        'block text-caption',
                        overStock ? 'text-danger font-semibold' : 'text-text-subtle',
                      )}
                    >
                      Saldo: {stockAvailable} un
                    </span>
                    {!overStock && isLowStock && (
                      <span className="text-caption text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                        Estoque Baixo
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
                Adicionar Peça do Estoque
              </Button>
            </div>
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

            <div className="grid grid-cols-3 gap-2">
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
                label="Preço Venda (R$)"
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

            <Input
              label="Link do Fornecedor / Anúncio (opcional)"
              placeholder="https://mercadolivre.com.br/..."
              value={customPartLink}
              onChange={(e) => setCustomPartLink(e.target.value)}
            />

            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              disabled={!customPartName.trim() || !(parseFloat(customPartPrice) > 0)}
              onClick={handleAddCustomProduct}
              className="w-full"
            >
              Adicionar Peça Sob Encomenda
            </Button>
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
      </div>

      <LineItemList
        label="Peças Vinculadas à O.S"
        items={selectedProducts}
        emptyLabel="Nenhuma peça vinculada"
        onRemove={(prod) => handleRemoveProduct(prod)}
        removeLabel="Remover peça"
        isPartsList
      />

      {/* Adicionar Serviços */}
      <div className="space-y-3 pt-3 border-t border-border">
        <SectionLabel>Adicionar Serviços do Catálogo</SectionLabel>
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
            { label: 'Peças da OS (Estoque + Encomenda)', value: partsTotal },
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
