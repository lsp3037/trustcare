'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

/**
 * Gráfico de área com o mesmo desenho do "Faturamento Diário" do Dashboard:
 * curvas monotônicas, preenchimento em gradiente e grade quase invisível.
 * Cores entram como `var(--token)` porque o Recharts pinta atributos SVG.
 */
const AXIS = 'var(--color-text-subtle)';

const brl = (value: number) =>
  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const compact = (value: number) =>
  value >= 1000 ? `R$${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : `R$${value}`;

interface Entry {
  dia: string;
  faturamento: number;
  custos: number;
}

const SERIES = {
  faturamento: { label: 'Recebido', color: 'var(--color-brand)', dot: 'bg-brand shadow-[0_0_8px_var(--color-brand)]', text: 'text-brand' },
  custos: { label: 'Custos/Despesas', color: 'var(--color-danger)', dot: 'bg-danger shadow-[0_0_8px_var(--color-danger)]', text: 'text-danger' },
} as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-raised/95 backdrop-blur-xl border border-glass-border-strong rounded-2xl p-3.5 shadow-2xl space-y-1">
      <p className="text-text-muted text-caption font-semibold mb-1">{label}</p>
      {payload.map((item: any) => {
        const s = SERIES[item.dataKey as keyof typeof SERIES];
        return (
          <p key={item.dataKey} className="text-text text-sm font-bold tabular-nums flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}: <span className={`${s.text} font-mono`}>{brl(item.value)}</span>
          </p>
        );
      })}
    </div>
  );
};

/** Legenda em pílulas, no lugar da legenda padrão do Recharts. */
export function FinanceiroChartLegend() {
  return (
    <div className="flex items-center gap-3">
      {Object.values(SERIES).map((s) => (
        <span key={s.label} className="flex items-center gap-1.5 text-caption font-semibold text-text-muted">
          <span className={`w-2 h-2 rounded-full ${s.dot}`} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function FinanceiroAreaChart({ data }: { data: Entry[] }) {
  const hasData = data.some((d) => (d.faturamento || 0) > 0 || (d.custos || 0) > 0);

  if (!hasData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-surface-sunken/40 rounded-2xl border border-dashed border-border">
        <BarChart3 className="w-8 h-8 text-text-subtle/50 mb-2" aria-hidden="true" />
        <p className="text-small font-medium text-text-muted">Sem movimentações no período</p>
        <p className="text-caption text-text-subtle mt-0.5 max-w-xs">
          Nenhum faturamento ou custo registrado no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 15, right: 10, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="finRecebidoGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.45} />
            <stop offset="60%" stopColor="var(--color-brand)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="finCustosGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.3} />
            <stop offset="60%" stopColor="var(--color-danger)" stopOpacity={0.08} />
            <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255, 255, 255, 0.06)" />
        <XAxis dataKey="dia" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} tickFormatter={compact} width={56} />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'var(--color-text-subtle)', strokeWidth: 1.5, strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone"
          dataKey="custos"
          stroke="var(--color-danger)"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#finCustosGradient)"
          activeDot={{ r: 5, fill: 'var(--color-danger)', stroke: '#0b0d10', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="faturamento"
          stroke="var(--color-brand)"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#finRecebidoGradient)"
          activeDot={{ r: 6, fill: 'var(--color-brand)', stroke: '#0b0d10', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
