import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

/**
 * Placeholder de carregamento. Substitui os 22 blocos `animate-pulse` soltos,
 * que divergiam em cor, raio e no atraso de animação.
 *
 * Sempre dentro de um contêiner com `aria-busy` — o esqueleto em si é
 * decoração e fica escondido do leitor de tela.
 */
export function Skeleton({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('bg-surface-overlay rounded-lg animate-pulse', className)}
      style={style}
      {...props}
    />
  );
}

/** Bloco de linhas de texto. A última sai mais curta, como um parágrafo real. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-1/2' : 'w-full')}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

/** Grade de cards em carregamento — listagens e KPIs. */
export function SkeletonCards({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando"
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex justify-between items-start mb-4">
            <Skeleton className="w-9 h-9 rounded-2xl" />
            <Skeleton className="w-12 h-4 rounded-full" />
          </div>
          <Skeleton className="h-3 w-28 mb-2" />
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-2 w-32" />
        </Card>
      ))}
    </div>
  );
}

/** Linhas de tabela em carregamento. `columns` casa com o cabeçalho real. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando"
      className={cn('divide-y divide-border', className)}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 py-3 px-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn('h-3', colIndex === 0 ? 'w-24 shrink-0' : 'flex-1')}
              style={{ animationDelay: `${rowIndex * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
