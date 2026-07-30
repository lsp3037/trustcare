import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-contrast hover:bg-brand-hover border border-transparent',
  secondary:
    'bg-surface-raised text-text border border-border hover:border-border-strong hover:bg-surface-overlay',
  ghost:
    'bg-transparent text-text-muted border border-transparent hover:text-text hover:bg-surface-overlay',
  danger:
    'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

const BASE =
  'inline-flex items-center justify-center font-semibold whitespace-nowrap ' +
  'transition-colors duration-150 cursor-pointer ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:opacity-50 disabled:pointer-events-none';

/**
 * Mesmas classes do <Button>, para elementos que precisam ser `<a>`/`<Link>`
 * de verdade (navegação). Evita a terceira reescrita inline do botão.
 */
export function buttonClasses(opts: {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  const { variant = 'primary', size = 'md', fullWidth = false, className } = opts;
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Ícone à esquerda do texto. Some enquanto `loading`. */
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      fullWidth = false,
      className,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={buttonClasses({ variant, size, fullWidth, className })}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);
