'use client';

import React from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface FinancialSectionProps {
  subtotalValue: string;
  discount: string;
  totalValue: string;
  loading: boolean;
}

export function FinancialSection({
  subtotalValue,
  discount,
  totalValue,
  loading,
}: FinancialSectionProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-850">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
        <div className="flex flex-col text-xs text-slate-400 gap-0.5">
          <div>
            Subtotal: <span className="font-semibold text-slate-200 font-mono">R$ {Number(subtotalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {parseFloat(discount) > 0 && (
            <div className="text-rose-455 font-bold">
              Desconto: <span className="font-mono">- R$ {Number(discount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-none flex items-center gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Valor Total da O.S.</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              R$ {Number(totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-none text-sm shadow-xl shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <LoadingSpinner /> : 'Salvar Ordem de Serviço'}
      </button>
    </div>
  );
}
