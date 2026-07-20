'use client';

import React, { useState } from 'react';
import { ShieldAlert, CreditCard, MessageSquare, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SubscriptionBlockedScreenProps {
  companyName: string;
  status: 'canceled' | 'past_due' | string;
}

export default function SubscriptionBlockedScreen({ companyName, status }: SubscriptionBlockedScreenProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem('os-session');
    router.push('/login');
  };

  const isCanceled = status === 'canceled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 font-sans select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(30,58,138,0.05),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        {/* Top visual warning */}
        <div className="flex justify-center">
          <div className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-none shadow-lg shadow-rose-500/5 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
            Acesso Suspenso
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {companyName}
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {isCanceled 
              ? 'Sua assinatura do Trust Care foi cancelada. Para continuar utilizando a plataforma e gerenciar suas ordens de serviço, é necessário reativar seu plano.'
              : 'Identificamos uma pendência no pagamento da sua assinatura. Para evitar a perda definitiva de acesso e garantir a continuidade dos seus serviços, regularize seu plano.'}
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-none text-left space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-blue-500" />
            Informações sobre o plano
          </h3>
          <p className="text-xs text-slate-455 leading-relaxed">
            Seus dados cadastrados, clientes e histórico de ordens de serviço continuam armazenados com total segurança. Assim que a assinatura for restabelecida, o acesso total será liberado instantaneamente.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href="https://wa.me/5565999620703?text=Ol%C3%A1!%20Gostaria%20de%20reativar%20minha%20assinatura%20do%20Trust%20Care%20para%20a%20empresa%20"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-none text-xs transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" /> Falar com Suporte (Reativar)
          </a>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-6 py-3 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white font-bold rounded-none text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" /> Sair da Conta
          </button>
        </div>

        <p className="text-[10px] text-slate-650 font-semibold tracking-wide uppercase">
          Trust Care - Gestão Inteligente de Assistências
        </p>
      </div>
    </div>
  );
}
