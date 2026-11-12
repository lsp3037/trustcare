'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

export type KpiTone = 'brand' | 'info' | 'warning' | 'danger';

/** Tamanho e traço únicos para os ícones dos cards — mesma família, mesmo peso. */
export const KPI_ICON_CLASS = 'w-[18px] h-[18px]';

/**
 * Cor de destaque do card: ponto do rótulo, selo do ícone e halo ambiental.
 */
const TONE: Record<KpiTone, { dot: string; icon: string; halo: string; spark: string }> = {
  brand: {
    dot: 'bg-brand shadow-[0_0_8px_var(--color-brand)]',
    icon: 'bg-brand/15 text-brand border border-brand/25 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    halo: 'from-brand/25 to-transparent',
    spark: '#10b981',
  },
  info: {
    dot: 'bg-info shadow-[0_0_8px_var(--color-info)]',
    icon: 'bg-info/15 text-info border border-info/25 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
    halo: 'from-info/25 to-transparent',
    spark: '#3b82f6',
  },
  warning: {
    dot: 'bg-warning shadow-[0_0_8px_var(--color-warning)]',
    icon: 'bg-warning/15 text-warning border border-warning/25 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    halo: 'from-warning/25 to-transparent',
    spark: '#f59e0b',
  },
  danger: {
    dot: 'bg-danger shadow-[0_0_8px_var(--color-danger)]',
    icon: 'bg-danger/15 text-danger border border-danger/25 shadow-[0_0_12px_rgba(244,63,94,0.2)]',
    halo: 'from-danger/25 to-transparent',
    spark: '#f43f5e',
  },
};

/** Curvas decorativas usadas quando o card não recebe uma série real. */
const DECORATIVE: Record<'up' | 'wave' | 'down', string> = {
  up: 'M 0,45 Q 35,50 70,30 T 140,22 T 200,8',
  wave: 'M 0,40 Q 40,20 80,45 T 150,22 T 200,32',
  down: 'M 0,20 Q 50,26 100,38 T 150,34 T 200,48',
};

/** Setas do chip de variação — traço fino. */
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
export function useCountUp(target: number, duration = 1100) {
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

/**
 * Converte uma série em uma curva suave no viewBox 200×60 (Catmull-Rom → Bézier).
 * Série vazia ou toda zerada vira uma linha reta perto da base.
 */
function seriesToPath(series: number[]) {
  const pts = series.length === 1 ? [series[0], series[0]] : series;
  const max = Math.max(...pts);
  const min = Math.min(...pts, 0);
  const span = max - min;
  const xy = pts.map((v, i) => [
    (i / (pts.length - 1)) * 200,
    span === 0 ? 50 : 52 - ((v - min) / span) * 44,
  ]);

  let d = `M ${xy[0][0].toFixed(1)},${xy[0][1].toFixed(1)}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i];
    const p1 = xy[i];
    const p2 = xy[i + 1];
    const p3 = xy[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export interface GlassKpiCardProps {
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
  tone?: KpiTone;
  /** Destaca o valor em vermelho. Padrão: só quando o tom é `danger`. */
  critical?: boolean;
  /** Série real para a sparkline de fundo. Sem ela, usa uma curva decorativa. */
  series?: number[];
  href?: string;
  /** Posição no grid, para escalonar a entrada dos cards. */
  index: number;
}

export function GlassKpiCard({
  icon,
  label,
  value,
  format,
  hint,
  previous,
  tone = 'brand',
  critical: criticalProp,
  series,
  href,
  index,
}: GlassKpiCardProps) {
  const shown = useCountUp(value);
  const colors = TONE[tone];
  const critical = criticalProp ?? tone === 'danger';
  const sparkId = `spark-${useId().replace(/:/g, '')}`;

  const delta = previous && previous > 0 ? ((value - previous) / previous) * 100 : null;
  const deltaTone = delta === null || Math.abs(delta) < 0.05 ? 'flat' : delta > 0 ? 'up' : 'down';

  const line =
    series && series.length > 0
      ? seriesToPath(series)
      : DECORATIVE[tone === 'danger' ? 'down' : tone === 'warning' ? 'wave' : 'up'];

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

        {/* Sparkline de tendência no fundo */}
        <svg
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-full h-14 pointer-events-none opacity-25 group-hover:opacity-45 transition-opacity duration-300 z-0"
          viewBox="0 0 200 60"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.spark} stopOpacity="0.4" />
              <stop offset="100%" stopColor={colors.spark} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L 200,60 L 0,60 Z`} fill={`url(#${sparkId})`} />
          <path d={line} fill="none" stroke={colors.spark} strokeWidth="2" />
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
