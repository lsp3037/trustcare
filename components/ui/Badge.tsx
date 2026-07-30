import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusClasses, getStatus } from '@/lib/design/status';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const TONES: Record<Tone, string> = {
  neutral: 'bg-text-subtle/10 text-text-muted border-text-subtle/25',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  info: 'bg-info/10 text-info border-info/25',
  brand: 'bg-brand/10 text-brand border-brand/25',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const BASE =
  'inline-flex items-center gap-1.5 border px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200';

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(BASE, TONES[tone], className)} {...props}>
      {children}
    </span>
  );
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string | null | undefined;
  /** Mostra o marcador circular antes do texto. */
  dot?: boolean;
}

/**
 * Badge de status da OS / lead. Deriva cor e rótulo de `lib/design/status`,
 * que é a fonte única — antes esse mapa vivia copiado em 7 arquivos.
 */
export function StatusBadge({ status, dot = false, className, ...props }: StatusBadgeProps) {
  const { label } = getStatus(status);
  return (
    <span className={cn(BASE, getStatusClasses(status), className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden />}
      {label}
    </span>
  );
}
