'use client';
import React from 'react';
import { CheckCircle2, ExternalLink, Banknote, CreditCard } from 'lucide-react';
import Link from 'next/link';
import {
  Button,
  EmptyState,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
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

export function PaymentTable({ orders, mode, onPaymentSuccess }: PaymentTableProps) {
  const [modalOrder, setModalOrder] = React.useState<Order | null>(null);

  const formatCurrency = (v: number) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Banknote />}
        title={
          mode === 'pending'
            ? 'Nenhuma OS pendente de pagamento'
            : 'Nenhum pagamento registrado no período'
        }
        description={
          mode === 'pending'
            ? 'Tudo em dia: não há valores a receber neste recorte.'
            : 'Ajuste o período para ver recebimentos anteriores.'
        }
      />
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

      <Table>
        <THead>
          <TR>
            <TH>OS</TH>
            <TH>Cliente</TH>
            <TH className="hidden md:table-cell">Status</TH>
            <TH className="hidden sm:table-cell">
              {mode === 'pending' ? 'Criada em' : 'Pago em'}
            </TH>
            {mode === 'paid' && <TH className="hidden md:table-cell">Forma</TH>}
            <TH align="right">Valor</TH>
            <TH align="right">Ações</TH>
          </TR>
        </THead>
        <TBody>
          {orders.map((order) => (
            <TR key={order.id}>
              <TD numeric className="text-text-muted">
                {order.codigo_os ?? order.id.slice(0, 8).toUpperCase()}
              </TD>
              <TD className="font-medium truncate max-w-[160px]">
                {order.clients?.name ?? '—'}
              </TD>
              <TD className="hidden md:table-cell">
                <StatusBadge status={order.status} />
              </TD>
              <TD numeric className="text-text-muted hidden sm:table-cell">
                {mode === 'pending' ? formatDate(order.created_at) : formatDate(order.payment_date)}
              </TD>
              {mode === 'paid' && (
                <TD className="text-text-muted hidden md:table-cell">
                  {order.payment_method ?? '—'}
                </TD>
              )}
              <TD align="right" numeric className="font-semibold">
                {formatCurrency(order.total_value)}
              </TD>
              <TD align="right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="p-1.5 rounded-lg text-text-subtle hover:text-text hover:bg-surface-overlay transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    title="Abrir OS"
                    aria-label={`Abrir OS ${order.codigo_os ?? order.id.slice(0, 8)}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                  </Link>
                  {mode === 'pending' ? (
                    <Button
                      size="sm"
                      icon={<CheckCircle2 className="w-3 h-3" />}
                      onClick={() => setModalOrder(order)}
                    >
                      Pago
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<CreditCard className="w-3 h-3" />}
                      onClick={() => setModalOrder(order)}
                      title="Alterar forma de pagamento"
                    >
                      Alterar
                    </Button>
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
