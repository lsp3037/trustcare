import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  /** O que está vazio, em uma frase. */
  title: string;
  /** Como sair do estado vazio. Uma tela vazia é um convite para agir. */
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-14 px-6',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 text-text-subtle [&>svg]:w-8 [&>svg]:h-8" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-text">{title}</p>
      {description && (
        <p className="text-sm text-text-muted mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
