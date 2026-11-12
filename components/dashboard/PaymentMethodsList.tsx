'use client';

import React from 'react';
import { motion } from 'motion/react';

const PAYMENT_STYLES: Record<string, { label: string; chip: string; grad: string }> = {
  pix: { label: 'PIX', chip: 'bg-brand/15 text-brand border-brand/30', grad: 'from-brand to-brand/50' },
  cartao: { label: 'CC', chip: 'bg-info/15 text-info border-info/30', grad: 'from-info to-info/50' },
  boleto: { label: 'BOL', chip: 'bg-warning/15 text-warning border-warning/30', grad: 'from-warning to-warning/50' },
  default: { label: 'OUT', chip: 'bg-text-muted/15 text-text-muted border-text-muted/30', grad: 'from-text-muted to-text-subtle' },
};

function getPaymentStyle(method: string) {
  const norm = method.toLowerCase();
  if (norm.includes('pix')) return PAYMENT_STYLES.pix;
  if (norm.includes('cart') || norm.includes('crédito') || norm.includes('debito')) return PAYMENT_STYLES.cartao;
  if (norm.includes('bol') || norm.includes('transf')) return PAYMENT_STYLES.boleto;
  return PAYMENT_STYLES.default;
}

const brl = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PaymentMethodsListProps {
  /** Valor recebido por forma de pagamento. */
  distribution: Record<string, number>;
  /** Total usado como 100%. Padrão: a soma da distribuição. */
  total?: number;
}

/** Formas de recebimento em cards com barra de participação (estilo carteira digital). */
export function PaymentMethodsList({ distribution, total }: PaymentMethodsListProps) {
  const entries = Object.entries(distribution).filter(([, v]) => v > 0);
  const base = total && total > 0 ? total : entries.reduce((s, [, v]) => s + v, 0);

  if (entries.length === 0) {
    return <p className="text-small text-text-subtle">Nenhum pagamento registrado no período.</p>;
  }

  return (
    <div className="space-y-3">
      {entries
        .sort(([, a], [, b]) => b - a)
        .map(([method, value]) => {
          const percent = base > 0 ? (value / base) * 100 : 0;
          const style = getPaymentStyle(method);
          return (
            <div
              key={method}
              className="p-3 rounded-2xl bg-surface-sunken/60 border border-glass-border hover:border-glass-border-strong transition-colors"
            >
              <div className="flex justify-between items-center gap-3 text-small mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`px-2 py-0.5 rounded-md text-caption font-extrabold border shrink-0 ${style.chip}`}>
                    {style.label}
                  </span>
                  <span className="font-semibold text-text truncate">{method}</span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="font-mono font-bold text-text tabular-nums">{percent.toFixed(1)}%</span>
                  <span className="text-caption text-text-subtle font-mono tabular-nums">({brl(value)})</span>
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
        })}
    </div>
  );
}
