'use client';
import { Mail, Lock, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
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
  const [keepConnected, setKeepConnected] = useState(true);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Erro ao autenticar com o Google.');
    } finally {
      setLoading(false);
    }
  };

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
          
          // Adiciona o cookie de sessão mock para que o middleware (proxy.ts) permita o acesso
          document.cookie = "os-session-mock=true; path=/; max-age=86400"; // expira em 24h
          
          router.push('/dashboard');
          return;
        }

        throw new Error(error.message);
      }

      if (data?.session) {
        // Limpa o cookie de mock caso utilize o login oficial do Supabase
        document.cookie = "os-session-mock=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
    <>
      {/* ── Painel Esquerdo: Identidade de Marca (Sempre Escuro) ── */}
      <div className="hidden md:flex md:w-5/12 bg-[#0a0d16] p-8 flex-col justify-between border-r border-slate-800/80 relative overflow-hidden">
        {/* Glow de fundo interno */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
        
        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <ShieldCheck className="w-5 h-5 text-emerald-450" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trust Care Platform</span>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="relative z-10 my-auto">
          <div className="mb-4">
            <Image
              src="/logo.png"
              alt="Trust Care Logo"
              width={100}
              height={100}
              className="object-contain filter brightness-110 drop-shadow-[0_0_12px_rgba(59,130,246,0.2)]"
              priority
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
            Bem-vindo à<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Trust Care
            </span>
          </h2>
          <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 my-4" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Preencha os campos e acesse a plataforma para gerenciar suas ordens de serviço, clientes e estoque.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[10px] text-slate-600">
            © {new Date().getFullYear()} Trust Care T.I.
          </p>
        </div>
      </div>

      {/* ── Painel Direito: Formulário de Autenticação (Fixo Claro) ── */}
      <div className="flex-1 bg-slate-50 p-8 flex flex-col justify-center transition-colors duration-200">
        <div className="w-full max-w-sm mx-auto space-y-6">
          
          {/* Header Mobile / Info */}
          <div className="md:hidden flex flex-col items-center text-center space-y-2 mb-2">
            <Image 
              src="/logo.png" 
              alt="Trust Care Logo" 
              width={80}
              height={80} 
              className="object-contain"
            />
            <h1 className="text-xl font-bold text-slate-900">Trust Care</h1>
            <p className="text-xs text-slate-500">Gerenciamento de Ordens de Serviço</p>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 hidden md:block">Acessar Plataforma</h2>
            <p className="text-xs text-slate-500">Entre com suas credenciais para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600">
                {errorMsg}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-650 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@empresa.com"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>
            </div>

            {/* Senha Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-650 uppercase tracking-wider">Senha</label>
                <a href="#" className="text-xs text-blue-600 hover:underline transition-all">Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  required
                />
              </div>
            </div>

            {/* Manter Conectado Checkbox */}
            <div className="flex items-center">
              <input
                id="keep-connected"
                type="checkbox"
                checked={keepConnected}
                onChange={(e) => setKeepConnected(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <label htmlFor="keep-connected" className="ml-2 text-xs text-slate-600 cursor-pointer select-none">
                Manter conectado
              </label>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2 transition-all duration-200 mt-2 disabled:opacity-55 cursor-pointer"
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

          {/* Divisor "ou" */}
          <div className="relative flex items-center justify-center my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative px-3 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase tracking-widest">ou</span>
          </div>

          {/* Botão Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-55"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com o Google
          </button>

          {/* Botão Auxiliar: Problema de Acesso */}
          <a
            href="mailto:suporte@trustcare.com.br?subject=Problema de Acesso - Trust Care"
            className="w-full border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold py-2.5 rounded-lg text-slate-600 hover:text-slate-900 text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Problema de acesso
          </a>

          {/* Cadastro Link */}
          <div className="text-center pt-2 border-t border-slate-200/80">
            <p className="text-xs text-slate-500">
              Não tem uma conta?{' '}
              <Link href="/register" className="text-blue-600 font-bold hover:underline transition-all">
                Cadastre seu Tenant/Empresa
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
