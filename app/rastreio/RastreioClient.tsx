'use client';

import {
  Wrench,
  Search,
  AlertCircle,
  ArrowLeft,
  Calendar,
  FileText,
  Lock,
  ChevronRight,
} from 'lucide-react';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { LoadingSpinner, StatusBadge } from '@/components/ui';
import { getSubdomain } from '@/lib/utils/subdomain';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { cn } from '@/lib/utils';

// Define public service order structure
interface PublicOrder {
  id: string;
  status: string;
  equipment_name?: string;
  equipment_brand?: string;
  equipment_model?: string;
  reported_problem: string;
  technical_report?: string;
  created_at: string;
  delivery_prediction?: string;
  codigo_os?: string;
}

// 5 marcos claros para o cliente final
const MILESTONES = [
  { id: 'recepcao', label: 'Entrada', statuses: ['Aguardando Equipamento'] },
  { id: 'diagnostico', label: 'Diagnóstico', statuses: ['Em Análise'] },
  { id: 'aprovacao', label: 'Aprovação', statuses: ['Aguardando Aprovação', 'Aprovado', 'Aguardando Peças'] },
  { id: 'reparo', label: 'Reparo & Testes', statuses: ['Em Execução', 'Em Testes'] },
  { id: 'conclusao', label: 'Pronto', statuses: ['Pronto para Retirada', 'Finalizado'] },
];

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get('id');

  // Page states
  const [searchId, setSearchId] = useState('');
  const [stage, setStage] = useState<'search' | 'otp' | 'result'>('search');
  const [tempTokenId, setTempTokenId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devToken, setDevToken] = useState('');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Request verification token
  const requestToken = async (rawId: string) => {
    const id = rawId.trim().replace(/^#/, '');

    if (!id || id.length < 8) {
      setErrorMsg('Por favor, informe um código de OS válido (mínimo de 8 caracteres).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOrder(null);
    setDevToken('');

    try {
      let activeSubdomain = null;
      if (typeof window !== 'undefined') {
        activeSubdomain = getSubdomain(window.location.hostname, new URLSearchParams(window.location.search));
      }

      const res = await fetch('/api/rastreio/request-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId: id, subdomain: activeSubdomain }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ordem de serviço não encontrada.');
      }

      setTempTokenId(data.tempTokenId);
      setMaskedEmail(data.maskedEmail);
      if (data.devToken) {
        setDevToken(data.devToken);
      }
      setStage('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Verify the 6-digit token and get OS details
  const verifyToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Por favor, insira o código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/rastreio/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempTokenId, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Código incorreto ou expirado.');
      }

      setOrder(data.order);
      setStage('result');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao verificar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryId) {
      setSearchId(queryId);
      requestToken(queryId);
    } else {
      const hash = window.location.hash;
      if (hash && hash.length >= 8) {
        const cleanHash = hash.replace(/^#/, '');
        setSearchId(cleanHash);
        requestToken(cleanHash);
      }
    }
  }, [queryId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      const cleanId = searchId.trim().replace(/^#/, '');
      router.push(`/rastreio?id=${cleanId}`);
    }
  };

  const getMilestoneIndex = (currentStatus: string) => {
    if (currentStatus === 'Cancelado') return -1;
    return MILESTONES.findIndex((m) => m.statuses.includes(currentStatus));
  };

  const currentMilestoneIndex = order ? getMilestoneIndex(order.status) : -1;

  const displayCode = order?.codigo_os
    ? (order.codigo_os.startsWith('#') ? order.codigo_os : `#${order.codigo_os}`)
    : (order ? `#${order.id.slice(0, 8).toUpperCase()}` : '');

  const whatsappMessage = order
    ? `Olá! Gostaria de falar sobre o andamento da OS ${displayCode} (${order.equipment_name || 'Equipamento'} ${order.equipment_brand || ''}).`
    : 'Olá! Gostaria de falar sobre minha ordem de serviço na TrustCare.';

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col justify-between font-sans selection:bg-brand selection:text-brand-contrast">
      
      {/* Navbar Limpa e Direta */}
      <header className="border-b border-border bg-surface-raised/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/rastreio" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center text-brand font-bold font-mono text-caption transition-colors group-hover:bg-brand/20">
              TC
            </div>
            <span className="font-bold text-small tracking-tight text-text">TrustCare</span>
          </Link>

          <Link
            href="/login"
            className="text-caption text-text-muted hover:text-text transition-colors font-mono"
          >
            Área do Técnico →
          </Link>
        </div>
      </header>

      {/* Conteúdo Central Focado (Impeccable Distill) */}
      <main className="flex-1 flex flex-col justify-center max-w-xl w-full mx-auto px-6 py-10 sm:py-14">

        {/* ========================================================= */}
        {/* ESTÁGIO 1: BUSCA DESTILADA (Zero Distração)               */}
        {/* ========================================================= */}
        {stage === 'search' && !loading && (
          <div className="space-y-6 text-center animate-fadeIn">
            
            <div className="space-y-2">
              <h1 className="text-h2 sm:text-h1 font-bold tracking-tight text-text">
                Rastrear Ordem de Serviço
              </h1>
              <p className="text-small text-text-muted max-w-sm mx-auto">
                Digite o código da sua OS para acompanhar o andamento do reparo em tempo real.
              </p>
            </div>

            {/* Campo de Busca Principal */}
            <form onSubmit={handleSearchSubmit} className="pt-2 space-y-3">
              <div className="relative flex items-center bg-surface-sunken border border-border focus-within:border-brand rounded-xl p-1.5 transition-all shadow-sm">
                <span className="pl-3.5 pr-2 text-text-subtle font-mono text-small select-none">
                  #
                </span>
                <input
                  type="text"
                  id="rastreio-search-id"
                  name="searchId"
                  required
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Ex: TC-2026-0001"
                  className="flex-1 bg-transparent border-0 text-body font-mono text-text placeholder:text-text-subtle focus:outline-none px-2 py-2.5"
                />
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover text-brand-contrast text-small font-bold font-mono px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                >
                  Buscar OS
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/25 text-danger text-small font-mono flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Atalho Factual */}
              <div className="flex items-center justify-between text-caption text-text-subtle px-1 font-mono">
                <span>O código está no seu comprovante de entrada.</span>
                <button
                  type="button"
                  onClick={() => setSearchId('TC-2026-0001')}
                  className="text-brand hover:underline cursor-pointer"
                >
                  Testar com #TC-2026-0001
                </button>
              </div>
            </form>

            {/* Suporte direto discreto */}
            <div className="pt-8 text-small text-text-muted">
              <span>Não encontrou o código da sua OS? </span>
              <a
                href="https://wa.me/5565999620703"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline font-semibold"
              >
                Fale com a recepção no WhatsApp
              </a>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* ESTÁGIO 2: VALIDAÇÃO OTP DESTILADA                        */}
        {/* ========================================================= */}
        {stage === 'otp' && !loading && (
          <div className="max-w-sm mx-auto w-full text-center space-y-6 animate-fadeIn my-4">
            
            <div className="space-y-1.5">
              <span className="text-caption font-mono text-brand font-bold uppercase tracking-wider">
                OS #{searchId.replace(/^#/, '')}
              </span>
              <h2 className="text-h2 font-bold text-text">
                Código de Segurança
              </h2>
              <p className="text-small text-text-muted">
                Informe o código de 6 dígitos enviado para:<br />
                <strong className="font-mono text-text text-small mt-1 block">{maskedEmail}</strong>
              </p>
            </div>

            <form onSubmit={verifyToken} className="space-y-4">
              <div>
                <input
                  type="text"
                  id="rastreio-otp-code"
                  name="otpCode"
                  aria-label="Código de verificação de 6 dígitos"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-surface-sunken border border-border focus:border-brand rounded-xl text-center text-2xl font-mono tracking-[0.35em] text-text py-3 focus:outline-none transition-colors"
                />
              </div>

              {process.env.NODE_ENV === 'development' && devToken && (
                <div className="p-2.5 rounded-lg bg-surface-sunken border border-border text-center">
                  <button
                    type="button"
                    onClick={() => setOtpCode(devToken)}
                    className="text-caption font-mono text-brand hover:underline cursor-pointer"
                  >
                    [Modo Testes] Auto-preencher: {devToken}
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/25 text-danger text-small font-mono flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-brand hover:bg-brand-hover text-brand-contrast font-bold text-small py-3 rounded-xl transition-all cursor-pointer font-mono active:scale-95 shadow-sm"
              >
                Confirmar e Visualizar OS
              </button>
            </form>

            <div className="flex items-center justify-between text-small text-text-muted pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setStage('search');
                  setErrorMsg('');
                  setOtpCode('');
                }}
                className="hover:text-text transition-colors cursor-pointer"
              >
                ← Trocar código de OS
              </button>
              <button
                type="button"
                onClick={() => requestToken(searchId)}
                className="text-brand hover:underline cursor-pointer"
              >
                Reenviar código
              </button>
            </div>

          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <LoadingSpinner className="w-8 h-8 text-brand animate-spin" />
            <p className="text-small font-mono text-text-muted">Consultando chamado técnico...</p>
          </div>
        )}

        {/* ========================================================= */}
        {/* ESTÁGIO 3: STATUS LIMPO E DIRETO                           */}
        {/* ========================================================= */}
        {stage === 'result' && order && !loading && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Topo com botão de voltar */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <button
                type="button"
                onClick={() => {
                  setOrder(null);
                  setSearchId('');
                  setStage('search');
                  setOtpCode('');
                  setTempTokenId('');
                  setDevToken('');
                  router.push('/rastreio');
                }}
                className="text-caption font-mono text-text-muted hover:text-text transition-colors cursor-pointer flex items-center gap-1.5"
              >
                ← Buscar outra OS
              </button>
              <span className="text-caption font-mono text-text-subtle">
                Entrada: {new Date(order.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {/* Cartão Principal: O que importa de relance */}
            <div className="p-6 rounded-[20px] bg-surface-raised border border-border space-y-6 shadow-sm">
              
              {/* Equipamento e Status */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-caption font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20">
                      {displayCode}
                    </span>
                    <StatusBadge status={order.status} dot />
                  </div>
                  <h2 className="text-h2 font-bold text-text tracking-tight">
                    {order.equipment_name || 'Equipamento'} {order.equipment_brand} {order.equipment_model}
                  </h2>
                </div>

                <div className="sm:text-right font-mono text-caption shrink-0">
                  <span className="text-text-subtle block">Previsão de Conclusão</span>
                  <span className="text-body font-bold text-text block mt-0.5">
                    {order.delivery_prediction
                      ? new Date(order.delivery_prediction).toLocaleDateString('pt-BR')
                      : 'A combinar com o técnico'}
                  </span>
                </div>
              </div>

              {/* Problema Reportado */}
              <div className="text-small space-y-1">
                <span className="font-semibold text-text-muted uppercase tracking-wider text-caption">
                  Defeito Informado:
                </span>
                <div
                  className="text-text-muted italic leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(order.reported_problem) }}
                />
              </div>

              {/* Alerta de OS Cancelada (se aplicável) */}
              {order.status === 'Cancelado' && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 text-danger font-mono text-small space-y-1">
                  <span className="font-bold block">● Atendimento Cancelado</span>
                  <p className="text-text-muted text-caption leading-relaxed">
                    Esta ordem de serviço foi classificada como cancelada. Para orientações sobre retirada física do equipamento ou peças, entre em contato direto pelo WhatsApp.
                  </p>
                </div>
              )}

              {/* Linha do Tempo Direta de 5 Passos (Sem poluição) */}
              {order.status !== 'Cancelado' && (
                <div className="space-y-3 pt-2">
                  <span className="font-mono text-caption font-bold text-text uppercase tracking-wider block">
                    Progresso do Atendimento
                  </span>

                  <div className="grid grid-cols-5 gap-2 text-center text-caption font-mono">
                    {MILESTONES.map((milestone, idx) => {
                      const isCompleted = idx < currentMilestoneIndex;
                      const isCurrent = idx === currentMilestoneIndex;
                      const isPending = idx > currentMilestoneIndex;

                      return (
                        <div
                          key={milestone.id}
                          className={cn('space-y-1.5 transition-opacity', isPending && 'opacity-40')}
                        >
                          <div
                            className={cn(
                              'h-1.5 rounded-full transition-all',
                              isCompleted && 'bg-brand',
                              isCurrent && 'bg-info',
                              isPending && 'bg-surface-sunken border border-border'
                            )}
                            style={isCurrent ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : undefined}
                          />
                          <span
                            className={cn(
                              'text-caption font-bold block',
                              isCurrent ? 'text-info' : isCompleted ? 'text-text' : 'text-text-muted'
                            )}
                          >
                            {milestone.label}
                          </span>
                          <span className="text-caption text-text-subtle block">
                            {isCurrent ? 'Fase atual' : isCompleted ? 'Concluído' : 'Pendente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parecer Técnico Conciso (se houver) */}
              {order.technical_report && (
                <div className="p-4 rounded-xl bg-surface-sunken border border-border text-small font-mono space-y-1">
                  <span className="font-bold text-text-muted uppercase tracking-wider text-caption">
                    Laudo Técnico de Bancada:
                  </span>
                  <div
                    className="text-text-muted leading-relaxed text-caption prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(order.technical_report) }}
                  />
                </div>
              )}

              {/* Ação Direta WhatsApp */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-small">
                <span className="text-text-muted text-center sm:text-left">
                  Deseja falar diretamente com o técnico responsável?
                </span>
                <a
                  href={`https://wa.me/5565999620703?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand hover:bg-brand-hover text-brand-contrast font-bold font-mono px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0 text-small"
                >
                  Falar no WhatsApp →
                </a>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Rodapé Mínimo */}
      <footer className="border-t border-border py-5 text-center text-caption font-mono text-text-subtle">
        <span>© {new Date().getFullYear()} TrustCare • Gestão de Assistência Técnica</span>
      </footer>

    </div>
  );
}

export default function PublicTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface text-text flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner className="w-8 h-8 text-brand animate-spin" />
          <p className="text-small font-mono text-text-muted">Carregando portal de rastreamento...</p>
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
