'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 text-slate-900 p-8">
      <div className="bg-white border border-slate-200 p-8 rounded-xl max-w-md w-full text-center shadow-lg">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>
        
        <h2 className="text-xl font-bold mb-2">Erro ao carregar o painel</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Ocorreu um problema ao tentar renderizar este módulo. Nossos engenheiros foram notificados.
        </p>
        
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
