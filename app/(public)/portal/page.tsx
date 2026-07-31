'use client';

import React, { useState } from 'react';
import { Mail, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);

  const handlePortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Magic link: o Supabase Auth verifica a posse do e-mail e emite uma
      // sessão real. O vínculo com os registros de `clients` é resolvido no
      // banco pela RPC get_my_portal_data(), a partir do e-mail do JWT —
      // o browser nunca informa qual cliente ele é.
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/portal/dashboard`,
          data: { portal_client: true },
        },
      });

      if (error) throw error;

      setSent(true);
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Não foi possível enviar o link de acesso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md border border-slate-800 bg-[#070a13] p-8 relative overflow-hidden">
        {/* Glow de fundo sutil */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

        {/* Header da Marca */}
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <span className="text-sm font-bold text-slate-200 tracking-wider uppercase">Portal do Cliente</span>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Enviamos um link de acesso para <strong>{email}</strong>. Abra o e-mail neste
                dispositivo para entrar — o link vale por 1 hora.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-slate-100 mb-2">Acompanhe suas ordens de serviço</h1>
              <p className="text-slate-400 text-sm">
                Informe o e-mail cadastrado na assistência. Enviaremos um link seguro de acesso —
                sem senha para memorizar.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 mb-6 bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handlePortalLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
                >
                  E-mail cadastrado *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#030712] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                className="py-3 h-auto"
                loading={loading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Receber link de acesso
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
