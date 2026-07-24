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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1 flex flex-wrap items-center gap-3">
            <span>Indicadores e visão geral da assistência técnica.</span>
            <span className="hidden sm:inline h-4 w-px bg-slate-800" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 shadow-sm">
              PJ: {stats.pjCount} {stats.pjCount === 1 ? 'cliente' : 'clientes'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-350 border border-slate-700 shadow-sm">
              PF: {stats.pfCount} {stats.pfCount === 1 ? 'cliente' : 'clientes'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Período Global */}
          <DatePickerWithRange onChange={(range) => setDateRange(range)} />
          
          <Link
            href="/dashboard/orders"
            className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-350 font-semibold py-2.5 px-4 rounded-none text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            Ver Todas OS
          </Link>
          <Link
            href="/dashboard/orders?new=true"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-none text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 transition-all duration-200"
          >
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
