'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, ShieldAlert, CheckCircle2, User, Key, Building } from 'lucide-react';
import Link from 'next/link';

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string>('');
  
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Validar Token
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setErrorMsg('Nenhum token de convite fornecido.');
        setValidating(false);
        return;
      }

      try {
        // Tentativa de ler a tabela invites sem autenticação.
        // A política RLS padrão de supabase precisa permitir SELECT sem auth para essa validação, ou precisamos tentar a sorte/usar RPC.
        // Como alternativa, podemos assumir que o token será validado no backend no signUp,
        // mas é bom dar feedback. Vamos usar uma RPC pública ou tentar o Select.
        // Se a RLS bloquear, não poderemos ver a empresa antes de logar.
        // Para resolver no frontend sem expor tabela, faremos o signUp diretamente e o trigger valida.
        // Mas se quisermos buscar o email, precisaremos tentar ler.
        
        // Vamos tentar ler
        const { data, error } = await supabase
          .from('invites')
          .select('email, role, company_id, used, expires_at, companies(name)')
          .eq('token', token)
          .single();

        if (error) {
          console.warn('Erro ao ler convite (pode ser RLS):', error.message);
          // O RLS atual (select_invites USING company_id = get_my_company_id) impede a leitura por anônimos!
          // Isso significa que não podemos mostrar a empresa antes de cadastrar sem criar uma RLS policy ou RPC pública.
          // Para esta Fase 1 (MVP rápido), vamos solicitar apenas Senha e Nome, e o e-mail o usuário digita.
          // Se o e-mail bater com o convite, ele entra.
          setValidating(false);
          return;
        }

        if (data) {
          if (data.used) throw new Error('Este convite já foi utilizado.');
          if (new Date(data.expires_at) < new Date()) throw new Error('Este convite está expirado.');
          
          setInviteData(data);
          if (data.companies && data.companies.name) {
            setCompanyName(data.companies.name);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Convite inválido.');
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const [email, setEmail] = useState(inviteData?.email || '');
  
  useEffect(() => {
    if (inviteData?.email) {
      setEmail(inviteData.email);
    }
  }, [inviteData]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Registrar o usuário e injetar o token
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            invite_token: token,
          },
        },
      });

      if (error) throw error;

      setSuccessMsg('Cadastro realizado com sucesso! Redirecionando...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao aceitar o convite.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-sm">Validando convite seguro...</p>
      </div>
    );
  }

  if (errorMsg && !inviteData && !email) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/30 p-8 flex flex-col items-center text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Convite Inválido</h1>
          <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
          <Link href="/login" className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-wider text-xs transition-colors border-b-2 border-slate-700">
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 bg-[url('/noise.png')] bg-repeat">
      <div className="max-w-md w-full animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900 border-2 border-slate-800 shadow-2xl shadow-black/50 p-8 rounded-none">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center rotate-3">
              <Building className="w-6 h-6 text-emerald-400 -rotate-3" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Aceitar Convite</h1>
            {companyName ? (
              <p className="text-sm text-slate-400 mt-2">Você foi convidado para ingressar na equipe da empresa <strong className="text-emerald-400">{companyName}</strong>.</p>
            ) : (
              <p className="text-sm text-slate-400 mt-2">Você recebeu um convite seguro. Complete seu cadastro para acessar o painel.</p>
            )}
          </div>

          <form onSubmit={handleAcceptInvite} className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border-l-4 border-rose-500 text-rose-400 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-400 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail do Convite</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!inviteData?.email}
                className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-none text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-none text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Criar Senha</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-none text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer rounded-none mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Conta e Acessar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
