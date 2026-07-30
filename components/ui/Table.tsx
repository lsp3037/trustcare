import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tabela de dados. O wrapper faz o scroll horizontal próprio para que
 * a página nunca role na horizontal em telas estreitas.
 */
export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-border', className)} {...props}>
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
  return (
    <th
      scope="col"
      className={cn(
        'py-3 px-4 text-xs font-semibold text-text-subtle whitespace-nowrap',
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
  return (
    <td
      className={cn(
        'py-3 px-4 text-text align-middle',
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
