'use client';
import { Building, User, Phone, Mail, Lock, ArrowRight } from 'lucide-react';
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
      // 1. Tenta cadastrar o usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userName,
            company_name: companyName, // Guardamos nos metadados para triggers ou criação posterior
            whatsapp: whatsapp,
            phone: whatsapp, // Telefone = Whatsapp
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
        <p className="text-sm text-slate-400 mt-1">Cadastre sua empresa no sistema</p>
      </div>

      {success ? (
        <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/25 text-center text-emerald-400">
          <p className="font-semibold text-sm">Empresa cadastrada com sucesso!</p>
          <p className="text-xs text-slate-400 mt-1">Redirecionando...</p>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Nome da Empresa (Tenant)</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Assistência Técnica Express"
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Seu Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">WhatsApp da Empresa</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: (66) 99999-9999"
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@empresa.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-none shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all duration-200 mt-2 disabled:opacity-55"
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

      <div className="mt-6 text-center border-t border-slate-800/60 pt-6">
        <p className="text-xs text-slate-400">
          Já possui cadastro?{' '}
          <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
            Fazer Login
          </Link>
        </p>
      </div>
    </div>
  );
}
