'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type Density = 'comfortable' | 'compact';

/** Altura de linha por densidade. `compact` cabe ~40% mais linhas na tela. */
const DENSITY_CELL: Record<Density, string> = {
  comfortable: 'py-3 px-4',
  compact: 'py-1.5 px-3',
};

const DensityContext = React.createContext<Density>('comfortable');

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** `compact` para quem trabalha com listas longas (200+ OS). */
  density?: Density;
  /** Mantém o cabeçalho visível durante o scroll vertical da listagem. */
  stickyHeader?: boolean;
}

/**
 * Tabela de dados. O wrapper faz o scroll horizontal próprio para que
 * a página nunca role na horizontal em telas estreitas.
 */
export function Table({
  density = 'comfortable',
  stickyHeader = false,
  className,
  children,
  ...props
}: TableProps) {
  return (
    <DensityContext.Provider value={density}>
      <div className={cn('w-full overflow-x-auto', stickyHeader && 'max-h-[70vh] overflow-y-auto')}>
        <table className={cn('w-full text-sm border-collapse', className)} {...props}>
          {children}
        </table>
      </div>
    </DensityContext.Provider>
  );
}

export function THead({
  sticky = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }) {
  return (
    <thead
      className={cn(
        'border-b border-border',
        // Precisa de fundo opaco: sem isso as linhas passam por baixo do
        // cabeçalho durante o scroll.
        sticky && 'sticky top-0 z-10 bg-surface-raised',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  );
}

export interface TRProps extends React.HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
}

export function TR({ interactive, className, children, ...props }: TRProps) {
  return (
    <tr
      className={cn(
        interactive && 'cursor-pointer transition-colors hover:bg-surface-overlay',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface CellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  /** Alinha dígitos — use em valores, códigos e datas. */
  numeric?: boolean;
}

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

export function TH({ align = 'left', className, children, ...props }: CellProps) {
  const density = React.useContext(DensityContext);
  return (
    <th
      scope="col"
      className={cn(
        DENSITY_CELL[density],
        'text-caption font-semibold text-text-subtle whitespace-nowrap',
        ALIGN[align],
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({
  align = 'left',
  numeric = false,
  className,
  children,
  ...props
}: CellProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  const density = React.useContext(DensityContext);
  return (
    <td
      className={cn(
        DENSITY_CELL[density],
        'text-text align-middle',
        ALIGN[align],
        numeric && 'font-mono tabular-nums',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}
