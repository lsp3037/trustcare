'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Linha de apoio sob o título. */
  description?: string;
  size?: keyof typeof SIZES;
  /** Rodapé de ações. Normalmente um par de <Button>. */
  footer?: React.ReactNode;
  /** Opcional: diálogos de confirmação são só título + descrição + ações. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Diálogo modal com foco preso, fechamento por Esc e por clique no backdrop.
 * Renderizado no document.body via createPortal para evitar bugs de z-index
 * e posicionamento causados por containers pai com transform/overflow.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  className,
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Esc fecha; Tab circula dentro do painel.
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Trava o scroll do body e devolve o foco ao fechar.
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const raf = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
        )
        ?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="presentation"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative w-full bg-surface-raised border border-glass-border-strong rounded-[20px] shadow-2xl my-auto z-10',
          'max-h-[calc(100vh-3rem)] flex flex-col',
          SIZES[size],
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-glass-divider shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm text-text-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 p-1 text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {children != null && (
          <div className="p-5 overflow-y-auto min-h-0">{children}</div>
        )}

        {footer && (
          <footer className="flex items-center justify-end gap-3 p-5 border-t border-glass-divider shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
