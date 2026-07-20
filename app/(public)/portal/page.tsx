'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, FileText, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatDocument, validateDocument } from '@/lib/utils/documentValidation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function PortalLoginPage() {
  const router = useRouter();
  const [clientDocument, setClientDocument] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!clientDocument || !email) {
      setErrorMsg('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    if (!validateDocument(clientDocument)) {
      setErrorMsg('CPF ou CNPJ inválido. Por favor, verifique os dígitos.');
      setLoading(false);
      return;
    }

    try {
      // 1. Busca no banco de dados online
      const { data: client, error } = await supabase
        .from('clients')
        .select('id, name, company_id')
        .eq('document', clientDocument)
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        console.warn('Erro ao consultar Supabase, tentando local:', error.message);
      }

      let authenticatedClient = client;

      // 2. Fallback local / offline
      if (!authenticatedClient) {
        const localClientsStr = localStorage.getItem('mock-clients') || '[]';
        const localClients = JSON.parse(localClientsStr);
        const matchedLocal = localClients.find(
          (c: any) =>
            c.document === clientDocument &&
            c.email?.trim().toLowerCase() === email.trim().toLowerCase()
        );
        if (matchedLocal) {
          authenticatedClient = matchedLocal;
        }
      }

      if (!authenticatedClient) {
        throw new Error('Nenhum cliente encontrado com este documento e e-mail.');
      }

      // 3. Salva sessão do portal (Cookie + LocalStorage)
      window.document.cookie = `portal-session-mock=true; path=/; max-age=86400`;
      window.document.cookie = `portal-client-id=${authenticatedClient.id}; path=/; max-age=86400`;
      localStorage.setItem(
        'portal-client',
        JSON.stringify({
          id: authenticatedClient.id,
          name: authenticatedClient.name,
          companyId: authenticatedClient.company_id,
        })
      );

      router.push('/portal/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar no portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      {/* Container de visualização minimalista */}
      <div className="w-full max-w-md border border-slate-800 bg-[#070a13] p-8 relative overflow-hidden">
        {/* Glow de fundo sutil */}
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

        {/* Header da Marca */}
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <span className="text-sm font-bold text-slate-200 tracking-wider uppercase">Portal do Cliente</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-100 mb-2">Acompanhe suas ordens de serviço</h1>
          <p className="text-slate-400 text-sm">
            Acesse com seu documento cadastrado e e-mail para acompanhar o andamento ou aprovar orçamentos.
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
            <label htmlFor="document" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              CPF ou CNPJ *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
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
                className="w-full bg-[#030712] border border-slate-800 rounded-none py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              E-mail *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-[#030712] border border-slate-800 rounded-none py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-none flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                Acessar Portal <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
