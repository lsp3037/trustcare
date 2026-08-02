'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Feedback não-bloqueante. Substitui os `alert()` nativos que eram o único
 * canal de retorno do sistema — travavam a aba, não tinham estilo e não
 * eram anunciados de forma útil por leitor de tela.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('OS atualizada');
 *   toast.error('Falha ao salvar', { description: err.message, action: {...} });
 */

type Tone = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Linha de apoio. Use para o detalhe técnico; o título fica curto. */
  description?: string;
  /** Botão único de recuperação — "Tentar de novo", "Desfazer". */
  action?: ToastAction;
  /** ms. `0` mantém o toast até o usuário fechar. Erros já são persistentes. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
  tone: Tone;
  message: string;
}

const DEFAULT_DURATION = 5000;

/** Erro não some sozinho: quem precisa ler a mensagem de falha é quem vai agir. */
const DURATION_BY_TONE: Record<Tone, number> = {
  success: DEFAULT_DURATION,
  info: DEFAULT_DURATION,
  warning: 8000,
  error: 0,
};

const TONE_STYLES: Record<Tone, { icon: React.ElementType; className: string }> = {
  success: { icon: CheckCircle2, className: 'bg-success/15 text-success' },
  error: { icon: XCircle, className: 'bg-danger/15 text-danger' },
  warning: { icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
  info: { icon: Info, className: 'bg-info/15 text-info' },
};

interface ToastApi {
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

/**
 * Fora de um `ToastProvider` a API vira no-op com aviso, em vez de derrubar
 * a árvore — o provider é montado no layout do dashboard, e telas públicas
 * podem renderizar componentes compartilhados sem ele.
 */
const NOOP_API: ToastApi = {
  success: () => '',
  error: () => '',
  warning: () => '',
  info: () => '',
  dismiss: () => {},
};

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('useToast() chamado fora de <ToastProvider>. O toast foi ignorado.');
    }
    return NOOP_API;
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback((tone: Tone, message: string, options?: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => {
      const next = [...prev, { id, tone, message, ...options }];
      // Teto de 4: uma pilha maior que isso cobre o conteúdo e ninguém lê.
      return next.slice(-4);
    });
    return id;
  }, []);

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      warning: (message, options) => push('warning', message, options),
      info: (message, options) => push('info', message, options),
      dismiss,
    }),
    [push, dismiss],
  );

  // Erros vão para a região assertiva, o resto para a educada. As duas ficam
  // sempre montadas: região de live inserida junto com o conteúdo costuma
  // não ser anunciada.
  const assertive = toasts.filter((t) => t.tone === 'error');
  const polite = toasts.filter((t) => t.tone !== 'error');

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none print:hidden"
        aria-label="Notificações"
      >
        <div role="alert" aria-live="assertive" className="flex flex-col gap-2">
          {assertive.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {polite.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = React.useState(false);
  const duration = toast.duration ?? DURATION_BY_TONE[toast.tone];
  const { icon: Icon, className: toneClass } = TONE_STYLES[toast.tone];

  React.useEffect(() => {
    if (duration <= 0 || paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [duration, paused, toast.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'toast-enter pointer-events-auto flex items-start gap-3 p-4',
        'bg-surface-raised/90 backdrop-blur-2xl border border-glass-border-strong',
        'rounded-[20px] shadow-2xl',
      )}
    >
      <div className={cn('p-2 rounded-2xl shrink-0', toneClass)} aria-hidden>
        <Icon className="w-4 h-4" strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-small font-semibold text-text">{toast.message}</p>
        {toast.description && (
          <p className="text-caption text-text-muted mt-1 break-words">{toast.description}</p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2.5 text-small font-semibold text-brand hover:text-brand-hover transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-full"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className="shrink-0 p-1 rounded-lg text-text-subtle hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}
