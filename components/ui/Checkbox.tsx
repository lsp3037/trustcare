'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Caixa de seleção. Antes eram inputs do tipo checkbox crus repetindo as
 * mesmas classes em cada célula de tabela e cada card.
 *
 * Traz o estado `indeterminate`, que faltava: o "selecionar todos" ficava
 * desmarcado quando parte da lista estava selecionada, dizendo ao usuário
 * que nada estava marcado.
 */
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Rótulo visível ao lado da caixa. Sem ele, passe `aria-label`. */
  label?: string;
  /** Seleção parcial — nem todos, nem nenhum. */
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, indeterminate = false, className, ...props }, forwardedRef) {
    const innerRef = React.useRef<HTMLInputElement>(null);

    // `indeterminate` só existe como propriedade do DOM: não há atributo HTML
    // equivalente, então precisa ser escrito no elemento depois da montagem.
    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement);

    const input = (
      <span className="relative inline-flex items-center justify-center">
        <input
          ref={innerRef}
          type="checkbox"
          aria-label={label || (props['aria-label'] as string) || 'Selecionar'}
          aria-checked={indeterminate ? 'mixed' : undefined}
          className={cn(
            'w-4 h-4 shrink-0 rounded border-border bg-surface-sunken accent-brand cursor-pointer touch-manipulation',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'before:content-[\'\'] before:absolute before:-inset-3 before:pointer-events-auto sm:before:hidden',
            className,
          )}
          {...props}
        />
      </span>
    );

    if (!label) return input;

    return (
      <label className="inline-flex items-center gap-2.5 min-h-[44px] sm:min-h-0 cursor-pointer select-none touch-manipulation">
        {input}
        <span className="text-small text-text">{label}</span>
      </label>
    );
  },
);
