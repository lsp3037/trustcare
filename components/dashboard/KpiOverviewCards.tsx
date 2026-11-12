'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Banknote, Wrench, ReceiptText, ClipboardCheck, Contact, PackageMinus } from 'lucide-react';
import { motion } from 'motion/react';
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
 * Cor de destaque do card: ponto do rótulo, selo do ícone e halo ambiental.
 */
const TONE: Record<Tone, { dot: string; icon: string; halo: string; sparkStroke: string; sparkGrad: string }> = {
  brand: {
    dot: 'bg-brand shadow-[0_0_8px_var(--color-brand)]',
    icon: 'bg-brand/15 text-brand border border-brand/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    halo: 'from-brand/25 to-transparent',
    sparkStroke: '#10b981',
    sparkGrad: 'rgba(16, 185, 129, 0.35)',
  },
  info: {
    dot: 'bg-info shadow-[0_0_8px_var(--color-info)]',
    icon: 'bg-info/15 text-info border border-info/25 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
    halo: 'from-info/25 to-transparent',
    sparkStroke: '#3b82f6',
    sparkGrad: 'rgba(59, 130, 246, 0.35)',
  },
  warning: {
    dot: 'bg-warning shadow-[0_0_8px_var(--color-warning)]',
    icon: 'bg-warning/15 text-warning border border-warning/25 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    halo: 'from-warning/25 to-transparent',
    sparkStroke: '#f59e0b',
    sparkGrad: 'rgba(245, 158, 11, 0.35)',
  },
  danger: {
    dot: 'bg-danger shadow-[0_0_8px_var(--color-danger)]',
    icon: 'bg-danger/15 text-danger border border-danger/25 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
    halo: 'from-danger/25 to-transparent',
    sparkStroke: '#f43f5e',
    sparkGrad: 'rgba(244, 63, 94, 0.35)',
  },
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

  // ID único para o gradiente SVG da sparkline
  const sparkId = `sparkline-${tone}-${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, delay: index * 0.06 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card
        padding="none"
        href={href}
        linkLabel={href ? `${label}: ${format(value)}. Ver detalhes` : undefined}
        className={cn(
          'relative overflow-hidden min-h-[174px] p-6 flex flex-col justify-between h-full group',
          'bg-gradient-to-br from-surface-raised/95 via-surface/90 to-surface-sunken/95 backdrop-blur-2xl',
          'border border-border/80 border-t-white/20 border-x-white/8 border-b-black/40 rounded-[22px]',
          'shadow-[0_14px_34px_-8px_rgba(0,0,0,0.55)] transition-all duration-300',
          'hover:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.7)] hover:border-t-white/35',
          critical && 'border-danger/35 hover:border-danger/50 shadow-[0_14px_34px_-8px_rgba(244,63,94,0.15)]'
        )}
      >
        {/* Halo de luz ambiental no canto superior direito */}
        <div
          aria-hidden="true"
          className={cn(
            'absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-radial',
            colors.halo
          )}
        />

        {/* Micro-sparkline de tendência no fundo */}
        <svg
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-full h-14 pointer-events-none opacity-25 group-hover:opacity-45 transition-opacity duration-300 z-0"
          viewBox="0 0 200 60"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.sparkStroke} stopOpacity="0.4" />
              <stop offset="100%" stopColor={colors.sparkStroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {tone === 'danger' ? (
            <>
              <path d="M 0,20 Q 50,26 100,38 T 150,34 T 200,48 L 200,60 L 0,60 Z" fill={`url(#${sparkId})`} />
              <path d="M 0,20 Q 50,26 100,38 T 150,34 T 200,48" fill="none" stroke={colors.sparkStroke} strokeWidth="2" />
            </>
          ) : tone === 'warning' ? (
            <>
              <path d="M 0,40 Q 40,20 80,45 T 150,22 T 200,32 L 200,60 L 0,60 Z" fill={`url(#${sparkId})`} />
              <path d="M 0,40 Q 40,20 80,45 T 150,22 T 200,32" fill="none" stroke={colors.sparkStroke} strokeWidth="2" />
            </>
          ) : (
            <>
              <path d="M 0,45 Q 35,50 70,30 T 140,22 T 200,8 L 200,60 L 0,60 Z" fill={`url(#${sparkId})`} />
              <path d="M 0,45 Q 35,50 70,30 T 140,22 T 200,8" fill="none" stroke={colors.sparkStroke} strokeWidth="2" />
            </>
          )}
        </svg>

        <div className="flex items-start justify-between gap-2 relative z-10">
          <span className="flex items-center gap-2.5 text-caption font-bold uppercase tracking-[0.08em] text-text-muted">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colors.dot)} aria-hidden />
            {label}
          </span>
          <div className={cn('p-2 rounded-xl ring-1 ring-inset ring-current/20 shrink-0', colors.icon)} aria-hidden>
            {icon}
          </div>
        </div>

        <p
          className={cn(
            'my-3 font-sans text-[2rem] xl:text-[2.25rem] font-extrabold leading-none tracking-tight tabular-nums relative z-10',
            critical ? 'text-danger drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]' : 'text-text'
          )}
          aria-label={format(value)}
        >
          {format(shown)}
        </p>

        {delta !== null ? (
          <div className="flex items-center gap-2 min-w-0 relative z-10" title={hint}>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold tabular-nums shrink-0 border',
                deltaTone === 'up' && 'bg-success/15 text-success border-success/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
                deltaTone === 'down' && 'bg-danger/15 text-danger border-danger/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
                deltaTone === 'flat' && 'bg-text-muted/15 text-text-muted border-text-muted/30'
              )}
            >
              {deltaTone === 'up' && <ArrowUpIcon />}
              {deltaTone === 'down' && <ArrowDownIcon />}
              {delta > 0 ? '+' : ''}
              {delta.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            </span>
            <span className="text-caption text-text-muted truncate">
              vs {format(previous!)} <span className="sr-only">no período anterior. {hint}</span>
            </span>
          </div>
        ) : (
          <p className={cn('text-caption leading-snug relative z-10', critical ? 'text-danger font-medium' : 'text-text-muted')}>
            {hint}
          </p>
        )}
      </Card>
    </motion.div>
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
