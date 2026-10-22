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
}

const ICON_TONE: Record<Tone, string> = {
  brand: 'bg-brand/15 text-brand',
  danger: 'bg-danger/15 text-danger',
};

function KpiCard({ icon, label, value, hint, meta, tone = 'brand', href }: KpiCardProps) {
  const router = useRouter();
  const clickable = Boolean(href);

  return (
    <Card
      padding="sm"
      interactive={clickable}
      className={cn(
        'flex flex-col justify-between transition-all duration-200',
        tone === 'danger' && 'bg-danger/5 border-danger/25',
        clickable && 'group'
      )}
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
      <div className="flex justify-between items-start gap-2">
        <span
          className={cn(
            'text-caption font-semibold uppercase tracking-wider',
            tone === 'danger' ? 'text-danger' : 'text-text-muted'
          )}
        >
          {label}
        </span>
        <div className={cn('p-1.5 rounded-xl border border-white/5 shrink-0', ICON_TONE[tone])} aria-hidden>
          {icon}
        </div>
      </div>

      <div className="mt-2">
        <p
          className={cn(
            'text-h2 font-mono tabular-nums',
            tone === 'danger' ? 'text-danger' : 'text-text'
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            'text-caption mt-0.5',
            tone === 'danger'
              ? 'text-danger font-medium'
              : 'text-text-subtle'
          )}
        >
          {hint}
        </p>
      </div>
    </Card>
  );
}

export function KpiOverviewCards({
  stats,
  loading,
  isAdmin,
  role,
}: KpiOverviewCardsProps & { chartData?: import('@/components/hooks/useDashboardData').ChartDay[] }) {
  if (loading) {
    return <SkeletonCards count={4} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {isAdmin ? (
        <>
          <KpiCard
            icon={<DollarSign className="w-4 h-4" />}
            meta="No período"
            label="Faturamento"
            value={brl(stats.billing)}
            hint="Soma de OS concluídas / entregues"
          />
          <KpiCard
            icon={<Clock className="w-4 h-4" />}
            meta="Em progresso"
            label="OS Abertas"
            value={String(stats.openOrders)}
            hint="Aguardando aprovação ou peças"
            href="/dashboard/orders?status=Ativas"
          />
          <KpiCard
            icon={<TrendingUp className="w-4 h-4" />}
            meta="Caixa"
            label="Ticket Médio"
            value={brl(stats.ticketMedio)}
            hint="Valor médio por OS paga"
          />
        </>
      ) : (
        <>
          <KpiCard
            icon={<Clock className="w-4 h-4" />}
            meta={role === 'technician' ? 'Minha fila' : 'Geral'}
            label="OS Abertas"
            value={String(stats.openOrders)}
            hint="Aguardando análise ou peças"
            href="/dashboard/orders?status=Ativas"
          />
          <KpiCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            meta="Concluídas"
            label="OS Concluídas"
            value={String(stats.completedOrders)}
            hint="Finalizadas ou prontas para entrega"
            href="/dashboard/orders?status=Concluidas"
          />
          <KpiCard
            icon={<Users className="w-4 h-4" />}
            meta="Clientes"
            label="Total de Clientes"
            value={String(stats.totalClients)}
            hint="Cadastrados na base global"
            href="/dashboard/clients"
          />
        </>
      )}

      <KpiCard
        icon={<Package className="w-4 h-4" />}
        meta="Crítico"
        tone="danger"
        label="Estoque Baixo"
        value={String(stats.lowStockCount)}
        hint="Itens abaixo do estoque mínimo"
        href="/dashboard/inventory?filter=low_stock"
      />
    </div>
  );
}
