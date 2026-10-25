'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Clock } from 'lucide-react';
import DatePickerWithRange from '@/components/DatePickerWithRange';
import { useUser } from '@/lib/context/UserContext';
import { useDashboardData, DateRange } from '@/components/hooks/useDashboardData';
import { KpiOverviewCards } from '@/components/dashboard/KpiOverviewCards';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { FinancialChartSection } from '@/components/dashboard/FinancialChartSection';
import { Badge, buttonClasses } from '@/components/ui';

/** "Últimos 30 dias" quando o período termina hoje; senão, "23/09 – 22/10". */
function formatPeriodLabel(range: DateRange | null) {
  if (!range) return undefined;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((range.to.getTime() - range.from.getTime()) / dayMs) + 1;
  if (range.to.toDateString() === new Date().toDateString()) {
    return days === 1 ? 'Hoje' : `Últimos ${days} dias`;
  }
  const short = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${short(range.from)} – ${short(range.to)}`;
}

export default function DashboardOverviewPage() {
  const { role, isAdmin } = useUser();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const {
    stats,
    previousStats,
    paymentDistribution,
    recentOrders,
    chartData,
    loading,
    handleUpdateStatus
  } = useDashboardData(dateRange);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Dashboard</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-small text-text-muted">
              Indicadores e visão geral da assistência técnica.
            </span>
            <span className="hidden sm:inline h-4 w-px bg-border" />
            <Badge tone="brand">
              PJ: {stats.pjCount} {stats.pjCount === 1 ? 'cliente' : 'clientes'}
            </Badge>
            <Badge>
              PF: {stats.pfCount} {stats.pfCount === 1 ? 'cliente' : 'clientes'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Período Global */}
          <DatePickerWithRange onChange={(range) => setDateRange(range)} />

          <Link href="/dashboard/orders" className={buttonClasses({ variant: 'secondary' })}>
            Ver Todas OS
          </Link>
          <Link href="/dashboard/orders?new=true" className={buttonClasses()}>
            <Plus className="w-4 h-4" /> Nova OS
          </Link>
        </div>
      </div>

      {/* Alerta de SLA Operacional (Ordens em Aberto / Prazo Crítico) */}
      {!loading && stats.openOrders > 0 && (
        <div className="p-3.5 rounded-2xl bg-warning/10 border border-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-warning/20 text-warning shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-small font-semibold text-warning">
                Atenção: {stats.openOrders} {stats.openOrders === 1 ? 'ordem de serviço ativa aguarda' : 'ordens de serviço ativas aguardam'} conclusão ou laudo técnico
              </p>
              <p className="text-caption text-text-muted">
                Acompanhe a bancada técnica para evitar atrasos no prazo de entrega prometido.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/orders?status=Ativas"
            className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'shrink-0 self-start sm:self-auto' })}
          >
            Ver Fila Crítica
          </Link>
        </div>
      )}

      {/* Grid de Cards Estatísticos (KPIs) */}
      <KpiOverviewCards
        stats={stats}
        previousStats={previousStats}
        periodLabel={formatPeriodLabel(dateRange)}
        chartData={chartData}
        loading={loading}
        isAdmin={isAdmin}
        role={role}
      />

      {/* Grid de Seções Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ordens de Serviço Recentes */}
        <RecentOrdersTable
          recentOrders={recentOrders}
          isAdmin={isAdmin}
          onUpdateStatus={handleUpdateStatus}
        />

        {/* Módulo de Gráfico de Faturamento (Apenas Admin) */}
        {isAdmin && (
          <FinancialChartSection
            chartData={chartData}
            paymentDistribution={paymentDistribution}
            billingTotal={stats.billing}
          />
        )}
      </div>
    </div>
  );
}
