'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ArrowUpRight } from 'lucide-react';
import { ServiceOrder } from '@/components/hooks/useDashboardData';
import { OS_STATUS_FLOW, getStatusDot } from '@/lib/design/status';
import {
  Card,
  CardHeader,
  CardTitle,
  StatusBadge,
  EmptyState,
  Modal,
  Button,
  buttonClasses,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface RecentOrdersTableProps {
  recentOrders: ServiceOrder[];
  isAdmin: boolean;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export function RecentOrdersTable({ recentOrders, isAdmin, onUpdateStatus }: RecentOrdersTableProps) {
  const [statusModalOrder, setStatusModalOrder] = useState<ServiceOrder | null>(null);

  const formatEquipmentDetails = (details: string) => {
    if (!details) return '—';
    return details.replace(/\s*\(S\/N:\s*(—|null|undefined|)?\)/gi, '').trim();
  };

  return (
    <Card className={cn('flex flex-col', isAdmin ? 'lg:col-span-2' : 'lg:col-span-3')}>
      <CardHeader className="items-center">
        <div>
          <CardTitle>Ordens de Serviço Recentes</CardTitle>
          <p className="text-caption text-text-subtle mt-0.5">
            Movimentações no período selecionado.
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="text-small font-semibold text-brand hover:text-brand-hover flex items-center gap-1 transition-colors shrink-0"
        >
          Ver mais <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
      </CardHeader>

      <div className="flex-1">
        {recentOrders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Nenhuma OS no período selecionado"
            description="Ajuste o filtro de datas ou crie uma nova Ordem de Serviço para começar."
            action={
              <Link
                href="/dashboard/orders?new=true"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                Nova OS
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="pl-0">OS #</TH>
                <TH>Cliente</TH>
                <TH>Equipamento</TH>
                <TH>Status</TH>
                <TH align="right">Valor</TH>
                <TH align="right" className="pr-0">
                  <span className="sr-only">Ações</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {recentOrders.map((order) => (
                <TR key={order.id}>
                  <TD className="pl-0 font-mono font-bold text-brand">
                    #{order.codigo_os || order.id.slice(0, 6)}
                  </TD>
                  <TD
                    className="font-semibold truncate max-w-[160px]"
                    title={order.clients?.name || 'Cliente'}
                  >
                    {order.clients?.name || 'Cliente'}
                  </TD>
                  <TD
                    className="text-text-muted truncate max-w-[200px]"
                    title={order.equipment_details || ''}
                  >
                    {formatEquipmentDetails(order.equipment_details || '')}
                  </TD>
                  <TD>
                    <StatusBadge status={order.status} dot />
                  </TD>
                  <TD align="right" numeric className="font-semibold">
                    R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TD>
                  <TD align="right" className="pr-0">
                    <DropdownMenu label={`Ações da OS ${order.codigo_os}`}>
                      <DropdownMenuItem href={`/dashboard/orders/${order.id}`}>
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setStatusModalOrder(order)}>
                        Alterar Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => window.open(`/dashboard/orders/${order.id}/temp-print`, '_blank')}>
                        Imprimir OS
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      {/* Alteração de Status */}
      <Modal
        open={Boolean(statusModalOrder)}
        onClose={() => setStatusModalOrder(null)}
        title="Alterar Status da OS"
        description={statusModalOrder ? `OS ${statusModalOrder.codigo_os}` : undefined}
        size="sm"
        footer={
          <Button variant="ghost" onClick={() => setStatusModalOrder(null)}>
            Cancelar
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-1.5">
          {OS_STATUS_FLOW.map((status) => {
            const current = statusModalOrder?.status === status;
            return (
              <button
                key={status}
                type="button"
                aria-current={current || undefined}
                onClick={() => {
                  if (statusModalOrder) onUpdateStatus(statusModalOrder.id, status);
                  setStatusModalOrder(null);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 text-left px-3 py-2 text-small border transition-colors cursor-pointer rounded-xl',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  current
                    ? 'bg-brand/10 border-brand text-brand font-semibold'
                    : 'bg-surface-sunken border-border text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                <span className={cn('w-2 h-2 shrink-0', getStatusDot(status))} aria-hidden />
                {status}
              </button>
            );
          })}
        </div>
      </Modal>
    </Card>
  );
}
