import { ShieldCheck } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0d16] text-white">
      <div className="relative flex flex-col items-center">
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full w-32 h-32 animate-pulse"></div>
        <div className="relative z-10 p-4 bg-surface-raised/50 backdrop-blur-md rounded-2xl border border-border shadow-2xl mb-4">
          <ShieldCheck className="w-10 h-10 text-brand animate-pulse" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">Carregando Trust Care...</h2>
        <div className="w-48 h-1 bg-surface-overlay rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-info to-brand w-1/2 rounded-full animate-[progress_1s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
}
