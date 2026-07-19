'use client';
import { Wrench, ShieldCheck, Search, AlertCircle, ArrowLeft, Clock, Calendar, CheckCircle2, FileText, ChevronRight, Lock } from 'lucide-react';


import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';
import { getSubdomain } from '@/lib/utils/subdomain';

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

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryId = searchParams.get('id');

  // Page states
  const [searchId, setSearchId] = useState('');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Timeline steps definition
  const steps = [
    { label: 'Aguardando Equipamento', status: 'Aguardando Equipamento', desc: 'Aparelho ainda não entregue na assistência.' },
    { label: 'Em Análise', status: 'Em Análise', desc: 'Aparelho recebido e aguardando diagnóstico.' },
    { label: 'Aguardando Aprovação', status: 'Aguardando Aprovação', desc: 'Orçamento gerado, aguardando aprovação do cliente.' },
    { label: 'Aprovado', status: 'Aprovado', desc: 'Orçamento aprovado pelo cliente, aguardando início do conserto.' },
    { label: 'Aguardando Peças', status: 'Aguardando Peças', desc: 'Conserto pausado aguardando chegada de peças.' },
    { label: 'Em Execução', status: 'Em Execução', desc: 'Técnico trabalhando no diagnóstico ou conserto.' },
    { label: 'Em Testes', status: 'Em Testes', desc: 'Aparelho montado passando por testes de estresse.' },
    { label: 'Pronto para Retirada', status: 'Pronto para Retirada', desc: 'Serviço concluído, pronto para retirada pelo cliente.' },
    { label: 'Finalizado', status: 'Finalizado', desc: 'Equipamento entregue e finalizado.' }
  ];

  // Load order data
  const loadOrder = async (rawId: string) => {
    // Strip leading hash character
    const id = rawId.trim().replace(/^#/, '');

    if (!id || id.length < 8) {
      setErrorMsg('Por favor, informe um código de OS válido (mínimo de 8 caracteres).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOrder(null);

    try {
      // Resolve active subdomain for filtering (allows local subdomain simulation via ?subdomain=)
      let activeSubdomain = null;
      if (typeof window !== 'undefined') {
        activeSubdomain = getSubdomain(window.location.hostname, new URLSearchParams(window.location.search));
      }

      // 1. Try to fetch from Supabase using public secure RPC (query handles prefix matching + subdomain validation)
      const { data, error } = await supabase.rpc('get_public_service_order', { 
        search_query: id,
        tenant_subdomain: activeSubdomain || undefined
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const orderData = data[0];
        setOrder({
          id: orderData.id,
          status: orderData.status,
          equipment_name: orderData.equipment_name,
          equipment_brand: orderData.equipment_brand,
          equipment_model: orderData.equipment_model,
          reported_problem: orderData.reported_problem,
          technical_report: orderData.technical_report,
          created_at: orderData.created_at,
          delivery_prediction: orderData.delivery_prediction,
          codigo_os: orderData.codigo_os
        });
      } else {
        // 2. Offline fallback (check localStorage for development/testing demo)
        const localOrders = localStorage.getItem('mock-orders');
        if (localOrders) {
          const parsedOrders = JSON.parse(localOrders);
          const cleanTarget = id.toLowerCase();
          const foundLocal = parsedOrders.find((o: any) => 
            o.id.toLowerCase().startsWith(cleanTarget)
          );

          if (foundLocal) {
            setOrder({
              id: foundLocal.id,
              status: foundLocal.status,
              equipment_name: foundLocal.equipment_details?.split(' ')[0] || 'Equipamento',
              equipment_brand: foundLocal.equipment_details?.split(' ')[1] || '',
              equipment_model: foundLocal.equipment_details?.split(' ').slice(2).join(' ') || '',
              reported_problem: foundLocal.reported_problem || 'Não informado',
              technical_report: foundLocal.technical_report,
              created_at: foundLocal.created_at,
              delivery_prediction: foundLocal.delivery_prediction,
              codigo_os: foundLocal.codigo_os
            });
          } else {
            setErrorMsg('Ordem de serviço não encontrada. Verifique o código e tente novamente.');
          }
        } else {
          setErrorMsg('Ordem de serviço não encontrada. Verifique o código e tente novamente.');
        }
      }
    } catch (err: any) {
      console.warn('Erro ao consultar banco online, tentando local:', err.message);
      // Local check on direct error
      const localOrders = localStorage.getItem('mock-orders');
      if (localOrders) {
        const parsedOrders = JSON.parse(localOrders);
        const cleanTarget = id.toLowerCase();
        const foundLocal = parsedOrders.find((o: any) => 
          o.id.toLowerCase().startsWith(cleanTarget)
        );
        if (foundLocal) {
          setOrder({
            id: foundLocal.id,
            status: foundLocal.status,
            equipment_name: foundLocal.equipment_details?.split(' ')[0] || 'Equipamento',
            equipment_brand: foundLocal.equipment_details?.split(' ')[1] || '',
            equipment_model: foundLocal.equipment_details?.split(' ').slice(2).join(' ') || '',
            reported_problem: foundLocal.reported_problem || 'Não informado',
            technical_report: foundLocal.technical_report,
            created_at: foundLocal.created_at,
            delivery_prediction: foundLocal.delivery_prediction,
            codigo_os: foundLocal.codigo_os
          });
          return;
        }
      }
      setErrorMsg('Falha ao buscar ordem de serviço no servidor. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryId) {
      setSearchId(queryId);
      loadOrder(queryId);
    } else {
      // Handle scenario where URL contains fragment instead of proper query parameter
      // e.g. /rastreio?id=#0e15ff9a -> window.location.hash gets "#0e15ff9a"
      const hash = window.location.hash;
      if (hash && hash.length >= 8) {
        const cleanHash = hash.replace(/^#/, '');
        setSearchId(cleanHash);
        loadOrder(cleanHash);
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

  // Helper to determine active steps
  const getStepIndex = (currentStatus: string) => {
    if (currentStatus === 'Cancelado') return -1;
    return steps.findIndex(s => s.status === currentStatus);
  };

  const currentStepIndex = order ? getStepIndex(order.status) : -1;

  // Helper to get status colors (No purple!)
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Aguardando Equipamento': return 'text-slate-400 border-slate-500/20 bg-slate-500/5';
      case 'Em Análise': return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
      case 'Aguardando Aprovação': return 'text-amber-450 border-amber-550/20 bg-amber-500/5';
      case 'Aprovado': return 'text-emerald-450 border-emerald-555/20 bg-emerald-500/5';
      case 'Aguardando Peças': return 'text-orange-450 border-orange-500/20 bg-orange-500/5';
      case 'Em Execução': return 'text-sky-400 border-sky-500/20 bg-sky-500/5';
      case 'Em Testes': return 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5';
      case 'Pronto para Retirada': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'Finalizado': return 'text-emerald-500 border-emerald-600/20 bg-emerald-600/5';
      case 'Cancelado': return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      default: return 'text-slate-400 border-slate-500/20 bg-slate-500/5';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(30,58,138,0.1),transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="h-20 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6 lg:px-16">
        <div className="flex items-center gap-2.5 font-bold text-lg text-white">
          <div className="p-1.5 bg-blue-600 rounded-none shadow-md shadow-blue-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">TrustCare Rastreamento</span>
        </div>

        <Link 
          href="/login" 
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 px-4 py-2 rounded-none"
        >
          Área do Técnico
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl w-full mx-auto z-5">
        
        {/* Search Panel if not loaded or when searching */}
        {!order && !loading && (
          <div className="w-full max-w-xl space-y-8 py-12">
            <div className="text-center space-y-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Portal Seguro LGPD
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                Acompanhe o status do seu conserto
              </h1>
              <p className="text-sm text-slate-450 max-w-md mx-auto">
                Consulte o andamento em tempo real do seu aparelho de forma rápida e segura.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-600 rounded-none blur opacity-25 group-focus-within:opacity-40 transition-opacity duration-300" />
                <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-none p-2.5">
                  <Search className="w-5 h-5 text-slate-500 ml-3" />
                  <input
                    type="text"
                    required
                    placeholder="Código da OS (Ex: 0e15ff9a)..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="flex-1 bg-transparent border-0 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-none text-xs transition-all shadow-lg shadow-blue-500/15 cursor-pointer shrink-0"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>

            <div className="pt-6 border-t border-slate-900 flex justify-center items-center gap-2 text-xs text-slate-500 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Nenhum dado pessoal ou financeiro é exposto publicamente</span>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <LoadingSpinner className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Buscando informações da ordem de serviço...</p>
          </div>
        )}

        {/* Displaying Order Details & Timeline */}
        {order && !loading && (
          <div className="w-full space-y-8 py-8 animate-fadeIn">
            {/* Navigation / Header details */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
              <button
                onClick={() => {
                  setOrder(null);
                  setSearchId('');
                  router.push('/rastreio');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors self-start"
              >
                <ArrowLeft className="w-4 h-4" /> Buscar outro equipamento
              </button>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900 px-3.5 py-2 rounded-none border border-slate-800 self-start">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Entrada em: {new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Quick overview widget */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-none p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="space-y-4 z-2">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    OS #{order.codigo_os || order.id.slice(0, 8)}
                  </span>
                </div>
                
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {order.equipment_name || 'Aparelho'} {order.equipment_brand} {order.equipment_model}
                </h2>
                
                <div className="text-xs text-slate-400 space-y-1 mt-2">
                  <span className="font-semibold text-slate-350">Defeito relatado:</span>
                  <div 
                    className="prose prose-invert max-w-none text-xs text-slate-400 italic font-medium break-words whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: order.reported_problem }}
                  />
                </div>
              </div>

              {/* Delivery Prediction Info */}
              <div className="p-4 bg-slate-950/80 rounded-none border border-slate-850 shrink-0 md:w-64 space-y-1.5 text-center md:text-left z-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" /> Previsão de Entrega
                </p>
                <p className="text-sm font-extrabold text-white">
                  {order.delivery_prediction 
                    ? new Date(order.delivery_prediction).toLocaleDateString('pt-BR') 
                    : 'A combinar'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {order.status === 'Pronto para Retirada' 
                    ? 'Seu aparelho já está pronto!' 
                    : 'Sujeito a alterações técnicas.'}
                </p>
              </div>
            </div>

            {/* Cancelled Alert Box */}
            {order.status === 'Cancelado' && (
              <div className="p-6 rounded-none bg-rose-500/5 border border-rose-500/10 text-rose-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>Serviço Cancelado</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-7">
                  Esta ordem de serviço foi classificada como cancelada. Para obter informações detalhadas sobre a recusa do orçamento, entrega de peças ou devolução do aparelho físico, por favor, entre em contato diretamente com o nosso suporte via WhatsApp.
                </p>
              </div>
            )}

            {/* Main Interactive Progress Stepper */}
            {order.status !== 'Cancelada' && (
              <div className="bg-slate-900/20 border border-slate-900 rounded-none p-6 sm:p-8 shadow-xl space-y-8">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Progresso do Reparo
                </h3>

                {/* Desktop Stepper */}
                <div className="hidden md:grid grid-cols-6 gap-2 relative">
                  {/* Connecting background bar */}
                  <div className="absolute top-5 left-[8%] right-[8%] h-0.5 bg-slate-800 z-1" />
                  {/* Active progress bar */}
                  {currentStepIndex > 0 && (
                    <div 
                      className="absolute top-5 left-[8%] h-0.5 bg-blue-600 z-2 transition-all duration-500" 
                      style={{ width: `${(currentStepIndex / (steps.length - 1)) * 84}%` }}
                    />
                  )}

                  {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const isPending = idx > currentStepIndex;

                    return (
                      <div key={idx} className="flex flex-col items-center text-center space-y-3 z-3">
                        {/* Step badge */}
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                            isCompleted 
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20' 
                              : isCurrent 
                              ? 'bg-slate-900 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10 ring-4 ring-blue-500/10 animate-pulse' 
                              : 'bg-slate-950 border-slate-850 text-slate-600'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : idx + 1}
                        </div>

                        {/* Step labels */}
                        <div className="space-y-1">
                          <p className={`text-xs font-extrabold tracking-tight ${isCurrent ? 'text-blue-400' : isPending ? 'text-slate-550' : 'text-slate-200'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-slate-500 leading-normal max-w-[120px] mx-auto">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Stepper (Vertical) */}
                <div className="md:hidden space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  
                  {/* Mobile Progress Bar Fill */}
                  {currentStepIndex > 0 && (
                    <div 
                      className="absolute left-2 top-2 w-0.5 bg-blue-600 transition-all duration-500" 
                      style={{ height: `${(currentStepIndex / (steps.length - 1)) * 96}%` }}
                    />
                  )}

                  {steps.map((step, idx) => {
                    const isCompleted = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const isPending = idx > currentStepIndex;

                    return (
                      <div key={idx} className="flex gap-4 items-start relative z-2">
                        {/* Circle bullet */}
                        <div 
                          className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 -ml-[23px] transition-all duration-300 ${
                            isCompleted 
                              ? 'bg-blue-600 border-blue-500 text-white' 
                              : isCurrent 
                              ? 'bg-slate-950 border-blue-500 ring-4 ring-blue-500/15 text-blue-400 animate-pulse' 
                              : 'bg-slate-950 border-slate-850 text-slate-700'
                          }`}
                        >
                          {isCompleted && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>

                        {/* Labels */}
                        <div className="space-y-0.5">
                          <p className={`text-xs font-extrabold tracking-tight flex items-center gap-1.5 ${isCurrent ? 'text-blue-400' : isPending ? 'text-slate-550' : 'text-slate-200'}`}>
                            {step.label}
                            {isCurrent && <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Technical Report / Laudo Técnico (If present) */}
            {order.technical_report && (
              <div className="bg-slate-900/20 border border-slate-900 rounded-none p-6 sm:p-8 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Laudo Técnico / Diagnóstico do Serviço / Serviço Realizado
                </h3>
                <div 
                  className="text-xs text-slate-300 prose prose-invert max-w-none leading-relaxed bg-slate-950/40 p-4 rounded-none border border-slate-850 font-medium"
                  dangerouslySetInnerHTML={{ __html: order.technical_report }}
                />
              </div>
            )}

            {/* Footer help notice */}
            <div className="p-6 bg-slate-900/10 border border-slate-900 rounded-none flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-bold text-slate-250">Dúvidas sobre o conserto?</p>
                <p className="text-[10px] text-slate-500">Estamos à disposição no canal de atendimento direto.</p>
              </div>

              <a 
                href="https://wa.me/5565999620703" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-none text-xs transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1.5"
              >
                Falar com Suporte no WhatsApp <ChevronRight className="w-4 h-4" />
              </a>
            </div>

          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="h-16 border-t border-slate-900 flex items-center justify-center text-[10px] text-slate-650 font-semibold tracking-wide uppercase px-6">
        <span>© {new Date().getFullYear()} Trust Care - Consultoria em T.I • Todos os direitos reservados.</span>
      </footer>
    </div>
  );
}

export default function PublicTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <LoadingSpinner className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium mt-4">Carregando portal...</p>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  );
}
