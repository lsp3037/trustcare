'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import DatePickerWithRange from '@/components/DatePickerWithRange';
import { useUser } from '@/lib/context/UserContext';
import { useDashboardData, DateRange } from '@/components/hooks/useDashboardData';
import { KpiOverviewCards } from '@/components/dashboard/KpiOverviewCards';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { FinancialChartSection } from '@/components/dashboard/FinancialChartSection';
import { Badge, buttonClasses } from '@/components/ui';

export default function DashboardOverviewPage() {
  const { role, isAdmin } = useUser();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const {
    stats,
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

      {/* Grid de Cards Estatísticos (KPIs) */}
      <KpiOverviewCards
        stats={stats}
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
