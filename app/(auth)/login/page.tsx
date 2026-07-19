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
              width={64}
              height={64}
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
              width={60}
              height={60} 
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
