'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { DashboardStats } from '@/components/hooks/useDashboardData';
import { Card, Badge, SkeletonCards } from '@/components/ui';
import { cn } from '@/lib/utils';

interface KpiOverviewCardsProps {
  stats: DashboardStats;
  loading: boolean;
  isAdmin: boolean;
  role: string | null;
}

const brl = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tone = 'brand' | 'danger';

export interface SparklineProps {
  data: number[];
  tone?: Tone;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  tone = 'brand',
  width = 60,
  height = 20,
  className,
}: SparklineProps) {
  if (!data || data.length < 2 || data.every((val) => val === 0)) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const innerHeight = height - padding * 2;
  const innerWidth = width - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * innerWidth;
    const y = height - padding - ((val - min) / range) * innerHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const strokeColor =
    tone === 'danger'
      ? 'var(--color-danger, #ef4444)'
      : 'var(--color-brand, #10b981)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0 overflow-visible', className)}
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  /** Rótulo do indicador — o que está sendo medido. */
  label: string;
  /** Já formatado. Renderizado em mono tabular: é dado, não título. */
  value: string;
  /** Uma linha explicando de onde o número vem. */
  hint: string;
  /** Etiqueta curta no canto: recorte temporal ou severidade. */
  meta?: string;
  tone?: Tone;
  href?: string;
  sparklineData?: number[];
}

const ICON_TONE: Record<Tone, string> = {
  brand: 'bg-brand/15 text-brand',
  danger: 'bg-danger/15 text-danger',
};

function KpiCard({ icon, label, value, hint, meta, tone = 'brand', href, sparklineData }: KpiCardProps) {
  const router = useRouter();
  const clickable = Boolean(href);

  return (
    <Card
      interactive={clickable}
      className={cn('flex flex-col', clickable && 'group')}
      onClick={href ? () => router.push(href) : undefined}
      role={clickable ? 'link' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(href);
              }
            }
          : undefined
      }
    >
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className={cn('p-2.5 rounded-2xl backdrop-blur-md border border-white/5', ICON_TONE[tone])} aria-hidden>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline data={sparklineData} tone={tone} />
          )}
          {meta && (
            <Badge tone={tone === 'danger' ? 'danger' : 'neutral'} className="shrink-0">
              {meta}
              {clickable && <ArrowUpRight className="w-3 h-3" aria-hidden />}
            </Badge>
          )}
        </div>
      </div>

      <p className="text-small font-semibold text-text-muted">{label}</p>
      <p className="text-h1 font-mono tabular-nums text-text mt-1">{value}</p>
      <p className="text-caption text-text-subtle mt-2">{hint}</p>
    </Card>
  );
}

export function KpiOverviewCards({
  stats,
  chartData,
  loading,
  isAdmin,
  role,
}: KpiOverviewCardsProps & { chartData?: import('@/components/hooks/useDashboardData').ChartDay[] }) {
  if (loading) {
    return <SkeletonCards count={4} />;
  }

  const hasBillingTrend = chartData && chartData.some((d) => d.faturamento > 0);
  const billingTrend = hasBillingTrend
    ? chartData.map((d) => d.faturamento)
    : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {isAdmin ? (
        <>
          <KpiCard
            icon={<DollarSign className="w-5 h-5" />}
            meta="No período"
            label="Faturamento Realizado"
            value={brl(stats.billing)}
            hint="Soma de OS concluídas / entregues"
            sparklineData={billingTrend}
          />
          <KpiCard
            icon={<Clock className="w-5 h-5" />}
            meta="Em progresso"
            label="OS Abertas / Em Análise"
            value={String(stats.openOrders)}
            hint="Aguardando aprovação ou peças"
            href="/dashboard/orders?status=Ativas"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            meta="Caixa"
            label="Ticket Médio"
            value={brl(stats.ticketMedio)}
            hint="Valor médio por OS paga"
          />
        </>
      ) : (
        <>
          <KpiCard
            icon={<Clock className="w-5 h-5" />}
            meta={role === 'technician' ? 'Minha fila' : 'Geral'}
            label="OS Abertas / Em Execução"
            value={String(stats.openOrders)}
            hint="Aguardando análise ou peças"
            href="/dashboard/orders?status=Ativas"
          />
          <KpiCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            meta="Concluídas"
            label="OS Prontas / Entregues"
            value={String(stats.completedOrders)}
            hint="Finalizadas ou prontas para entrega"
            href="/dashboard/orders?status=Concluidas"
          />
          <KpiCard
            icon={<Users className="w-5 h-5" />}
            meta="Clientes"
            label="Total de Clientes"
            value={String(stats.totalClients)}
            hint="Cadastrados na base global"
            href="/dashboard/clients"
          />
        </>
      )}

      <KpiCard
        icon={<Package className="w-5 h-5" />}
        meta="Crítico"
        tone="danger"
        label="Produtos com Estoque Baixo"
        value={String(stats.lowStockCount)}
        hint="Itens abaixo do estoque mínimo"
        href="/dashboard/inventory?filter=low_stock"
      />
    </div>
  );
}
