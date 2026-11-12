'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Film, FileText, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import s from './UploadModal.module.css';

export interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  /** Recebe os arquivos confirmados. Chamado uma vez, ao final da animação. */
  onConfirm: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
}

type Staged = { id: string; file: File; preview?: string };
type Phase = 'idle' | 'attaching' | 'done';

const CLOSE_MS = 150;
const PROGRESS_MS = 600;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Texto que sai para cima com blur e entra de baixo quando muda. */
function SwapText({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');

  useEffect(() => {
    if (text === shown) return;
    setPhase('exit');
    let raf1 = 0;
    let raf2 = 0;
    const t = setTimeout(() => {
      setShown(text);
      setPhase('enter');
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase('idle'));
      });
    }, 150);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // Só reage a um texto novo; `shown` fica de fora de propósito.
  }, [text]);

  return (
    <span className={s.swap} data-phase={phase}>
      {shown}
    </span>
  );
}

/**
 * Modal para escolher e revisar anexos antes de incluí-los no formulário.
 * Os arquivos só são entregues a `onConfirm` quando o usuário clica em Anexar.
 */
export function UploadModal({
  open,
  onClose,
  onConfirm,
  title = 'Anexar fotos',
  subtitle = 'JPG, PNG, WebP ou MP4 até 15MB',
  accept = 'image/*,video/*',
  multiple = true,
  maxSizeMB = 15,
}: UploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<'closed' | 'open' | 'closing'>('closed');
  const [staged, setStaged] = useState<Staged[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const stagedRef = useRef<Staged[]>([]);
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  useEffect(() => setMounted(true), []);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    cancelAnimationFrame(raf.current);
  };

  const reset = useCallback(() => {
    stagedRef.current.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    setStaged([]);
    setPhase('idle');
    setPct(0);
    setError(null);
    setDragging(false);
    dragCounter.current = 0;
  }, []);

  // Abre/fecha com animação: o componente fica montado durante a saída.
  useEffect(() => {
    if (open) {
      setState('closed');
      const r = requestAnimationFrame(() => setState('open'));
      return () => cancelAnimationFrame(r);
    }
    if (state === 'closed') return;
    setState('closing');
    const t = window.setTimeout(() => {
      setState('closed');
      clearTimers();
      reset();
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => () => clearTimers(), []);

  const visible = open || state !== 'closed';

  // Trava o scroll, foca o painel e devolve o foco ao fechar.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const r = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    return () => {
      cancelAnimationFrame(r);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const requestClose = useCallback(() => {
    if (phase === 'attaching') return;
    onClose();
  }, [phase, onClose]);

  // Esc fecha; Tab circula dentro do painel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, requestClose]);

  const addFiles = (incoming: File[]) => {
    if (phase !== 'idle') return;
    setError(null);
    const max = maxSizeMB * 1024 * 1024;
    const next: Staged[] = [];
    for (const file of incoming) {
      if (file.size > max) {
        setError(`"${file.name}" passa do limite de ${maxSizeMB}MB.`);
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
    }
    if (next.length === 0) return;
    setStaged((prev) => (multiple ? [...prev, ...next] : next.slice(0, 1)));
  };

  const removeStaged = (id: string) => {
    setStaged((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const confirm = () => {
    if (phase === 'done') return requestClose();
    if (phase !== 'idle' || staged.length === 0) return;
    setPhase('attaching');
    setPct(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / PROGRESS_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 100));
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      onConfirm(staged.map((f) => f.file));
      timers.current.push(
        window.setTimeout(() => setPhase('done'), 120),
        window.setTimeout(() => onClose(), 900),
      );
    };
    raf.current = requestAnimationFrame(tick);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (phase === 'idle') setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (e.dataTransfer?.files?.length) addFiles(Array.from(e.dataTransfer.files));
  };

  const count = staged.length;
  const noun = count === 1 ? 'arquivo' : 'arquivos';
  const label =
    phase === 'attaching' ? 'Anexando' : phase === 'done' ? 'Anexado' : count > 0 ? `Anexar ${count} ${noun}` : 'Anexar';
  const rowStatus = phase === 'done' ? 'Anexado' : phase === 'attaching' ? 'Anexando' : 'Pronto para anexar';

  if (!mounted || !visible) return null;

  return createPortal(
    <div className={s.scrim} data-state={state} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        aria-describedby="upload-modal-desc"
        className={cn(s.modal, 'bg-surface-raised border border-glass-border-strong shadow-2xl text-text')}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className={s.head}>
          <div className="flex-1 min-w-0">
            <h2 id="upload-modal-title" className="text-base font-semibold text-text">
              {title}
            </h2>
            <p id="upload-modal-desc" className="text-caption text-text-muted font-mono mt-0.5">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={requestClose}
            className={cn(s.x, 'text-text-muted hover:text-text hover:bg-surface-overlay cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand')}
          >
            <X className="w-4 h-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />

        <div className={cn(s.zone, 'bg-surface-sunken')} data-has-files={count > 0}>
          <div
            role="button"
            tabIndex={count > 0 ? -1 : 0}
            data-autofocus={count === 0 ? '' : undefined}
            aria-label="Selecionar arquivos"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(
              s.drop,
              'border-2 border-dashed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              dragging ? 'border-brand bg-brand/10 text-brand' : 'border-glass-border text-text-muted hover:border-glass-border-strong',
            )}
          >
            <UploadCloud className="w-8 h-8" strokeWidth={1.2} aria-hidden />
            <span className="text-small font-medium text-text">
              {dragging ? 'Solte para adicionar' : 'Arraste fotos aqui ou clique para escolher'}
            </span>
          </div>

          <ul className={s.list} aria-label="Arquivos selecionados">
            {staged.map((f) => {
              const isVideo = f.file.type.startsWith('video/');
              return (
                <li key={f.id}>
                  <div className={s.row}>
                    <div className={cn(s.thumb, 'bg-glass text-text-muted')} data-done={phase === 'done' ? '' : undefined}>
                      {f.preview && <img src={f.preview} alt="" />}
                      <div className={s.iconSwap} data-state={phase === 'done' ? 'b' : 'a'}>
                        <span className={s.icon} data-icon="a">
                          {f.preview ? <span className="w-4 h-4" /> : isVideo ? <Film className="w-4 h-4" aria-hidden /> : <FileText className="w-4 h-4" aria-hidden />}
                        </span>
                        <span className={cn(s.icon, 'text-brand')} data-icon="b">
                          <Check className="w-4 h-4" strokeWidth={3} aria-hidden />
                        </span>
                      </div>
                    </div>
                    <div className={s.rowText}>
                      <div className={cn(s.name, 'text-small text-text')}>{f.file.name}</div>
                      <div className="text-caption text-text-muted">
                        <SwapText text={rowStatus} /> · {formatSize(f.file.size)}
                      </div>
                    </div>
                    {phase === 'idle' ? (
                      <button
                        type="button"
                        aria-label={`Remover ${f.file.name}`}
                        onClick={() => removeStaged(f.id)}
                        className={cn(s.x, 'text-text-subtle hover:text-danger hover:bg-surface-overlay cursor-pointer focus-visible:outline-2 focus-visible:outline-brand')}
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.25} aria-hidden />
                      </button>
                    ) : (
                      <span className={cn(s.pct, 'text-caption text-text-muted w-9 text-right')}>{pct}%</span>
                    )}
                  </div>
                  <div className={cn(s.bar, 'bg-glass')}>
                    <div className={cn(s.fill, 'bg-brand')} style={{ transform: `scaleX(${phase === 'idle' ? 0 : pct / 100})` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {error && (
          <p role="alert" className="text-small text-danger -mt-1">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={phase !== 'idle'}
            className={cn(
              s.press,
              'h-9 px-3 rounded-full whitespace-nowrap text-small font-medium text-text-muted hover:text-text cursor-pointer disabled:opacity-0 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              count === 0 && 'invisible',
            )}
          >
            + Adicionar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={phase === 'attaching'}
              className={cn(s.press, 'h-9 px-4 rounded-full whitespace-nowrap text-small font-medium bg-glass hover:bg-surface-overlay text-text cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand')}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={count === 0 || phase === 'attaching'}
              data-autofocus={count > 0 ? '' : undefined}
              className={cn(
                s.press,
                'h-9 px-4 rounded-full whitespace-nowrap text-small font-semibold bg-brand text-brand-contrast hover:brightness-110 cursor-pointer',
                'disabled:cursor-default disabled:bg-glass disabled:text-text-subtle',
                phase === 'attaching' && 'disabled:bg-brand disabled:text-brand-contrast',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              )}
            >
              <SwapText text={label} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
