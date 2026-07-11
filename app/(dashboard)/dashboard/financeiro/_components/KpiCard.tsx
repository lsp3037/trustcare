import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accentColor: 'emerald' | 'rose' | 'amber' | 'blue';
  trend?: {
    value: number; // percentage
    label: string;
  };
}

const accentMap = {
  emerald: {
    border: 'border-l-emerald-500',
    icon: 'bg-emerald-500/10 text-emerald-400',
    trend: 'text-emerald-400',
  },
  rose: {
    border: 'border-l-rose-500',
    icon: 'bg-rose-500/10 text-rose-400',
    trend: 'text-rose-400',
  },
  amber: {
    border: 'border-l-amber-400',
    icon: 'bg-amber-400/10 text-amber-400',
    trend: 'text-amber-400',
  },
  blue: {
    border: 'border-l-blue-500',
    icon: 'bg-blue-500/10 text-blue-400',
    trend: 'text-blue-400',
  },
};

export function KpiCard({ title, value, subtitle, icon: Icon, accentColor, trend }: KpiCardProps) {
  const accent = accentMap[accentColor];

  return (
    <div
      className={`bg-slate-900 border border-slate-800 border-l-4 ${accent.border} rounded-none p-5 flex flex-col gap-3 transition-all duration-200 hover:border-slate-700`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-none ${accent.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
          <span className={`text-xs font-semibold tabular-nums ${trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-xs text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
