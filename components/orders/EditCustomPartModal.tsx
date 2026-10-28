'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';

export interface EditCustomPartModalProps {
  open: boolean;
  onClose: () => void;
  item: any | null;
  onSave: (updatedItem: any) => void;
}

export function EditCustomPartModal({
  open,
  onClose,
  item,
  onSave,
}: EditCustomPartModalProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('0.00');
  const [unitPrice, setUnitPrice] = useState('0.00');
  const [supplierLink, setSupplierLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (item && open) {
      setName(item.custom_name || item.name || '');
      setQuantity(String(item.quantity || 1));
      setUnitCost(item.unit_cost !== undefined && item.unit_cost !== null ? String(item.unit_cost) : '0.00');
      setUnitPrice(item.unit_price !== undefined && item.unit_price !== null ? String(item.unit_price) : '0.00');
      setSupplierLink(item.supplier_link || '');
      setError('');
    }
  }, [item, open]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError('A descrição / nome da peça é obrigatória.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError('A quantidade deve ser de no mínimo 1 unidade.');
      return;
    }
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) {
      setError('O valor de venda deve ser maior que zero.');
      return;
    }
    const cost = parseFloat(unitCost) || 0;

    onSave({
      ...item,
      name: name.trim(),
      custom_name: name.trim(),
      quantity: qty,
      unit_cost: cost,
      unit_price: price,
      supplier_link: supplierLink.trim() || null,
    });

    onClose();
  };

  if (!item) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Peça Sob Encomenda"
      description="Ajuste o nome, quantidade, custos ou link da peça vinculada a esta Ordem de Serviço."
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="button" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <p
            role="alert"
            className="p-2.5 bg-danger/10 border border-danger/25 text-small font-semibold text-danger flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <Input
          label="Descrição / Nome da Peça *"
          placeholder="Ex: Touchpad Dell Latitude E5440"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Quantidade *"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="text-center font-mono tabular-nums"
          />
          <Input
            label="Custo Estimado (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            className="font-mono tabular-nums"
          />
          <Input
            label="Preço de Venda (R$) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => {
              setUnitPrice(e.target.value);
              setError('');
            }}
            className="font-mono tabular-nums font-semibold"
          />
        </div>

        <Input
          label="Link do Fornecedor / Anúncio (opcional)"
          placeholder="https://produto.mercadolivre.com.br/..."
          value={supplierLink}
          onChange={(e) => setSupplierLink(e.target.value)}
        />
      </form>
    </Modal>
  );
}
