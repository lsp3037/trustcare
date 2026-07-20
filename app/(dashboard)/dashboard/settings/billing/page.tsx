'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/lib/context/CompanyContext';
import { useUser } from '@/lib/context/UserContext';
import { supabase } from '@/lib/supabase/client';
import { CreditCard, AlertCircle, CheckCircle2, ShieldCheck, Users, HardDrive, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function BillingSettingsPage() {
  const router = useRouter();
  const { role, loading: userLoading } = useUser();
  const { company, loading: contextLoading, maxTechnicians, maxStorageBytes } = useCompany();

  // Usage states
  const [techCount, setTechCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState<bigint>(BigInt(0));
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!userLoading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  useEffect(() => {
    async function loadStats() {
      if (!company?.id) return;
      try {
        // 1. Get technician count
        const { count, error: countErr } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (!countErr && count !== null) {
          setTechCount(count);
        }

        // 2. Get storage usage
        const { data: storageData, error: storageErr } = await supabase
          .rpc('get_company_storage_bytes', { comp_id: company.id });
        
        if (!storageErr && storageData !== null) {
          setStorageUsed(BigInt(storageData));
        }
      } catch (err) {
        console.warn('Erro ao carregar estatísticas de uso:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    if (company?.id) {
      loadStats();
    }
  }, [company]);

  if (userLoading || contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Format bytes helper
  const formatBytes = (bytes: bigint) => {
    const kb = Number(bytes) / 1024;
    const mb = kb / 1024;
    const gb = mb / 1024;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${kb.toFixed(0)} KB`;
  };

  const planNames: Record<string, string> = {
    basico: 'Básico',
    profissional: 'Profissional',
    premium: 'Premium'
  };

  const planPrices: Record<string, string> = {
    basico: 'R$ 99/mês',
    profissional: 'R$ 199/mês',
    premium: 'R$ 399/mês'
  };

  const statusColors: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    trialing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    past_due: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    canceled: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  const statusLabels: Record<string, string> = {
    active: 'Assinatura Ativa',
    trialing: 'Período de Testes',
    past_due: 'Pagamento Pendente',
    canceled: 'Cancelado / Suspenso'
  };

  const currentPlan = company.subscription_plan || 'basico';
  const currentStatus = company.subscription_status || 'trialing';

  // Calculate percentage of usage
  const techPercent = Math.min(100, (techCount / maxTechnicians) * 100);
  const storagePercent = maxStorageBytes > BigInt(0) 
    ? Number((storageUsed * BigInt(100)) / maxStorageBytes) 
    : 0;

  // Pre-filled WhatsApp link for manual checkout or upgrade
  const getWhatsAppLink = (intent: string) => {
    const text = encodeURIComponent(
      `Olá! Sou o administrador da empresa "${company.name}" (ID: ${company.id}) no Trust Care. Gostaria de solicitar suporte comercial referente a: ${intent}.`
    );
    return `https://wa.me/5565999620703?text=${text}`;
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <CreditCard className="w-6 h-6 text-blue-500" />
          Assinatura e Faturamento
        </h1>
        <p className="text-xs text-slate-450 mt-1">
          Gerencie o plano da sua empresa, consulte faturas e verifique limites de uso dos recursos.
        </p>
      </div>

      {/* Main Billing Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-none relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                PLANO ATUAL
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[currentStatus] || 'text-slate-400 bg-slate-900'}`}>
                {statusLabels[currentStatus] || currentStatus}
              </span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Trust Care {planNames[currentPlan]} <span className="text-lg font-medium text-slate-500">({planPrices[currentPlan]})</span>
            </h2>
            {company.subscription_expires_at && (
              <p className="text-xs text-slate-400">
                {currentStatus === 'trialing' ? 'O período de testes expira em: ' : 'Próxima renovação em: '}
                <strong className="text-slate-200">
                  {new Date(company.subscription_expires_at).toLocaleDateString('pt-BR')}
                </strong>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            {currentStatus === 'trialing' || currentStatus === 'past_due' ? (
              <a
                href={getWhatsAppLink('Ativação de Assinatura')}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-none text-xs transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                Ativar Assinatura <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <a
                href={getWhatsAppLink('Alteração de Plano')}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 font-bold py-2.5 px-6 rounded-none text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Alterar Plano <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Warning Banner if past_due */}
        {currentStatus === 'past_due' && (
          <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-none text-xs text-rose-400 flex items-start gap-2.5">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Aviso de Pendência Financeira</p>
              <p className="text-slate-400 leading-relaxed">
                Identificamos um atraso no pagamento da sua assinatura. Seu acesso entrará em modo apenas-leitura caso a pendência não seja regularizada. Evite a interrupção dos seus serviços.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Usage Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technicians Usage */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-none space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-blue-500" />
              Técnicos Ativos
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              {loadingStats ? '...' : `${techCount} / ${maxTechnicians}`}
            </span>
          </div>

          <div className="w-full bg-slate-950 h-2 rounded-none overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500" 
              style={{ width: `${loadingStats ? 0 : techPercent}%` }} 
            />
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Seu plano permite até {maxTechnicians} contas de técnicos ativos simultaneamente no painel.
          </p>
        </div>

        {/* Storage Usage */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-none space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4.5 h-4.5 text-blue-500" />
              Armazenamento de Mídias
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              {loadingStats ? '...' : `${formatBytes(storageUsed)} / ${formatBytes(maxStorageBytes)}`}
            </span>
          </div>

          <div className="w-full bg-slate-950 h-2 rounded-none overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500" 
              style={{ width: `${loadingStats ? 0 : storagePercent}%` }} 
            />
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Mídias anexadas às ordens de serviço (fotos, vídeos, arquivos de diagnóstico).
          </p>
        </div>
      </div>

      {/* Compare Plans Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-blue-500" />
            Tabela Comparativa de Planos
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Escolha o plano ideal conforme o crescimento da sua assistência técnica de TI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-800 bg-slate-950 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Plan Básico */}
          <div className={`p-6 space-y-4 transition-all duration-300 ${currentPlan === 'basico' ? 'bg-slate-900/40' : ''}`}>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white">Plano Básico</h4>
              <p className="text-2xl font-black text-white">R$ 99<span className="text-xs font-normal text-slate-500"> /mês</span></p>
            </div>
            <ul className="text-xs text-slate-400 space-y-2.5">
              <li className="flex items-center gap-2">✓ Até 2 técnicos ativos</li>
              <li className="flex items-center gap-2">✓ 1 GB de armazenamento</li>
              <li className="flex items-center gap-2">✓ Rastreamento de OS</li>
              <li className="flex items-center gap-2">✓ Suporte via Email</li>
            </ul>
          </div>

          {/* Plan Profissional */}
          <div className={`p-6 space-y-4 transition-all duration-300 ${currentPlan === 'profissional' ? 'bg-slate-900/40' : ''}`}>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                Plano Profissional
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Recomendado</span>
              </h4>
              <p className="text-2xl font-black text-white">R$ 199<span className="text-xs font-normal text-slate-500"> /mês</span></p>
            </div>
            <ul className="text-xs text-slate-400 space-y-2.5">
              <li className="flex items-center gap-2 text-slate-200">✓ Até 6 técnicos ativos</li>
              <li className="flex items-center gap-2 text-slate-200">✓ 5 GB de armazenamento</li>
              <li className="flex items-center gap-2 text-slate-200">✓ Rastreamento de OS</li>
              <li className="flex items-center gap-2 text-slate-200">✓ Suporte via WhatsApp</li>
            </ul>
          </div>

          {/* Plan Premium */}
          <div className={`p-6 space-y-4 transition-all duration-300 ${currentPlan === 'premium' ? 'bg-slate-900/40' : ''}`}>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white">Plano Premium</h4>
              <p className="text-2xl font-black text-white">R$ 399<span className="text-xs font-normal text-slate-500"> /mês</span></p>
            </div>
            <ul className="text-xs text-slate-400 space-y-2.5">
              <li className="flex items-center gap-2">✓ Até 20 técnicos ativos</li>
              <li className="flex items-center gap-2">✓ 20 GB de armazenamento</li>
              <li className="flex items-center gap-2">✓ API pública integrada</li>
              <li className="flex items-center gap-2">✓ Suporte priorizado 24/7</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
