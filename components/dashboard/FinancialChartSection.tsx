'use client';

import React from 'react';
import Link from 'next/link';
import { DollarSign, Users } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { ChartDay } from '@/components/hooks/useDashboardData';
import { Card, CardTitle, buttonClasses } from '@/components/ui';

interface FinancialChartSectionProps {
  chartData: ChartDay[];
  paymentDistribution: Record<string, number>;
  billingTotal: number;
}

/** Recharts recebe cor por prop, não por classe — os valores saem dos tokens. */
const AXIS = 'var(--color-text-subtle)';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-raised border border-border rounded-2xl p-3 shadow-md">
      <p className="text-text-muted text-xs font-semibold mb-1">{label}</p>
      <p className="text-text text-sm font-semibold tabular-nums">
        Faturamento : <span className="text-brand">R$ {Number(payload[0].value).toFixed(2)}</span>
      </p>
    </div>
  );
};

export function FinancialChartSection({ chartData, paymentDistribution, billingTotal }: FinancialChartSectionProps) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <CardTitle>Faturamento</CardTitle>
        <p className="text-caption text-text-subtle mt-0.5">Histórico do período selecionado.</p>

        <div className="w-full h-56 mt-6">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-small text-text-subtle">
              Sem dados de faturamento para este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="dia"
                  stroke={AXIS}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={AXIS}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'var(--color-border)', opacity: 0.35 }}
                />
                <Bar
                  dataKey="faturamento"
                  fill="var(--color-brand)"
                  barSize={chartData.length > 20 ? 8 : chartData.length > 10 ? 14 : 24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <h4 className="text-caption uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-text-subtle" aria-hidden />
          Formas de Recebimento
        </h4>
        <div className="space-y-4">
          {Object.keys(paymentDistribution).length === 0 ? (
            <p className="text-small text-text-subtle">Nenhum pagamento registrado no período.</p>
          ) : (
            Object.entries(paymentDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([method, value]) => {
                const percent = billingTotal > 0 ? (value / billingTotal) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="flex justify-between items-baseline gap-3 text-small mb-1.5">
                      <span className="font-semibold text-text">{method}</span>
                      <span className="font-mono tabular-nums text-text-muted">
                        {percent.toFixed(1)}%
                        <span className="text-text-subtle ml-1.5">
                          (R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                        </span>
                      </span>
                    </div>
                    <div
                      className="w-full bg-surface-sunken h-2 border border-border"
                      role="meter"
                      aria-valuenow={Number(percent.toFixed(1))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Participação de ${method}`}
                    >
                      <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <Link
          href="/dashboard/clients"
          className={buttonClasses({ variant: 'secondary', fullWidth: true })}
        >
          <Users className="w-4 h-4" aria-hidden /> Gerenciar Todos os Clientes
        </Link>
      </div>
    </Card>
  );
}
