'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Confirmação em Promise, para substituir `window.confirm()`. O nativo é
 * bloqueante, não tem estilo, não diz o que vai acontecer e trata "excluir
 * 12 OS restaurando o estoque" com o mesmo peso de "descartar rascunho".
 *
 * Uso:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Excluir 3 ordens de serviço?',
 *     description: 'As peças alocadas voltam ao estoque. Não dá para desfazer.',
 *     confirmLabel: 'Excluir OS',
 *     destructive: true,
 *   });
 *   if (!ok) return;
 */

export interface ConfirmOptions {
  /** A pergunta, com o objeto e a quantidade. Evite "Tem certeza?". */
  title: string;
  /** A consequência. É aqui que o usuário decide. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação irreversível: o botão de confirmar vira `danger`. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('useConfirm() chamado fora de <ConfirmProvider>. A ação foi cancelada.');
    }
    return async () => false;
  }
  return ctx;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending((prev) => {
        // Um diálogo por vez. Se algo pedir confirmação com outro aberto,
        // o anterior é resolvido como cancelado em vez de ficar pendurado.
        prev?.resolve(false);
        return { options, resolve };
      });
    });
  }, []);

  const settle = React.useCallback((value: boolean) => {
    setPending((prev) => {
      prev?.resolve(value);
      return null;
    });
  }, []);

  // Promise pendente numa árvore desmontada nunca resolve: quem deu `await`
  // fica parado para sempre. Resolve como cancelado.
  React.useEffect(() => {
    return () => {
      setPending((prev) => {
        prev?.resolve(false);
        return null;
      });
    };
  }, []);

  const options = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={pending !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        description={options?.description}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {options?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button
              variant={options?.destructive ? 'danger' : 'primary'}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      />
      {/* Sem corpo de propósito: o texto vive na `description` do Modal, que é
          o alvo do `aria-describedby`. */}
    </ConfirmContext.Provider>
  );
}
