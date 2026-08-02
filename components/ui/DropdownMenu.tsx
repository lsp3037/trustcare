'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Menu de ações acessível. As cópias em Estoque/Clientes/Serviços eram um
 * `<div>` absoluto sem `role`, sem navegação por seta, sem Esc e sem fechar
 * ao clicar fora — e, dentro do wrapper `overflow-x-auto` da tabela, o menu
 * era cortado na última coluna.
 *
 * Aqui o painel é levado para o `<body>` por portal e posicionado com
 * `position: fixed` a partir do retângulo do gatilho — nenhum contêiner com
 * overflow consegue recortá-lo.
 *
 * O portal não é opcional: `Card` usa `backdrop-blur`, e um ancestral com
 * `backdrop-filter` vira bloco de contenção para descendentes `fixed`. Sem
 * sair da árvore, o menu se posiciona pela borda do Card em vez da janela e
 * escapa da tela.
 *
 *   <DropdownMenu label="Ações do produto X">
 *     <DropdownMenuItem href={`/dashboard/inventory/${id}`}>Ver detalhes</DropdownMenuItem>
 *     <DropdownMenuItem destructive onSelect={() => remover(id)}>Excluir</DropdownMenuItem>
 *   </DropdownMenu>
 */

interface MenuContext {
  close: () => void;
}

const DropdownContext = React.createContext<MenuContext | null>(null);

export interface DropdownMenuProps {
  /** Nome acessível do gatilho — inclua o item: "Ações do produto Cabo HDMI". */
  label: string;
  /** Gatilho customizado. O padrão é o botão de três pontos. */
  trigger?: React.ReactNode;
  children: React.ReactNode;
  /** Largura do painel. */
  className?: string;
}

const PANEL_WIDTH = 208; // w-52
const GAP = 6;

export function DropdownMenu({ label, trigger, children, className }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const place = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // `clientWidth`, não `innerWidth`: o segundo inclui a barra de rolagem,
    // e o painel acabaria parcialmente embaixo dela.
    const viewportWidth = document.documentElement.clientWidth;
    // Alinhado à direita do gatilho, preso dentro da janela.
    const left = Math.min(
      Math.max(GAP, rect.right - PANEL_WIDTH),
      viewportWidth - PANEL_WIDTH - GAP,
    );
    setPosition({ top: rect.bottom + GAP, left });
  }, []);

  const close = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();

    // Rolar ou redimensionar move o gatilho e o painel fixo ficaria para trás.
    // Fechar é mais honesto que reposicionar durante o gesto.
    const onDismiss = () => setOpen(false);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [open, place]);

  // Foca o primeiro item ao abrir.
  React.useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();

    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = current;
    if (e.key === 'ArrowDown') next = (current + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else next = items.length - 1;

    items[next]?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {trigger ?? <MoreHorizontal className="w-4 h-4" aria-hidden />}
      </button>

      {open &&
        createPortal(
          <>
            {/* Captura o clique fora sem escurecer a tela: um menu não é modal. */}
            <div
              className="fixed inset-0 z-[90]"
              aria-hidden
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <div
              ref={panelRef}
              role="menu"
              aria-label={label}
              onKeyDown={onPanelKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
              className={cn(
                'fixed z-[91] p-1.5',
                'bg-surface-raised/95 backdrop-blur-2xl border border-glass-border-strong',
                'rounded-2xl shadow-2xl',
                className,
              )}
            >
              <DropdownContext.Provider value={{ close: () => setOpen(false) }}>
                {children}
              </DropdownContext.Provider>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

const ITEM_CLASSES =
  'flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-small font-medium ' +
  'transition-colors cursor-pointer ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

export interface DropdownMenuItemProps {
  /** Vira um <Link> de navegação em vez de botão de ação. */
  href?: string;
  onSelect?: () => void;
  /** Ação destrutiva — texto em `danger`. */
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuItem({
  href,
  onSelect,
  destructive = false,
  disabled = false,
  icon,
  children,
  className,
}: DropdownMenuItemProps) {
  const ctx = React.useContext(DropdownContext);

  const tone = destructive
    ? 'text-danger hover:bg-danger/10'
    : 'text-text hover:bg-surface-overlay';

  if (href) {
    return (
      <Link
        href={href}
        role="menuitem"
        onClick={() => ctx?.close()}
        className={cn(ITEM_CLASSES, tone, className)}
      >
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        ctx?.close();
        onSelect?.();
      }}
      className={cn(
        ITEM_CLASSES,
        tone,
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}
