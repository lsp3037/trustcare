'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, Card } from '@/components/ui';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro Capturado (Dashboard):', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8">
      <Card padding="lg" className="max-w-md w-full text-center" role="alert">
        <div
          className="w-16 h-16 rounded-2xl bg-danger/15 text-danger flex items-center justify-center mx-auto mb-6"
          aria-hidden
        >
          <AlertTriangle className="w-8 h-8" strokeWidth={1.8} />
        </div>

        <h2 className="text-h2 text-text mb-2">Erro ao carregar o painel</h2>
        <p className="text-small text-text-muted mb-6">
          Ocorreu um problema ao renderizar este módulo. Nossos engenheiros foram notificados.
        </p>

        {/* O digest é o que liga esta tela ao log do servidor — sem ele o
            suporte não consegue localizar a ocorrência. */}
        {error.digest && (
          <p className="text-caption font-mono text-text-subtle mb-6">
            Código: {error.digest}
          </p>
        )}

        <Button fullWidth icon={<RotateCcw className="w-4 h-4" />} onClick={() => reset()}>
          Tentar novamente
        </Button>
      </Card>
    </div>
  );
}
