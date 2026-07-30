'use client';

import React from 'react';
import { Button } from '@/components/ui';

interface FinancialSectionProps {
  subtotalValue: string;
  discount: string;
  totalValue: string;
  loading: boolean;
}

const brl = (value: string | number) =>
  `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export function FinancialSection({
  subtotalValue,
  discount,
  totalValue,
  loading,
}: FinancialSectionProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pt-4 border-t border-border">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <dl className="text-small space-y-0.5">
          {parseFloat(discount) > 0 && (
            <>
              <div className="flex gap-1.5">
                <dt className="text-text-muted">Subtotal:</dt>
                <dd className="font-mono tabular-nums font-semibold text-text">{brl(subtotalValue)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-danger font-semibold">Desconto:</dt>
                <dd className="font-mono tabular-nums font-semibold text-danger">− {brl(discount)}</dd>
              </div>
            </>
          )}
        </dl>

        <div className="p-3 bg-brand/5 border border-brand/25">
          <span className="text-caption uppercase tracking-wider text-text-muted block">
            Valor Total da O.S.
          </span>
          <span className="text-h2 font-mono tabular-nums text-brand">{brl(totalValue)}</span>
        </div>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
        Salvar Ordem de Serviço
      </Button>
    </div>
  );
}
