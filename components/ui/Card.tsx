import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adiciona affordance de clique (borda reage ao hover). */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Torna o card inteiro um destino de navegação.
   *
   * Prefira isto a `onClick`: um `<div onClick>` não é alcançável por teclado,
   * e marcá-lo como `role="button"` cria aninhamento inválido quando o card
   * tem controles dentro (checkbox, menu de ações).
   *
   * A técnica é um link que cobre o card (`absolute inset-0`). O conteúdo
   * comum fica embaixo e o clique atravessa até o link. **Qualquer controle
   * interativo dentro do card precisa de `relative z-10`** para continuar
   * clicável — ver o card de OS em `dashboard/orders`.
   */
  href?: string;
  /** Nome acessível do link que cobre o card. Obrigatório junto de `href`. */
  linkLabel?: string;
}

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export function Card({
  interactive = false,
  padding = 'md',
  href,
  linkLabel,
  className,
  children,
  ...props
}: CardProps) {
  const clickable = interactive || Boolean(href);

  return (
    <div
      className={cn(
        'bg-glass backdrop-blur-xl border border-glass-border rounded-[20px] shadow-sm',
        PADDING[padding],
        href && 'relative',
        // Sem `-translate-y`: o card é uma superfície de conteúdo, não um
        // botão. A borda e a sombra já dão a affordance de clique.
        clickable &&
          'cursor-pointer transition-all duration-300 hover:border-glass-border-strong hover:shadow-lg hover:shadow-black/20 active:scale-[0.99]',
        // O foco aparece na borda do card, embora quem receba o foco seja o
        // link que o cobre.
        href &&
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand',
        className,
      )}
      {...props}
    >
      {href && (
        <Link href={href} className="absolute inset-0 rounded-[20px] focus:outline-none">
          <span className="sr-only">{linkLabel}</span>
        </Link>
      )}
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-text', className)} {...props}>
      {children}
    </h3>
  );
}
