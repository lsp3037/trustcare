'use client';

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';

const PAYMENT_METHODS = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Transferência Bancária',
  'Boleto Bancário',
  'Outro',
];

/** YYYY-MM-DD no fuso local — `toISOString()` empurraria a data um dia atrás. */
function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MarkAsPaidModalProps {
  order: {
    id: string;
    codigo_os?: string;
    total_value: number;
    payment_method?: string;
    payment_date?: string;
    clients?: { name: string };
  };
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

export function MarkAsPaidModal({ order, onClose, onSuccess }: MarkAsPaidModalProps) {
  const toast = useToast();
  const [method, setMethod] = useState(order.payment_method || 'Pix');
  const [paymentDate, setPaymentDate] = useState(
    order.payment_date ? toDateInput(new Date(order.payment_date)) : toDateInput(new Date()),
  );
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          pago: true,
          payment_status: 'pago',
          payment_method: method,
          payment_date: new Date(paymentDate).toISOString(),
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      toast.success('Pagamento registrado', {
        description: `OS ${order.codigo_os ?? order.id.slice(0, 8)} — ${method}`,
      });
      onSuccess(order.id);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível salvar o pagamento', {
        description: 'Verifique a conexão e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar Pagamento"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={loading}
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={handleConfirm}
          >
            Confirmar Pagamento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface-sunken border border-border rounded-xl">
          <p className="text-caption text-text-muted font-mono tabular-nums">
            OS {order.codigo_os ?? order.id.slice(0, 8)}
          </p>
          <p className="text-small font-medium text-text mt-0.5">
            {order.clients?.name ?? 'Cliente'}
          </p>
          <p className="text-h2 font-mono tabular-nums text-text mt-1">
            R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <Select
          label="Forma de Pagamento"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>

        <Input
          label="Data do Recebimento"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />
      </div>
    </Modal>
  );
}
