'use client';
import { Building, User, Phone, Mail, Lock, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import Image from 'next/image';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userName,
            company_name: companyName,
            whatsapp: whatsapp,
            phone: whatsapp,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data?.user) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Painel Esquerdo: Identidade de Marca (Sempre Escuro) ── */}
      <div className="hidden md:flex md:w-5/12 bg-[#0a0d16] p-8 flex-col justify-between border-r border-slate-800/80 relative overflow-hidden">
        {/* Glow de fundo interno */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
        
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
              className="object-contain filter brightness-110 drop-shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              priority
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white leading-tight">
            Crie sua conta<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
              Corporativa
            </span>
          </h2>
          <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 my-4" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Cadastre sua empresa e equipe em poucos passos e comece a automatizar seus checklists e controle de faturamento hoje mesmo.
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[10px] text-slate-600">
            © {new Date().getFullYear()} Trust Care T.I.
          </p>
        </div>
      </div>

      {/* ── Painel Direito: Formulário de Cadastro (Fixo Claro) ── */}
      <div className="flex-1 bg-slate-50 p-8 flex flex-col justify-center transition-colors duration-200">
        <div className="w-full max-w-sm mx-auto space-y-5">

          {/* Header Mobile / Info */}
          <div className="md:hidden flex flex-col items-center text-center space-y-2 mb-2">
            <Image 
              src="/logo.png" 
              alt="Trust Care Logo" 
              width={50}
              height={50} 
              className="object-contain"
            />
            <h1 className="text-xl font-bold text-slate-900">Trust Care</h1>
            <p className="text-xs text-slate-500">Cadastre seu Tenant/Empresa</p>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 hidden md:block">Nova Conta</h2>
            <p className="text-xs text-slate-500">Preencha os dados abaixo para se cadastrar.</p>
          </div>

          {success ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-center text-emerald-600">
              <p className="font-semibold text-sm">Empresa cadastrada com sucesso!</p>
              <p className="text-xs text-slate-500 mt-1">Redirecionando para a tela de login...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600">
                  {errorMsg}
                </div>
              )}

              {/* Nome da Empresa */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Nome da Empresa (Tenant)</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Assistência Express"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Seu Nome */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Seu Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">WhatsApp da Empresa</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ex: (66) 99999-9999"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Email Corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@empresa.com"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Botão Cadastrar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2 transition-all duration-200 mt-2 disabled:opacity-55 cursor-pointer text-xs"
              >
                {loading ? (
                  <LoadingSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Cadastrar Empresa <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Login Link */}
          <div className="text-center pt-2 border-t border-slate-200/80">
            <p className="text-xs text-slate-500">
              Já possui cadastro?{' '}
              <Link href="/login" className="text-blue-600 font-bold hover:underline transition-all">
                Fazer Login
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
