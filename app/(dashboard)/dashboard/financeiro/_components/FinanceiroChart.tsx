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

// ─── Bar Chart ────────────────────────────────────────────────────────────────

interface BarEntry {
  dia: string;
  faturamento: number;
  custos: number;
}

interface FinanceiroBarChartProps {
  data: BarEntry[];
}

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-none p-3 text-xs shadow-xl space-y-1">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      {payload.map((item: any, index: number) => (
        <div key={index} className="flex justify-between gap-4">
          <span className="text-slate-400">{item.name === 'faturamento' ? 'Recebido' : 'Custos/Despesas'}:</span>
          <span className={`font-semibold tabular-nums ${item.name === 'faturamento' ? 'text-emerald-400' : 'text-rose-400'}`}>
            R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
};

export function FinanceiroBarChart({ data }: FinanceiroBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#1e293b' }} />
        <Legend
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value === 'faturamento' ? 'Recebido' : 'Custos/Despesas'}</span>}
          wrapperStyle={{ paddingTop: 8 }}
        />
        <Bar name="faturamento" dataKey="faturamento" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={20} />
        <Bar name="custos" dataKey="custos" fill="#ef4444" radius={[0, 0, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

interface PieEntry {
  name: string;
  value: number;
}

interface FinanceiroPieChartProps {
  data: PieEntry[];
}

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-none p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-medium">{payload[0].name}</p>
      <p className="text-emerald-400 tabular-nums font-semibold">
        R$ {Number(payload[0].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

export function FinanceiroPieChart({ data }: FinanceiroPieChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] text-slate-600 text-sm">
        Sem dados de pagamento
      </div>
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
          fontSize={10}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltipPie />} />
        <Legend
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
          wrapperStyle={{ paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
