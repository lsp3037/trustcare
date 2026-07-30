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
import { Card, Badge } from '@/components/ui';
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

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  meta?: string;
  tone?: Tone;
  href?: string;
}

function KpiCard({ icon, label, value, hint, meta, tone = 'brand', href }: KpiCardProps) {
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
        <div className={cn('p-2.5 rounded-full backdrop-blur-md border border-white/5', ICON_TONE[tone])} aria-hidden>
          {icon}
        </div>
        {meta && (
          <Badge tone={tone === 'danger' ? 'danger' : 'neutral'} className="shrink-0">
            {meta}
            {clickable && <ArrowUpRight className="w-3 h-3" aria-hidden />}
          </Badge>
        )}
      </div>

      <p className="text-small font-semibold text-text-muted">{label}</p>
      <p className="text-h1 font-mono tabular-nums text-text mt-1">{value}</p>
      <p className="text-caption text-text-subtle mt-2">{hint}</p>
    </Card>
  );
}

export function KpiOverviewCards({ stats, loading, isAdmin, role }: KpiOverviewCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-9 h-9 rounded-full bg-surface-overlay" />
              <div className="w-12 h-4 rounded-full bg-surface-overlay" />
            </div>
            <div className="h-3 w-28 rounded-md bg-surface-overlay mb-2" />
            <div className="h-7 w-20 rounded-md bg-surface-overlay mb-2" />
            <div className="h-2 w-32 rounded-md bg-surface-overlay" />
          </Card>
        ))}
      </div>
    );
  }

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
