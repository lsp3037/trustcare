'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

/**
 * Barra de busca e filtros de uma listagem. Extraída da tela de OS, que era
 * a implementação mais completa — as outras telas tinham cópias parciais com
 * espaçamento e ordem próprios.
 *
 * Composição:
 *   <Toolbar>
 *     <ToolbarSearch value={q} onValueChange={setQ} placeholder="Buscar..." />
 *     <ToolbarGroup>
 *       <Select ... />
 *       <ToolbarDivider />
 *       <SegmentedControl ... />
 *     </ToolbarGroup>
 *   </Toolbar>
 */
export function Toolbar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      padding="sm"
      className={cn(
        'flex flex-col md:flex-row md:items-center gap-3 md:gap-4',
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

/** Agrupa os controles à direita da busca. */
export function ToolbarGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full md:w-auto shrink-0 md:justify-end',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ToolbarDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('h-8 w-px bg-border hidden sm:block shrink-0', className)}
    />
  );
}

export interface ToolbarSearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * Campo de busca com ícone e botão de limpar. O `type="search"` nativo já
 * traz um X no Chrome, mas ele some no Firefox e não é alcançável por
 * teclado de forma consistente — daí o botão explícito.
 */
export function ToolbarSearch({
  value,
  onValueChange,
  placeholder = 'Buscar...',
  className,
  ...props
}: ToolbarSearchProps) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-surface-sunken border border-border text-text placeholder:text-text-subtle rounded-xl',
          'pl-10 pr-10 py-2 text-sm transition-all duration-200',
          'hover:border-border-strong',
          'focus:border-brand focus:outline-2 focus:outline-offset-0 focus:outline-brand/40',
          className,
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-text-subtle hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  /** Ícone opcional. Sem rótulo visível, `label` vira o nome acessível. */
  icon?: React.ReactNode;
  label: string;
  /** Esconde o texto e deixa só o ícone (com `title` e `sr-only`). */
  iconOnly?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** Nome do grupo para leitor de tela — ex.: "Modo de visualização". */
  label: string;
  className?: string;
}

/** Escolha exclusiva entre poucas opções — modo de visualização, densidade. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex items-center bg-surface-sunken border border-border rounded-xl p-1 shrink-0',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            title={option.iconOnly ? option.label : undefined}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-small font-medium',
              'transition-colors cursor-pointer',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              active
                ? 'bg-brand text-brand-contrast'
                : 'text-text-subtle hover:text-text',
            )}
          >
            {option.icon}
            {option.iconOnly ? (
              <span className="sr-only">{option.label}</span>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}
