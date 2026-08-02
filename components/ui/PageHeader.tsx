import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Cabeçalho de página. Antes cada tela reescrevia esta composição à mão —
 * dez cópias com ícone, espaçamento e ordem de ações divergentes.
 *
 * O `<h1>` vive aqui. O header do layout mostra contexto de navegação, não
 * o título: os dois juntos repetiam o mesmo texto a 60px de distância.
 */
export interface PageHeaderProps {
  /** Ícone lucide já instanciado. Fica em `text-text-subtle`, não compete. */
  icon?: React.ReactNode;
  title: string;
  /** Uma frase sobre o que se faz nesta tela. */
  description?: string;
  /** Contadores e etiquetas de contexto — normalmente <Badge>. */
  badges?: React.ReactNode;
  /** Ações da página. A primária vai por último, encostada na direita. */
  actions?: React.ReactNode;
  /** Volta para a listagem. Use em telas de detalhe. */
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  icon,
  title,
  description,
  badges,
  actions,
  backHref,
  backLabel = 'Voltar',
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-small font-medium text-text-muted hover:text-text transition-colors w-fit rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h1 text-text flex items-center gap-2.5">
            {icon && (
              <span className="text-text-subtle shrink-0 [&>svg]:w-7 [&>svg]:h-7" aria-hidden>
                {icon}
              </span>
            )}
            {title}
          </h1>

          {description && (
            <p className="text-small text-text-muted mt-2">{description}</p>
          )}

          {badges && (
            <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>
          )}
        </div>

        {/* Sem `shrink-0`: com ele o bloco de ações se recusa a encolher e
            empurra a largura mínima da página, gerando rolagem horizontal no
            documento inteiro. O `flex-wrap` já resolve o aperto quebrando
            linha. */}
        {actions && (
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">{actions}</div>
        )}
      </div>
    </div>
  );
}
