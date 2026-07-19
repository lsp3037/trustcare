'use client';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Image from 'next/image';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Tenta fazer login com o Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Se falhar (por exemplo, banco não configurado ou credenciais incorretas),
        // fornecemos um fallback amigável para testes locais caso o Supabase não esteja pronto.
        console.warn('Erro de autenticação no Supabase:', error.message);

        if (email === 'admin@admin.com' && password === 'admin123') {
          // Salva uma flag mock de sessão no localStorage para a navegação funcionar offline
          localStorage.setItem('os-session', JSON.stringify({ email, companyId: '1', role: 'admin' }));
          router.push('/dashboard');
          return;
        }

        throw new Error(error.message);
      }

      if (data?.session) {
        router.push('/dashboard');
      }
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Falha ao autenticar. Tente admin@admin.com / admin123 para testar offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-8 shadow-2xl">
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo.png"
            alt="Trust Care Logo"
            width={80}
            height={80}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Trust Care - Consultoria em T.I</h1>
        <p className="text-sm text-slate-400 mt-1">Gerenciamento de Ordens de Serviço</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {errorMsg}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@empresa.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Senha</label>
            <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Esqueceu a senha?</a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-none shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2 transition-all duration-200 mt-2 disabled:opacity-55"
        >
          {loading ? (
            <LoadingSpinner className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Entrar <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
        <p className="text-xs text-slate-400">
          Não tem uma conta?{' '}
          <Link href="/register" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
            Cadastre seu Tenant/Empresa
          </Link>
        </p>
      </div>
    </div>
  );
}
