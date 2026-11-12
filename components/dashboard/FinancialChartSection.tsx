'use client';

import React from 'react';
import Link from 'next/link';
import { DollarSign, BarChart3, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

const AXIS = 'var(--color-text-subtle)';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-raised/95 backdrop-blur-xl border border-glass-border-strong rounded-2xl p-3.5 shadow-2xl">
      <p className="text-text-muted text-caption font-semibold mb-1">{label}</p>
      <p className="text-text text-sm font-bold tabular-nums flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_var(--color-brand)]" />
        Faturamento : <span className="text-brand font-mono">R$ {Number(payload[0].value).toFixed(2)}</span>
      </p>
    </div>
  );
};

const PAYMENT_ICONS: Record<string, { label: string; bg: string; text: string; border: string; grad: string }> = {
  pix: {
    label: 'PIX',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    grad: 'from-emerald-500 to-teal-300',
  },
  cartao: {
    label: 'CC',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    grad: 'from-blue-500 to-indigo-300',
  },
  boleto: {
    label: 'BOL',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    grad: 'from-amber-500 to-yellow-300',
  },
  default: {
    label: 'OUT',
    bg: 'bg-slate-500/15',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    grad: 'from-slate-400 to-slate-200',
  },
};

function getPaymentStyle(method: string) {
  const norm = method.toLowerCase();
  if (norm.includes('pix')) return PAYMENT_ICONS.pix;
  if (norm.includes('cart') || norm.includes('crédito') || norm.includes('debito')) return PAYMENT_ICONS.cartao;
  if (norm.includes('bol') || norm.includes('transf')) return PAYMENT_ICONS.boleto;
  return PAYMENT_ICONS.default;
}

export function FinancialChartSection({ chartData, paymentDistribution, billingTotal }: FinancialChartSectionProps) {
  const hasBilling = billingTotal > 0 || chartData.some((d) => d.faturamento > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25, delay: 0.2 }}
    >
      <Card
        padding="lg"
        className="flex flex-col justify-between bg-gradient-to-br from-surface-raised/95 via-surface/90 to-surface-sunken/95 backdrop-blur-2xl border border-border/80 border-t-white/20 border-x-white/8 border-b-black/40 rounded-[24px] shadow-[0_20px_45px_-10px_rgba(0,0,0,0.6)]"
      >
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Faturamento Diário</CardTitle>
                <span className="p-1 rounded-md bg-brand/10 text-brand text-caption flex items-center gap-1 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" /> Tendência
                </span>
              </div>
              <p className="text-caption text-text-subtle mt-0.5">Evolução contínua da receita com preenchimento em onda.</p>
            </div>

            {hasBilling && (
              <div className="flex items-baseline gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-surface-sunken/80 border border-glass-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Acumulado:</span>
                <span className="text-base font-extrabold text-brand font-mono tabular-nums">
                  R$ {billingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <div className="w-full h-64 mt-2">
            {!hasBilling ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-surface-sunken/40 rounded-2xl border border-dashed border-border">
                <BarChart3 className="w-8 h-8 text-text-subtle/50 mb-2" aria-hidden="true" />
                <p className="text-small font-medium text-text-muted">Nenhum faturamento no período</p>
                <p className="text-caption text-text-subtle mt-0.5 max-w-xs">
                  O gráfico de faturamento diário será exibido assim que as primeiras ordens de serviço forem concluídas.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="billingSplineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.45} />
                      <stop offset="60%" stopColor="var(--color-brand)" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="rgba(255, 255, 255, 0.06)"
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
                    cursor={{ stroke: 'var(--color-brand)', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    stroke="var(--color-brand)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#billingSplineGradient)"
                    activeDot={{ r: 6, fill: 'var(--color-brand)', stroke: '#0b0d10', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Painel de Formas de Pagamento Estilo Carteira Digital */}
        <div className="mt-8 border-t border-glass-divider pt-6">
          <h4 className="text-caption uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2 font-bold">
            <DollarSign className="w-4 h-4 text-brand" aria-hidden />
            Formas de Recebimento
          </h4>
          <div className="space-y-3">
            {Object.keys(paymentDistribution).length === 0 ? (
              <p className="text-small text-text-subtle">Nenhum pagamento registrado no período.</p>
            ) : (
              Object.entries(paymentDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([method, value]) => {
                  const percent = billingTotal > 0 ? (value / billingTotal) * 100 : 0;
                  const style = getPaymentStyle(method);
                  return (
                    <div
                      key={method}
                      className="p-3 rounded-2xl bg-surface-sunken/60 border border-glass-border hover:border-glass-border-strong transition-colors"
                    >
                      <div className="flex justify-between items-center gap-3 text-small mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${style.bg} ${style.text} ${style.border}`}>
                            {style.label}
                          </span>
                          <span className="font-semibold text-text">{method}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono font-bold text-text tabular-nums">{percent.toFixed(1)}%</span>
                          <span className="text-caption text-text-subtle font-mono tabular-nums">
                            (R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        </div>
                      </div>
                      <div
                        className="w-full bg-surface h-2 rounded-full border border-glass-divider overflow-hidden"
                        role="meter"
                        aria-valuenow={Number(percent.toFixed(1))}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Participação de ${method}`}
                      >
                        <motion.div
                          className={`h-full rounded-full bg-gradient-to-r ${style.grad}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-glass-divider pt-4">
          <Link
            href="/dashboard/financeiro"
            className={buttonClasses({ variant: 'secondary', fullWidth: true, className: 'rounded-full' })}
          >
            <BarChart3 className="w-4 h-4" aria-hidden /> Acessar Relatório Financeiro Detalhado
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
