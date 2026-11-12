'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import DatePickerWithRange from '@/components/DatePickerWithRange';
import { useUser } from '@/lib/context/UserContext';
import { useDashboardData, DateRange } from '@/components/hooks/useDashboardData';
import { KpiOverviewCards } from '@/components/dashboard/KpiOverviewCards';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { FinancialChartSection } from '@/components/dashboard/FinancialChartSection';
import { buttonClasses } from '@/components/ui';

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
          <h1 className="text-h1 text-text tracking-tight">Dashboard</h1>
          <p className="mt-1 text-small text-text-muted">
            Indicadores em tempo real e visão geral da assistência técnica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Período Global */}
          <DatePickerWithRange onChange={(range) => setDateRange(range)} />

          <Link
            href="/dashboard/orders?new=true"
            className={buttonClasses({
              className:
                'rounded-full shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] transition-all duration-300 font-bold',
            })}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Nova OS
          </Link>
        </div>
      </div>

      {/* Alerta de SLA Operacional - Estilo Dynamic Island */}
      {!loading && stats.openOrders > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="p-4 sm:p-4.5 rounded-[22px] bg-gradient-to-r from-amber-950/35 via-surface-raised/80 to-surface-sunken/80 backdrop-blur-2xl border border-warning/35 border-t-warning/60 shadow-[0_12px_30px_-5px_rgba(0,0,0,0.5),0_0_24px_rgba(245,158,11,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            {/* Ícone com Radar Pulse Concéntrico */}
            <div className="relative w-10 h-10 rounded-xl bg-warning/15 text-warning border border-warning/30 flex items-center justify-center shrink-0">
              <span className="absolute inset-0 rounded-xl border border-warning/50 animate-ping opacity-35 pointer-events-none" />
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-small font-bold text-warning tracking-tight">
                SLA de Bancada em Monitoramento Ativo: {stats.openOrders} {stats.openOrders === 1 ? 'ordem de serviço ativa aguarda' : 'ordens de serviço ativas aguardam'} laudo ou conclusão
              </p>
              <p className="text-caption text-text-muted mt-0.5">
                Priorize a fila operacional para manter o compromisso de entrega em 48h.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/orders?status=Ativas"
            className={buttonClasses({
              variant: 'secondary',
              size: 'sm',
              className:
                'rounded-full shrink-0 self-start sm:self-auto bg-warning/15 text-warning border-warning/35 hover:bg-warning/25 transition-all duration-200 font-bold flex items-center gap-1.5',
            })}
          >
            Fila Ativa <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Grid de Cards Estatísticos (KPIs) com Glassmorphism e Sparklines */}
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

        {/* Módulo de Gráfico de Faturamento com Área Spline Fluida (Apenas Admin) */}
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
