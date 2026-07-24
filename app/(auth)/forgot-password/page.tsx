'use client';

import { useState } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
    });

    if (error) {
      setMessage({ type: 'error', text: 'Não foi possível enviar o e-mail de recuperação. Verifique se o e-mail está correto.' });
    } else {
      setMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada ou spam.' });
    }
    
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-2">Recuperar Senha</h2>
          <p className="text-neutral-400 text-center mb-8 text-sm">
            Digite seu e-mail cadastrado e enviaremos um link para você redefinir sua senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all placeholder:text-neutral-600"
                required
              />
            </div>

            {message && (
              <div className={`p-4 rounded-lg text-sm border ${
                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || message?.type === 'success'}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
