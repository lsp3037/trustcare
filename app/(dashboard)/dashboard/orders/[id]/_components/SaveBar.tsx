'use client';
import React, { useLayoutEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SaveBarProps {
  dirty: boolean;
  saving: boolean;
  disabled?: boolean;
  /** Texto exibido no estado "tudo salvo" (ex.: "Salvo às 14:32"). */
  savedLabel: string;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * Único ponto de gravação da OS. Fica colada na base da viewport e sempre
 * visível: mostra se há alterações pendentes e só habilita as ações quando
 * houver o que salvar.
 */
export function SaveBar({ dirty, saving, disabled, savedLabel, onSave, onDiscard }: SaveBarProps) {
  // `sticky` não funciona aqui: a página rola na janela, mas o <main> tem
  // overflow-y-auto e vira o contêiner do sticky sem nunca rolar. Então a barra
  // é `fixed` e acompanha a largura do <main> (respeita menu lateral aberto/recolhido).
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const measure = () => {
      const r = main.getBoundingClientRect();
      setBox({ left: r.left, width: r.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(main);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <>
    {/* Reserva o espaço da barra para ela não cobrir o fim do conteúdo */}
    <div aria-hidden className="h-16" />
    <div
      role="region"
      aria-label="Salvar ordem de serviço"
      style={box ? { left: box.left, width: box.width } : { left: 0, right: 0 }}
      className="fixed bottom-0 z-30 flex items-center gap-3 border-t border-border bg-surface-sunken px-6 py-3 lg:px-8"
    >
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'mr-auto flex items-center gap-2 text-small font-semibold',
          dirty ? 'text-text' : 'text-text-muted',
        )}
      >
        {dirty ? (
          <>
            <span className="h-2 w-2 rounded-full bg-warning" aria-hidden />
            Alterações não salvas
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-success" aria-hidden />
            {savedLabel}
          </>
        )}
      </p>
      <Button variant="ghost" onClick={onDiscard} disabled={!dirty || saving}>
        Descartar
      </Button>
      <Button loading={saving} onClick={onSave} disabled={!dirty || disabled}>
        Salvar OS
      </Button>
    </div>
    </>
  );
}
