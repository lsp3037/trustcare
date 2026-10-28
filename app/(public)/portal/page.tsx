'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, FileText, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { formatDocument, validateDocument } from '@/lib/utils/documentValidation';
import { Button } from '@/components/ui';

export default function PortalLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [clientDocument, setClientDocument] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [tempTokenId, setTempTokenId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!email) {
      setErrorMsg('Por favor, informe seu endereço de e-mail.');
      setLoading(false);
      return;
    }

    if (clientDocument && !validateDocument(clientDocument)) {
      setErrorMsg('CPF ou CNPJ inválido. Por favor, verifique os dígitos digitados.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/portal/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          document: clientDocument ? clientDocument : undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Não foi possível enviar o código. Verifique os dados informados.');
      }

      setTempTokenId(data.tempTokenId);
      setMaskedEmail(data.maskedEmail);
      if (data.devToken) {
        setDevToken(data.devToken);
      }
      setStep('verify');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao solicitar código de acesso.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Por favor, informe o código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/portal/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempTokenId,
          code: otpCode.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Código incorreto ou expirado.');
      }

      // Redireciona para o dashboard com cookie httpOnly assinado pelo servidor
      router.push('/portal/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao validar o código de acesso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      {/* Container de visualização minimalista */}
      <div className="w-full max-w-md border border-border bg-[#070a13] p-8 relative overflow-hidden rounded-2xl shadow-2xl">
        {/* Glow de fundo sutil */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand/5 blur-[100px] pointer-events-none" />

        {/* Header da Marca */}
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="w-6 h-6 text-brand" />
          <span className="text-sm font-bold text-text tracking-wider uppercase">Portal do Cliente</span>
        </div>

        {step === 'request' ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-text mb-2">Acompanhe suas ordens de serviço</h1>
              <p className="text-text-muted text-sm">
                Informe seu e-mail cadastrado para receber um código de acesso seguro e visualizar todos os seus aparelhos.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 mb-6 bg-danger/10 border border-danger/25 text-danger flex items-start gap-2.5 text-sm rounded-xl">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-caption font-semibold uppercase tracking-wider text-text-muted mb-2">
                  E-mail cadastrado *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#030712] border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="document" className="block text-caption font-semibold uppercase tracking-wider text-text-muted mb-2">
                  CPF ou CNPJ (opcional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                    <FileText className="w-4 h-4" />
                  </span>
                  <input
                    id="document"
                    type="text"
                    maxLength={18}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    value={clientDocument}
                    onChange={(e) => setClientDocument(formatDocument(e.target.value))}
                    disabled={loading}
                    className="w-full bg-[#030712] border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <Button type="submit" fullWidth className="py-3 h-auto" loading={loading} icon={<ArrowRight className="w-4 h-4" />}>
                Receber Código de Acesso
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-text mb-2">Verifique seu e-mail</h1>
              <p className="text-text-muted text-sm leading-relaxed">
                Se o e-mail <strong className="text-text font-mono">{maskedEmail}</strong> estiver cadastrado, você receberá um código de 6 dígitos em instantes. Confira também a caixa de spam.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 mb-6 bg-danger/10 border border-danger/25 text-danger flex items-start gap-2.5 text-sm rounded-xl">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label htmlFor="otpCode" className="block text-caption font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Código de 6 dígitos
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    className="w-full bg-[#030712] border border-border rounded-xl py-2.5 pl-10 pr-4 text-center font-mono text-lg tracking-widest text-text placeholder:text-text-subtle focus:outline-none focus:border-brand transition-colors disabled:opacity-50"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {devToken && (
                <div className="p-2.5 rounded-lg bg-info/10 border border-info/20 text-center">
                  <button
                    type="button"
                    onClick={() => setOtpCode(devToken)}
                    className="text-caption text-info hover:underline font-mono"
                  >
                    [Modo de Testes] Auto-preencher código: {devToken}
                  </button>
                </div>
              )}

              <Button type="submit" fullWidth className="py-3 h-auto" loading={loading} icon={<ArrowRight className="w-4 h-4" />}>
                Confirmar e Acessar
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setErrorMsg('');
                    setOtpCode('');
                  }}
                  className="text-caption font-semibold text-text-muted hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar / Informar outro e-mail
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
