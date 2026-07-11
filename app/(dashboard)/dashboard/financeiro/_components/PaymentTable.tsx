'use client';
import React from 'react';
import { CheckCircle2, ExternalLink, Banknote, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { MarkAsPaidModal } from './MarkAsPaidModal';

interface Order {
  id: string;
  codigo_os?: string;
  total_value: number;
  status: string;
  created_at: string;
  payment_method?: string;
  payment_date?: string;
  pago?: boolean;
  clients?: { name: string };
}

interface PaymentTableProps {
  orders: Order[];
  mode: 'pending' | 'paid';
  onPaymentSuccess?: (orderId: string) => void;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    'Finalizado': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Pronto para Retirada': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Cancelado': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 border rounded-none ${map[status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
      {status}
    </span>
  );
}

export function PaymentTable({ orders, mode, onPaymentSuccess }: PaymentTableProps) {
  const [modalOrder, setModalOrder] = React.useState<Order | null>(null);

  const formatCurrency = (v: number) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
        <Banknote className="w-8 h-8 opacity-30" />
        <p className="text-sm">
          {mode === 'pending' ? 'Nenhuma OS pendente de pagamento.' : 'Nenhum pagamento registrado no período.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {modalOrder && (
        <MarkAsPaidModal
          order={modalOrder}
          onClose={() => setModalOrder(null)}
          onSuccess={(id) => {
            setModalOrder(null);
            onPaymentSuccess?.(id);
          }}
        />
      )}

      {/* Desktop table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">OS</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                {mode === 'pending' ? 'Criada em' : 'Pago em'}
              </th>
              {mode === 'paid' && (
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Forma</th>
              )}
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3 px-4 font-mono text-xs text-slate-300">
                  {order.codigo_os ?? order.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="py-3 px-4 text-slate-200 font-medium truncate max-w-[160px]">
                  {order.clients?.name ?? '—'}
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  {statusBadge(order.status)}
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs hidden sm:table-cell">
                  {mode === 'pending'
                    ? formatDate(order.created_at)
                    : formatDate(order.payment_date)}
                </td>
                {mode === 'paid' && (
                  <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                    {order.payment_method ?? '—'}
                  </td>
                )}
                <td className="py-3 px-4 text-right font-semibold tabular-nums text-emerald-400">
                  {formatCurrency(order.total_value)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-slate-500 hover:text-blue-400 transition-colors"
                      title="Abrir OS"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    {mode === 'pending' && (
                      <button
                        onClick={() => setModalOrder(order)}
                        className="text-xs font-semibold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none transition-colors flex items-center gap-1"
                        title="Marcar como pago"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Pago
                      </button>
                    )}
                    {mode === 'paid' && (
                      <button
                        onClick={() => setModalOrder(order)}
                        className="text-xs font-medium px-2 py-1 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-none transition-colors flex items-center gap-1"
                        title="Alterar/Selecionar forma de pagamento"
                      >
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        Alterar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
