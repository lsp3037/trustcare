'use client';

import { useState } from 'react';
import { ShieldAlert, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setMessage({ type: 'error', text: 'Falha ao redefinir a senha. O link pode ter expirado.' });
      setLoading(false);
    } else {
      setMessage({ type: 'success', text: 'Senha alterada com sucesso! Redirecionando...' });
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <KeyRound className="w-8 h-8 text-emerald-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-2">Criar Nova Senha</h2>
          <p className="text-neutral-400 text-center mb-8 text-sm">
            Digite sua nova senha abaixo para recuperar o acesso à sua conta.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pass" className="block text-sm font-medium text-neutral-300 mb-1">
                Nova Senha
              </label>
              <input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-neutral-600"
                required
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-neutral-300 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-neutral-600"
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
