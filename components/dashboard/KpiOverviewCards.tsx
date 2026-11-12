'use client';

import React from 'react';
import { Banknote, Wrench, ReceiptText, ClipboardCheck, Contact, PackageMinus } from 'lucide-react';
import { DashboardStats, PreviousPeriodStats } from '@/components/hooks/useDashboardData';
import { SkeletonCards } from '@/components/ui';
import { GlassKpiCard as KpiCard, KPI_ICON_CLASS as ICON_CLASS } from './GlassKpiCard';
import { SECTION_TITLE } from './glass';

interface KpiOverviewCardsProps {
  stats: DashboardStats;
  previousStats?: PreviousPeriodStats | null;
  /** Texto do período no cabeçalho da faixa, ex.: "Últimos 30 dias". */
  periodLabel?: string;
  loading: boolean;
  isAdmin: boolean;
  role: string | null;
}

const brl = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const int = (value: number) => Math.round(value).toLocaleString('pt-BR');

export function KpiOverviewCards({
  stats,
  previousStats,
  periodLabel,
  loading,
  isAdmin,
  role,
}: KpiOverviewCardsProps & { chartData?: import('@/components/hooks/useDashboardData').ChartDay[] }) {
  if (loading) {
    return <SkeletonCards count={4} />;
  }

  const hasLowStock = stats.lowStockCount > 0;

  return (
    <section className="space-y-4" aria-label="Indicadores do período">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={SECTION_TITLE}>Visão geral</h2>
        {periodLabel && <span className="text-caption font-semibold text-text-muted">{periodLabel}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            <KpiCard
              index={0}
              icon={<Banknote className={ICON_CLASS} strokeWidth={1.75} />}
              label="Faturamento"
              value={stats.billing}
              format={brl}
              previous={previousStats?.billing}
              hint="Soma de OS concluídas / entregues"
            />
            <KpiCard
              index={1}
              tone="warning"
              icon={<Wrench className={ICON_CLASS} strokeWidth={1.75} />}
              label="OS Abertas"
              value={stats.openOrders}
              format={int}
              hint="Aguardando aprovação ou peças"
              href="/dashboard/orders?status=Ativas"
            />
            <KpiCard
              index={2}
              tone="info"
              icon={<ReceiptText className={ICON_CLASS} strokeWidth={1.75} />}
              label="Ticket Médio"
              value={stats.ticketMedio}
              format={brl}
              previous={previousStats?.ticketMedio}
              hint="Valor médio por OS paga"
            />
          </>
        ) : (
          <>
            <KpiCard
              index={0}
              tone="warning"
              icon={<Wrench className={ICON_CLASS} strokeWidth={1.75} />}
              label="OS Abertas"
              value={stats.openOrders}
              format={int}
              hint={role === 'technician' ? 'Na sua fila, aguardando análise ou peças' : 'Aguardando análise ou peças'}
              href="/dashboard/orders?status=Ativas"
            />
            <KpiCard
              index={1}
              icon={<ClipboardCheck className={ICON_CLASS} strokeWidth={1.75} />}
              label="OS Concluídas"
              value={stats.completedOrders}
              format={int}
              previous={previousStats?.completedOrders}
              hint="Finalizadas ou prontas para entrega"
              href="/dashboard/orders?status=Concluidas"
            />
            <KpiCard
              index={2}
              tone="info"
              icon={<Contact className={ICON_CLASS} strokeWidth={1.75} />}
              label="Total de Clientes"
              value={stats.totalClients}
              format={int}
              hint="Cadastrados na base global"
              href="/dashboard/clients"
            />
          </>
        )}

        <KpiCard
          index={3}
          tone={hasLowStock ? 'danger' : 'brand'}
          icon={<PackageMinus className={ICON_CLASS} strokeWidth={1.75} />}
          label="Estoque Baixo"
          value={stats.lowStockCount}
          format={int}
          hint={hasLowStock ? 'Itens abaixo do estoque mínimo' : 'Nenhum item abaixo do mínimo'}
          href="/dashboard/inventory?filter=low_stock"
        />
      </div>
    </section>
  );
}
