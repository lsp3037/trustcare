'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Barra flutuante de ações em lote. Existiam duas implementações divergentes
 * — Estoque com `rounded-xl bg-slate-900/90`, OS quadrada com
 * `bg-surface-overlay` — e as duas escreviam a contagem à mão.
 */
export interface BulkActionBarProps {
  /** Quantos itens estão selecionados. `0` não renderiza nada. */
  count: number;
  /** Par [singular, plural] — "OS selecionada" / "OS selecionadas". */
  itemLabel: [string, string];
  onClear: () => void;
  /** Ações em lote. Normalmente <Button size="sm"> separados por <BulkDivider>. */
  children: React.ReactNode;
  className?: string;
}

export function BulkActionBar({
  count,
  itemLabel,
  onClear,
  children,
  className,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Ações em massa"
      className={cn(
        'toast-enter fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        // `w-max`: em elemento fixo com `left-1/2`, o bloco de contenção começa
        // no meio da tela, então a largura disponível é só 50% e a barra
        // quebrava linha sem necessidade. O `-translate-x-1/2` só desloca
        // depois, sem devolver a largura.
        'w-max max-w-[calc(100vw-2rem)] py-3 px-4',
        'bg-surface-raised/90 backdrop-blur-2xl border border-glass-border-strong',
        'rounded-[20px] shadow-2xl',
        'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 print:hidden',
        className,
      )}
    >
      <span className="text-small text-text-muted">
        <strong className="font-mono tabular-nums text-text">{count}</strong>{' '}
        {count === 1 ? itemLabel[0] : itemLabel[1]}
      </span>

      <BulkDivider />
      {children}
      <BulkDivider />

      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar seleção
      </Button>
    </div>
  );
}

export function BulkDivider() {
  return <div aria-hidden className="h-4 w-px bg-border shrink-0" />;
}
