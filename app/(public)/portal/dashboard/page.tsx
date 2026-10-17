'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  LogOut, 
  Wrench, 
  Laptop, 
  ExternalLink, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function PortalDashboard() {
  const router = useRouter();
  const [client, setClient] = useState<{ name: string; email: string } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const res = await fetch('/api/portal/data');

      if (res.status === 401) {
        router.push('/portal');
        return;
      }

      if (!res.ok) {
        throw new Error('Falha ao carregar registros do portal.');
      }

      const data = await res.json();
      setClient(data.client);
      setOrders(data.orders || []);
      setEquipments(data.equipments || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar dados do portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/logout', { method: 'POST' });
    } catch {
      // Falha silenciosa no logout
    }
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
          <span className="text-caption font-bold text-text-muted uppercase tracking-widest">Portal do Cliente</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text font-medium">Olá, {client?.name}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-caption text-text-muted hover:text-danger transition-colors border border-border hover:border-danger/30 py-1.5 px-3 rounded-xl cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Grid Principal */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo - Equipamentos */}
        <section className="lg:col-span-1 border border-border bg-[#070a13] p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
            <Laptop className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Meus Equipamentos</h2>
          </div>

          {equipments.length === 0 ? (
            <p className="text-caption text-text-muted italic">Nenhum equipamento cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {equipments.map((eq) => (
                <div key={eq.id} className="p-3 border border-border bg-[#04060b] rounded-lg">
                  <p className="text-sm font-medium text-text">{eq.name}</p>
                  <p className="text-caption text-text-muted mt-1">
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
        <section className="lg:col-span-2 border border-border bg-[#070a13] p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
            <Wrench className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Minhas Ordens de Serviço</h2>
          </div>

          {errorMsg && (
            <div className="p-3 mb-4 bg-danger/10 border border-danger/25 text-danger flex items-start gap-2.5 text-sm rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {orders.length === 0 ? (
            <p className="text-caption text-text-muted italic">Nenhuma ordem de serviço registrada.</p>
          ) : (
            <div className="space-y-5">
              {orders.map((os) => {
                const isWaitingApproval = os.status === 'Aguardando Aprovação';
                return (
                  <div 
                    key={os.id} 
                    className={`border p-4 rounded-xl transition-colors ${
                      isWaitingApproval 
                        ? 'border-amber-950/80 bg-amber-500/[0.03]' 
                        : 'border-border bg-[#04060b]'
                    }`}
                  >
                    {/* Header da OS */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <span className="text-caption font-semibold text-brand font-mono">
                          {os.codigo_os || `ID: ${os.id.slice(0, 8)}`}
                        </span>
                        <h3 className="text-sm font-semibold text-text mt-0.5">
                          {os.equipment_name || os.equipment_details || 'Equipamento'}
                        </h3>
                      </div>
                      
                      {/* Status Tag */}
                      <span className={`text-caption font-semibold uppercase tracking-widest px-2.5 py-1 rounded-md ${
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
                    <div className="text-caption text-text-muted mb-4 border-l-2 border-border pl-3 py-1">
                      <p className="font-semibold text-text-muted mb-1">Problema Reportado:</p>
                      <p className="text-text-muted whitespace-pre-line leading-relaxed">
                        {os.reported_problem?.replace(/<[^>]*>/g, '') || 'Não informado.'}
                      </p>
                    </div>

                    {/* Rodapé da OS */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-3 text-caption">
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
                        {os.company_name && (
                          <div>
                            <span>Assistência: </span>
                            <span className="text-text">{os.company_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Ações baseadas no Status */}
                      {isWaitingApproval ? (
                        <a
                          href={`/orcamento/${os.id}`}
                          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium py-1.5 px-3 rounded-lg transition-colors cursor-pointer text-caption"
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
