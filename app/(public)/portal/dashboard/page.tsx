'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  LogOut, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ArrowRight,
  ExternalLink,
  Laptop,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function PortalDashboard() {
  const router = useRouter();
  const [client, setClient] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // 1. Obtém dados do cliente autenticado
    const storedClient = localStorage.getItem('portal-client');
    if (!storedClient) {
      document.cookie = "portal-session-mock=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "portal-client-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push('/portal');
      return;
    }
    const parsedClient = JSON.parse(storedClient);
    setClient(parsedClient);

    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        // 2. Busca OSs e Equipamentos do cliente (Online)
        const { data: osData, error: osErr } = await supabase
          .from('service_orders')
          .select('*')
          .eq('client_id', parsedClient.id)
          .order('created_at', { ascending: false });

        const { data: eqData, error: eqErr } = await supabase
          .from('client_equipments')
          .select('*')
          .eq('client_id', parsedClient.id)
          .order('name');

        if (osErr || eqErr) {
          console.warn('Erro ao consultar Supabase, tentando local:', osErr?.message || eqErr?.message);
        }

        let finalOrders = osData || [];
        let finalEquipments = eqData || [];

        // 3. Fallback Local / Offline
        if (finalOrders.length === 0) {
          const localOrdersStr = localStorage.getItem('mock-orders') || '[]';
          const localOrders = JSON.parse(localOrdersStr);
          finalOrders = localOrders.filter((o: any) => o.client_id === parsedClient.id);
        }

        if (finalEquipments.length === 0) {
          const localEqsStr = localStorage.getItem('mock-equipments') || '[]';
          const localEqs = JSON.parse(localEqsStr);
          finalEquipments = localEqs.filter((e: any) => e.client_id === parsedClient.id);
        }

        setOrders(finalOrders);
        setEquipments(finalEquipments);
      } catch (err: any) {
        setErrorMsg('Erro ao carregar dados do portal.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    document.cookie = "portal-session-mock=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "portal-client-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem('portal-client');
    router.push('/portal');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-text font-sans">
      {/* Navbar Superior */}
      <header className="border-b border-border bg-[#070a13] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Portal do Cliente</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text font-medium">Olá, {client?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors border border-border hover:border-rose-950 py-1.5 px-3 rounded-xl cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Grid Principal */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo - Equipamentos */}
        <section className="lg:col-span-1 border border-border bg-[#070a13] p-5">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
            <Laptop className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Meus Equipamentos</h2>
          </div>

          {equipments.length === 0 ? (
            <p className="text-xs text-text-muted italic">Nenhum equipamento cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {equipments.map((eq) => (
                <div key={eq.id} className="p-3 border border-border bg-[#04060b]">
                  <p className="text-sm font-medium text-text">{eq.name}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {eq.brand} {eq.model}
                  </p>
                  {eq.serial_number && (
                    <p className="text-caption text-text-muted uppercase tracking-wider mt-1.5 font-mono">
                      S/N: {eq.serial_number}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Painel Central/Direito - Ordens de Serviço */}
        <section className="lg:col-span-2 border border-border bg-[#070a13] p-5">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
            <Wrench className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Minhas Ordens de Serviço</h2>
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-text-muted italic">Nenhuma ordem de serviço registrada.</p>
          ) : (
            <div className="space-y-5">
              {orders.map((os) => {
                const isWaitingApproval = os.status === 'Aguardando Aprovação';
                return (
                  <div 
                    key={os.id} 
                    className={`border p-4 transition-colors ${
                      isWaitingApproval 
                        ? 'border-amber-950 bg-amber-500/[0.02]' 
                        : 'border-border bg-[#04060b]'
                    }`}
                  >
                    {/* Header da OS */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <span className="text-xs font-semibold text-brand font-mono">
                          {os.codigo_os || `ID: ${os.id.slice(0, 8)}`}
                        </span>
                        <h3 className="text-sm font-semibold text-text mt-0.5">
                          {os.equipment_details || 'Equipamento'}
                        </h3>
                      </div>
                      
                      {/* Status Tag */}
                      <span className={`text-caption font-semibold uppercase tracking-widest px-2.5 py-1 ${
                        os.status === 'Finalizado' || os.status === 'Pronto para Retirada'
                          ? 'bg-brand/10 text-brand border border-brand/25'
                          : os.status === 'Aguardando Aprovação'
                          ? 'bg-warning/10 text-warning border border-warning/25'
                          : os.status === 'Cancelado'
                          ? 'bg-danger/10 text-danger border border-danger/25'
                          : 'bg-info/10 text-info border border-info/25'
                      }`}>
                        {os.status}
                      </span>
                    </div>

                    {/* Descrição do Problema */}
                    <div className="text-xs text-text-muted mb-4 border-l border-border pl-3 py-1">
                      <p className="font-semibold text-text-muted mb-1">Problema Reportado:</p>
                      <div dangerouslySetInnerHTML={{ __html: os.reported_problem }} />
                    </div>

                    {/* Rodapé da OS */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-3 text-xs">
                      <div className="flex gap-5 text-text-muted">
                        <div>
                          <span>Abertura: </span>
                          <span className="text-text">{new Date(os.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {os.delivery_prediction && (
                          <div>
                            <span>Previsão: </span>
                            <span className="text-text">{new Date(os.delivery_prediction).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                      </div>

                      {/* Ações baseadas no Status */}
                      {isWaitingApproval ? (
                        <a
                          href={`/orcamento/${os.id}`}
                          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium py-1.5 px-3 transition-colors cursor-pointer text-xs"
                        >
                          Aprovar Orçamento <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <a
                          href={`/rastreio?id=${os.id}`}
                          className="flex items-center gap-1.5 text-text-muted hover:text-text transition-colors cursor-pointer"
                        >
                          Ver Linha do Tempo <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
