'use client';

import React from 'react';
import { Button, Card } from '@/components/ui';

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
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pt-4 border-t border-border">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {parseFloat(discount) > 0 && (
          <dl className="text-small space-y-0.5">
            <div className="flex gap-1.5">
              <dt className="text-text-muted">Subtotal:</dt>
              <dd className="font-mono tabular-nums font-semibold text-text">{brl(subtotalValue)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-danger font-semibold">Desconto:</dt>
              <dd className="font-mono tabular-nums font-semibold text-danger">− {brl(discount)}</dd>
            </div>
          </dl>
        )}

        <Card padding="sm" className="flex flex-col items-center gap-0.5 min-w-[180px] text-center">
          <span className="text-caption uppercase tracking-wider text-text-muted">
            Valor Total da O.S.
          </span>
          <span className="text-h2 font-mono tabular-nums text-brand">
            {brl(totalValue)}
          </span>
        </Card>
      </div>

      <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
        Salvar Ordem de Serviço
      </Button>
    </div>
  );
}
