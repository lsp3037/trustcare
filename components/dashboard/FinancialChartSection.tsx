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

interface FinancialChartSectionProps {
  chartData: ChartDay[];
  paymentDistribution: Record<string, number>;
  billingTotal: number;
}

export function FinancialChartSection({ chartData, paymentDistribution, billingTotal }: FinancialChartSectionProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 flex flex-col justify-between shadow-lg">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Faturamento</h3>
        <p className="text-xs text-slate-500">Histórico do período selecionado.</p>
        
        <div className="w-full h-56 mt-6">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
              Sem dados de faturamento para este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-800)" />
                <XAxis 
                  dataKey="dia" 
                  stroke="var(--color-slate-400)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--color-slate-400)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-slate-900)', borderColor: 'var(--color-slate-800)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-slate-450)', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: 'var(--color-slate-100)', fontSize: '12px' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']}
                  cursor={{ fill: 'var(--color-slate-800)', opacity: 0.2 }}
                />
                <Bar 
                  dataKey="faturamento" 
                  fill="url(#colorFaturamento)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={chartData.length > 20 ? 8 : chartData.length > 10 ? 14 : 24}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-slate-800/80 pt-6">
        <h4 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-slate-500" />
          Formas de Recebimento
        </h4>
        <div className="space-y-4">
          {Object.keys(paymentDistribution).length === 0 ? (
            <div className="text-xs text-slate-500 italic">Nenhum pagamento registrado no período.</div>
          ) : (
            Object.entries(paymentDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([method, value]) => {
                const percent = billingTotal > 0 ? (value / billingTotal) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1.5 font-mono">
                      <span>{method}</span>
                      <span>{percent.toFixed(1)}% <span className="text-[10px] text-slate-500 ml-1 font-mono">(R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span></span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-none h-2 border border-slate-850">
                      <div 
                        className={`h-full rounded-none ${method === 'PIX' ? 'bg-emerald-600' : method === 'Dinheiro' ? 'bg-emerald-500' : 'bg-slate-400'}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-800/80 pt-6">
        <Link
          href="/dashboard/clients"
          className="w-full bg-slate-950 hover:bg-slate-800/80 text-slate-350 text-xs font-semibold py-2.5 px-4 rounded-none flex items-center justify-center gap-2 border border-slate-800/80 transition-all"
        >
          <Users className="w-4 h-4 text-slate-400" /> Gerenciar Todos os Clientes
        </Link>
      </div>
    </div>
  );
}
