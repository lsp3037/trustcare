'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Banknote, Wrench, ReceiptText, ClipboardCheck, Contact, PackageMinus } from 'lucide-react';
import { DashboardStats, PreviousPeriodStats } from '@/components/hooks/useDashboardData';
import { Card, SkeletonCards } from '@/components/ui';
import { cn } from '@/lib/utils';

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

type Tone = 'brand' | 'info' | 'warning' | 'danger';

/** Tamanho e traço únicos para os seis ícones — mesma família, mesmo peso. */
const ICON_CLASS = 'w-[18px] h-[18px]';

/**
 * Cor de destaque do card: ponto do rótulo, selo do ícone e linha de brilho.
 * O selo leva um fio na própria cor (`ring-current/20`) em vez de um contorno
 * branco igual para todos, que desbotava sobre os tons quentes.
 */
const TONE: Record<Tone, { dot: string; icon: string; sweep: string }> = {
  brand: { dot: 'bg-brand', icon: 'bg-brand/12 text-brand', sweep: 'via-brand' },
  info: { dot: 'bg-info', icon: 'bg-info/12 text-info', sweep: 'via-info' },
  warning: { dot: 'bg-warning', icon: 'bg-warning/12 text-warning', sweep: 'via-warning' },
  danger: { dot: 'bg-danger', icon: 'bg-danger/12 text-danger', sweep: 'via-danger' },
};

/** Setas do chip de variação — traço fino, no desenho da referência. */
const ArrowUpIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden>
    <path d="M6 2v8M6 2l3 3M6 2L3 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden>
    <path d="M6 10V2M6 10l3-3M6 10l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Anima o número do valor anterior até `target` (ease-out cúbico). Quem pediu
 * menos movimento vê o valor final direto.
 */
function useCountUp(target: number, duration = 1100) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = target;
      setShown(target);
      return;
    }

    const from = fromRef.current;
    let start: number | null = null;
    let frame = 0;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const value = from + (target - from) * (1 - Math.pow(1 - t, 3));
      fromRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}

interface KpiCardProps {
  icon: React.ReactNode;
  /** Rótulo do indicador — o que está sendo medido. */
  label: string;
  /** Valor bruto; animado e passado por `format` a cada quadro. */
  value: number;
  format: (value: number) => string;
  /** Uma linha explicando de onde o número vem. Aparece quando não há chip. */
  hint: string;
  /** Mesmo indicador no período anterior. Sem ele (ou zerado), não há chip. */
  previous?: number;
  tone?: Tone;
  href?: string;
  /** Posição no grid, para desencontrar a linha de brilho entre os cards. */
  index: number;
}

function KpiCard({ icon, label, value, format, hint, previous, tone = 'brand', href, index }: KpiCardProps) {
  const shown = useCountUp(value);
  const colors = TONE[tone];
  const critical = tone === 'danger';

  const delta = previous && previous > 0 ? ((value - previous) / previous) * 100 : null;
  const deltaTone = delta === null || Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down';

  return (
    <Card
      padding="none"
      href={href}
      linkLabel={href ? `${label}: ${format(value)}. Ver detalhes` : undefined}
      className={cn(
        // Mesmo contorno e raio das demais caixas do painel (tabela de OS e
        // gráfico): `border-border` sólido, não o vidro a 8% do Card.
        'relative overflow-hidden min-h-[168px] p-6 flex flex-col justify-between border-border',
        critical && 'border-danger/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colors.dot)} aria-hidden />
          {label}
        </span>
        <div className={cn('p-2 rounded-xl ring-1 ring-inset ring-current/20 shrink-0', colors.icon)} aria-hidden>
          {icon}
        </div>
      </div>

      <p
        className={cn(
          'my-3 font-sans text-[2rem] xl:text-[2.25rem] font-extrabold leading-none tracking-tight tabular-nums',
          critical ? 'text-danger' : 'text-text'
        )}
        aria-label={format(value)}
      >
        {format(shown)}
      </p>

      {delta !== null ? (
        <div className="flex items-center gap-2 min-w-0" title={hint}>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums shrink-0',
              deltaTone === 'up' && 'bg-success/15 text-success',
              deltaTone === 'down' && 'bg-danger/15 text-danger',
              deltaTone === 'flat' && 'bg-text-muted/15 text-text-muted'
            )}
          >
            {deltaTone === 'up' && <ArrowUpIcon />}
            {deltaTone === 'down' && <ArrowDownIcon />}
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </span>
          <span className="text-[11px] text-text-muted truncate">
            vs {format(previous!)} <span className="sr-only">no período anterior. {hint}</span>
          </span>
        </div>
      ) : (
        <p className={cn('text-[11px] leading-snug', critical ? 'text-danger font-medium' : 'text-text-muted')}>
          {hint}
        </p>
      )}

      {/* Linha de brilho que varre a base do card; só com movimento liberado. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent to-transparent opacity-60',
          colors.sweep,
          'motion-safe:animate-kpi-sweep'
        )}
        // Posição de repouso via `transform` (e não a classe `-translate-x-full`):
        // no Tailwind 4 ela usa a propriedade `translate`, que se soma ao
        // `transform` do keyframe e empurrava a barra para fora do card.
        style={{ transform: 'translateX(-100%)', animationDelay: `${index * 1.4}s` }}
      />
    </Card>
  );
}

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
        <h2 className="font-sans text-[15px] font-bold tracking-[0.02em] text-text">Visão geral</h2>
        {periodLabel && <span className="text-[11px] font-semibold text-text-muted">{periodLabel}</span>}
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
