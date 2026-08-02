import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

type Accent = 'success' | 'danger' | 'warning' | 'info';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accentColor: Accent;
  trend?: {
    /** Variação percentual. Negativo aparece em `danger`. */
    value: number;
    label: string;
  };
}

const ACCENT: Record<Accent, { border: string; icon: string }> = {
  success: { border: 'border-l-success', icon: 'bg-success/10 text-success' },
  danger: { border: 'border-l-danger', icon: 'bg-danger/10 text-danger' },
  warning: { border: 'border-l-warning', icon: 'bg-warning/10 text-warning' },
  info: { border: 'border-l-info', icon: 'bg-info/10 text-info' },
};

export function KpiCard({ title, value, subtitle, icon: Icon, accentColor, trend }: KpiCardProps) {
  const accent = ACCENT[accentColor];

  return (
    <Card padding="sm" className={cn('flex flex-col gap-3 border-l-4', accent.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-small font-semibold text-text-muted">{title}</p>
          <p className="text-h1 font-mono tabular-nums text-text mt-1">{value}</p>
          {subtitle && <p className="text-caption text-text-subtle mt-0.5">{subtitle}</p>}
        </div>
        {/* O contêiner do ícone precisa carregar a cor do acento: antes ele
            estava vazio e o ícone saía sem tom nenhum. */}
        <div
          className={cn('p-2.5 rounded-2xl border border-glass-border shrink-0', accent.icon)}
          aria-hidden
        >
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          <span
            className={cn(
              'text-caption font-semibold tabular-nums',
              trend.value >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-caption text-text-subtle">{trend.label}</span>
        </div>
      )}
    </Card>
  );
}
