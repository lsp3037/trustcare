'use client';

import React, { useState } from 'react';
import { X, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';
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
  const [method, setMethod] = useState(order.payment_method || 'Pix');
  const [paymentDate, setPaymentDate] = useState(
    order.payment_date
      ? new Date(order.payment_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
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
      onSuccess(order.id);
      onClose();
    } catch (err) {
      setError('Erro ao salvar pagamento. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-none w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-none">
              <CreditCard className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">Registrar Pagamento</h2>
          </div>
          <Button variant="ghost" size="sm" className="px-1" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-none">
            <p className="text-xs text-slate-400">OS {order.codigo_os ?? order.id.slice(0, 8)}</p>
            <p className="text-sm font-medium text-white mt-0.5">{order.clients?.name ?? 'Cliente'}</p>
            <p className="text-lg font-bold text-emerald-400 tabular-nums mt-1">
              R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Forma de Pagamento
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Data do Recebimento
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-none">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            loading={loading}
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={handleConfirm}
          >
            Confirmar Pagamento
          </Button>
        </div>
      </div>
    </div>
  );
}
