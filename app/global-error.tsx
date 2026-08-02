'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aqui poderíamos logar o erro no Sentry, Datadog, etc.
    console.error('Erro Capturado (Global):', error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-surface text-white p-4 font-sans">
          <div className="bg-surface-raised border border-border p-8 rounded-2xl max-w-md w-full text-center shadow-2xl relative overflow-hidden">
            {/* Efeito visual */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-danger/10 blur-3xl rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-danger/10 blur-3xl rounded-full"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mb-6 border border-danger/25">
                <AlertTriangle className="w-8 h-8 text-danger" />
              </div>
              
              <h1 className="text-2xl font-bold mb-2">Ops! Algo deu errado.</h1>
              <p className="text-text-muted mb-8 text-sm">
                Ocorreu um erro inesperado ao carregar a plataforma. Nossa equipe foi notificada (Erro: {error.digest || 'Desconhecido'}).
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => reset()}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-danger hover:bg-danger text-white rounded-xl transition-colors font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Tentar Novamente
                </button>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-surface-overlay hover:bg-surface-overlay text-text rounded-xl transition-colors font-medium"
                >
                  Voltar ao Início
                </Link>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
