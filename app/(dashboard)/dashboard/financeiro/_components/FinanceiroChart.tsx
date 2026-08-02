'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { EmptyState } from '@/components/ui';
import { PieChart as PieIcon } from 'lucide-react';

/**
 * Recharts pinta atributos SVG, não classes do Tailwind — então as cores
 * entram como `var(--token)`. SVG resolve variáveis CSS normalmente, e assim
 * o gráfico acompanha o tema claro/escuro sem um mapa de hex duplicado.
 */
const COLOR = {
  grid: 'var(--color-border)',
  axis: 'var(--color-text-subtle)',
  legend: 'var(--color-text-muted)',
  receita: 'var(--color-success)',
  custo: 'var(--color-danger)',
} as const;

/** Paleta do gráfico de pizza — categorias, não severidade. */
const PIE_COLORS = [
  'var(--color-brand)',
  'var(--color-info)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--color-status-execucao)',
  'var(--color-origem-instagram)',
  'var(--color-status-aguardando)',
];

const brl = (value: number) =>
  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const TOOLTIP_SHELL =
  'bg-surface-raised/95 backdrop-blur-xl border border-glass-border-strong rounded-xl p-3 text-small shadow-2xl';

/* ─── Barras ─── */

interface BarEntry {
  dia: string;
  faturamento: number;
  custos: number;
}

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`${TOOLTIP_SHELL} space-y-1`}>
      <p className="text-text font-semibold mb-1">{label}</p>
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex justify-between gap-4">
          <span className="text-text-muted">
            {item.name === 'faturamento' ? 'Recebido' : 'Custos/Despesas'}:
          </span>
          <span
            className={`font-semibold font-mono tabular-nums ${
              item.name === 'faturamento' ? 'text-success' : 'text-danger'
            }`}
          >
            {brl(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function FinanceiroBarChart({ data }: { data: BarEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLOR.grid} vertical={false} />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 12, fill: COLOR.axis }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: COLOR.axis }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip content={<CustomTooltipBar />} cursor={{ fill: COLOR.grid, fillOpacity: 0.4 }} />
        <Legend
          formatter={(value) => (
            <span style={{ color: COLOR.legend, fontSize: 12 }}>
              {value === 'faturamento' ? 'Recebido' : 'Custos/Despesas'}
            </span>
          )}
          wrapperStyle={{ paddingTop: 8 }}
        />
        <Bar name="faturamento" dataKey="faturamento" fill={COLOR.receita} maxBarSize={20} />
        <Bar name="custos" dataKey="custos" fill={COLOR.custo} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Pizza ─── */

interface PieEntry {
  name: string;
  value: number;
}

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={TOOLTIP_SHELL}>
      <p className="text-text font-medium">{payload[0].name}</p>
      <p className="text-text font-semibold font-mono tabular-nums">{brl(payload[0].value)}</p>
    </div>
  );
};

export function FinanceiroPieChart({ data }: { data: PieEntry[] }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={<PieIcon />}
        title="Sem dados de pagamento"
        description="Nenhum recebimento registrado no período selecionado."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={false}
          fontSize={12}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltipPie />} />
        <Legend
          formatter={(value) => <span style={{ color: COLOR.legend, fontSize: 12 }}>{value}</span>}
          wrapperStyle={{ paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
