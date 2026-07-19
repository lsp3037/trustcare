'use client';
import { SlaTracker } from '@/components/ui/SlaTracker';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Plus, 
  Loader2, 
  Wrench, 
  AlertCircle,
  Eye,
  Calendar,
  DollarSign,
  Trash2,
  LayoutGrid,
  List
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import NewOrderForm from '@/components/NewOrderForm';
import { useCompany } from '@/lib/context/CompanyContext';

const stripHtml = (html: string) => {
  if (!html) return '';
  const clean = html.replace(/<[^>]*>/g, '');
  return clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
};

interface ServiceOrder {
  id: string;
  codigo_os: string;
  status: string;
  total_value: number;
  created_at: string;
  reported_problem?: string;
  technical_report?: string;
  clients: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

// Componente Wrapper para lidar com a busca de query params com Suspense no Next.js
function OrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isReadOnly } = useCompany();
  const isCreating = searchParams.get('new') === 'true';

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'Todos');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('orders-view-mode') as 'grid' | 'table';
    if (saved === 'grid' || saved === 'table') {
      setViewMode(saved);
    }
  }, []);

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('orders-view-mode', mode);
  };

  const fetchOrdersAndClients = async () => {
    try {
      setLoading(true);
      
      // Busca clientes para o formulário
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (clientsData && clientsData.length > 0) {
        setClients(clientsData);
      } else {
        // Fallback local para lista de clientes no formulário
        const localClients = localStorage.getItem('mock-clients');
        if (localClients) {
          setClients(JSON.parse(localClients));
        }
      }

      // Busca ordens de serviço
      const { data: ordersData, error } = await supabase
        .from('service_orders')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setOrders(ordersData || []);
    } catch (err) {
      console.warn('Erro ao carregar Ordens de Serviço do Supabase, usando fallback local:', err);
      
      // Fallback local de clientes no formulário em caso de falha de conexão
      const localClients = localStorage.getItem('mock-clients');
      if (localClients) {
        setClients(JSON.parse(localClients));
      }

      loadLocalOrders();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalOrders = () => {
    const localOrders = localStorage.getItem('mock-orders');
    if (localOrders) {
      setOrders(JSON.parse(localOrders));
    } else {
      const initialMock = [
        { id: '1', client_id: 'c1', clients: { name: 'Tech Solutions Ltda' }, equipment_details: 'Notebook Dell Latitude 3420', reported_problem: 'Tela azul intermitente e desligamento automático', technical_report: 'Realizado limpeza interna e troca de pasta térmica. Testado sistema por 12 horas.', status: 'Em Análise', total_value: 450.00, created_at: new Date(Date.now() - 3600000 * 2).toISOString(), codigo_os: 'TC-2026-0001', pago: false },
        { id: '2', client_id: 'c2', clients: { name: 'Carlos Henrique Souza' }, equipment_details: 'Desktop Gamer Custom', reported_problem: 'Placa de vídeo liga mas não dá vídeo', technical_report: null, status: 'Aguardando Peças', total_value: 1250.00, created_at: new Date(Date.now() - 3600000 * 8).toISOString(), codigo_os: 'TC-2026-0002', pago: false },
        { id: '3', client_id: 'c3', clients: { name: 'Clínica Sorriso Perfeito' }, equipment_details: 'Servidor de Arquivos HP ProLiant', reported_problem: 'Backup automático falhando e HD 3 piscando vermelho', technical_report: 'Substituição de HD em RAID por sobressalente. Reconfiguração do script bash de backup.', status: 'Pronto para Retirada', total_value: 2800.00, created_at: new Date(Date.now() - 3600000 * 24).toISOString(), codigo_os: 'TC-2026-0003', pago: false },
        { id: '4', client_id: 'c4', clients: { name: 'Juliana Mendes' }, equipment_details: 'MacBook Air M1', reported_problem: 'Teclado com teclas travadas (A, S, D)', technical_report: null, status: 'Em Análise', total_value: 350.00, created_at: new Date(Date.now() - 3600000 * 28).toISOString(), codigo_os: 'TC-2026-0004', pago: false },
      ];
      localStorage.setItem('mock-orders', JSON.stringify(initialMock));
      setOrders(initialMock);
    }
  };

  useEffect(() => {
    fetchOrdersAndClients();
  }, []);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [updatingBulk, setUpdatingBulk] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Equipamento': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Em Análise': return 'bg-blue-500/10 text-blue-450 border-blue-500/20';
      case 'Aguardando Aprovação': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Aprovado': return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      case 'Aguardando Peças': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Em Execução': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Em Testes': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Pronto para Retirada': return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
      case 'Finalizado': return 'bg-emerald-600/10 text-emerald-500 border-emerald-600/20';
      case 'Cancelado': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      setUpdatingBulk(true);
      
      const { error } = await supabase
        .from('service_orders')
        .update({ status: newStatus })
        .in('id', selectedOrderIds);

      if (error) throw error;

      setOrders(prev => prev.map(o => selectedOrderIds.includes(o.id) ? { ...o, status: newStatus } : o));
      alert(`Status das ordens selecionadas atualizado para "${newStatus}"!`);
    } catch (err) {
      console.warn('Erro ao atualizar online, aplicando localmente:', err);
      const localOrders = localStorage.getItem('mock-orders');
      if (localOrders) {
        const parsed = JSON.parse(localOrders);
        const updated = parsed.map((o: any) => {
          if (selectedOrderIds.includes(o.id)) {
            return { ...o, status: newStatus };
          }
          return o;
        });
        localStorage.setItem('mock-orders', JSON.stringify(updated));
        setOrders(updated);
        alert(`[Offline] Status das ordens selecionadas atualizado para "${newStatus}"!`);
      }
    } finally {
      setSelectedOrderIds([]);
      setUpdatingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    const confirmDelete = window.confirm(`Deseja realmente excluir as ${selectedOrderIds.length} ordens de serviço selecionadas? As peças alocadas retornarão ao estoque e esta ação não poderá ser desfeita.`);
    if (!confirmDelete) return;

    try {
      setUpdatingBulk(true);
      
      // 1. Busca peças anteriores para restaurar estoque online
      const { data: oldItems } = await supabase
        .from('service_order_items')
        .select('*')
        .in('service_order_id', selectedOrderIds);

      if (oldItems && oldItems.length > 0) {
        for (const oldItem of oldItems) {
          const { data: prod } = await supabase
            .from('products_inventory')
            .select('quantity')
            .eq('id', oldItem.product_id)
            .single();

          if (prod) {
            await supabase
              .from('products_inventory')
              .update({ quantity: prod.quantity + oldItem.quantity })
              .eq('id', oldItem.product_id);
          }
        }
      }

      // 2. Deleta os itens das ordens de serviço
      await supabase
        .from('service_order_items')
        .delete()
        .in('service_order_id', selectedOrderIds);

      // 3. Deleta as ordens de serviço
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .in('id', selectedOrderIds);

      if (error) throw error;

      setOrders(prev => prev.filter(o => !selectedOrderIds.includes(o.id)));
      alert('Ordens de Serviço excluídas com sucesso!');
    } catch (err) {
      console.warn('Erro ao excluir online, aplicando localmente:', err);
      
      // Fallback local
      const localOrders = localStorage.getItem('mock-orders');
      if (localOrders) {
        const parsedOrders = JSON.parse(localOrders);

        // A. Carrega itens e estoque locais atuais
        const localItems = localStorage.getItem('mock-order-items') || '[]';
        const localInv = localStorage.getItem('mock-inventory') || '[]';
        
        let parsedItems = JSON.parse(localItems);
        let parsedInv = JSON.parse(localInv);

        // B. Filtra itens pertencentes às OSs sendo excluídas para restaurar estoque
        const itemsToRestore = parsedItems.filter((item: any) => selectedOrderIds.includes(item.service_order_id));
        itemsToRestore.forEach((oldItem: any) => {
          parsedInv = parsedInv.map((p: any) => {
            if (p.id === oldItem.product_id) {
              return { ...p, quantity: p.quantity + oldItem.quantity };
            }
            return p;
          });
        });

        // C. Limpa itens e OSs
        parsedItems = parsedItems.filter((item: any) => !selectedOrderIds.includes(item.service_order_id));
        const updatedOrders = parsedOrders.filter((o: any) => !selectedOrderIds.includes(o.id));

        localStorage.setItem('mock-orders', JSON.stringify(updatedOrders));
        localStorage.setItem('mock-order-items', JSON.stringify(parsedItems));
        localStorage.setItem('mock-inventory', JSON.stringify(parsedInv));

        setOrders(updatedOrders);
        alert('[Offline] Ordens de Serviço excluídas localmente com sucesso!');
      }
    } finally {
      setSelectedOrderIds([]);
      setUpdatingBulk(false);
    }
  };

  // Filtragem de dados
  const filteredOrders = orders.filter((order) => {
    const clientName = order.clients?.name || '';
    const equipment = order.equipment_details || '';
    const problem = order.reported_problem || '';
    const osCode = order.codigo_os || '';
    
    const matchesSearch = 
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      osCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'Todos' || 
      (statusFilter === 'Ativas' && !['Finalizado', 'Cancelado'].includes(order.status)) ||
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-8 h-8 text-blue-500" /> Ordens de Serviço
          </h1>
          <p className="text-slate-400 mt-1">Acompanhe e gerencie as Ordens de Serviço (OS).</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => {
              if (isReadOnly) {
                alert('A conta está em modo apenas-leitura devido a atraso no pagamento. Não é possível criar novas OS.');
                return;
              }
              router.push('/dashboard/orders?new=true');
            }}
            disabled={isReadOnly}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Nova Ordem de Serviço
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">Nova Ordem de Serviço</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cadastre um novo chamado técnico no sistema.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/orders')}
              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors"
            >
              Cancelar
            </button>
          </div>
          
          {isReadOnly ? (
            <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center text-sm font-semibold">
              A criação de Ordens de Serviço está desabilitada temporariamente. A conta do tenant está em modo de apenas-leitura por faturamento pendente no Asaas.
            </div>
          ) : (
            <NewOrderForm 
              clients={clients} 
              onSuccess={() => {
                fetchOrdersAndClients();
                router.push('/dashboard/orders');
              }} 
            />
          )}
        </div>
      ) : (
        <>
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 border border-slate-900 rounded-xl">
            {/* Campo de Busca */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por cliente, equipamento, problema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Filtro de Status e Controle de Visualização */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-sm text-slate-350 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Ativas">OS Abertas / Em Análise</option>
                <option value="Aguardando Equipamento">Aguardando Equipamento</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                <option value="Aguardando Peças">Aguardando Peças</option>
                <option value="Em Execução">Em Execução</option>
                <option value="Em Testes">Em Testes</option>
                <option value="Pronto para Retirada">Pronto para Retirada</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>

              <div className="h-8 w-px bg-slate-800 hidden sm:block mx-1" />

              <div className="flex items-center bg-slate-950 border border-slate-850 p-1 rounded-lg shrink-0 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleSetViewMode('grid')}
                  className={`p-1.5 rounded transition-all duration-200 ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Visualização em Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode('table')}
                  className={`p-1.5 rounded transition-all duration-200 ${viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Visualização em Tabela"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Listagem de OS */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-sm text-slate-400">Carregando ordens de serviço...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6 gap-4">
              <div className="p-4 bg-slate-800/50 border border-slate-800 text-slate-600">
                <ClipboardList className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-400">
                  {searchTerm || statusFilter !== 'Todos' ? 'Nenhuma OS encontrada com esses filtros' : 'Nenhuma Ordem de Serviço criada ainda'}
                </h3>
                <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== 'Todos'
                    ? 'Tente limpar os filtros de busca ou status para ver todas as OS.'
                    : 'Crie sua primeira Ordem de Serviço para começar a gerenciar os atendimentos da sua assistência.'
                  }
                </p>
              </div>
              {(!searchTerm && statusFilter === 'Todos') && (
                <button
                  onClick={() => router.push('/dashboard/orders?new=true')}
                  className="mt-1 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-5 py-2 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/15"
                >
                  <Plus className="w-4 h-4" /> Criar Primeira OS
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id} 
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                  className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-200 group cursor-pointer hover:scale-[1.01]"
                >
                  <div className="space-y-4">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedOrderIds([...selectedOrderIds, order.id]);
                            } else {
                              setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        OS #{order.codigo_os || order.id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Cliente e Equipamento */}
                    <div>
                      <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors text-base truncate">
                        {order.clients?.name || 'Cliente'}
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {order.equipment_details}
                      </p>
                    </div>

                    {/* Problema Reportado */}
                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Problema Reportado:</p>
                      <p className="text-xs text-slate-300 line-clamp-2 italic">
                        "{stripHtml(order.reported_problem)}"
                      </p>
                    </div>
                    
                    <div className="mt-3">
                      <SlaTracker variant="mini" startedAt={order?.analysis_started_at} status={order.status} />
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-450">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-200 flex items-center">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl overflow-hidden shadow-lg animate-fadeIn">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-450">
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider w-8">
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds(filteredOrders.map(o => o.id));
                            } else {
                              setSelectedOrderIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">OS</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Cliente</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Equipamento</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider hidden lg:table-cell">SLA / Prazo</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider hidden md:table-cell">Criação</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-right">Valor</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-center w-12">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                        className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors group cursor-pointer"
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds([...selectedOrderIds, order.id]);
                              } else {
                                setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-xs text-slate-350">
                          {order.codigo_os || order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-bold group-hover:text-blue-450 transition-colors">
                          {order.clients?.name || 'Cliente'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs font-semibold">
                          {order.equipment_details}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap uppercase tracking-wider ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="w-44">
                            <SlaTracker variant="mini" startedAt={order?.analysis_started_at} status={order.status} />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">
                          R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                            className="text-slate-500 hover:text-blue-450 transition-colors p-1"
                            title="Visualizar OS"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {/* Barra de Ações em Massa */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl py-3.5 px-6 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-semibold text-slate-300">
            <strong className="text-white">{selectedOrderIds.length}</strong> {selectedOrderIds.length === 1 ? 'OS selecionada' : 'OS selecionadas'}
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Alterar Status para:</label>
            <select
              onChange={async (e) => {
                const newStatus = e.target.value;
                if (!newStatus) return;
                await handleBulkStatusUpdate(newStatus);
              }}
              defaultValue=""
              disabled={updatingBulk}
              className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-350 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="" disabled>Selecione...</option>
              <option value="Aguardando Equipamento">Aguardando Equipamento</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Aguardando Aprovação">Aguardando Aprovação</option>
              <option value="Aguardando Peças">Aguardando Peças</option>
              <option value="Em Execução">Em Execução</option>
              <option value="Em Testes">Em Testes</option>
              <option value="Pronto para Retirada">Pronto para Retirada</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={handleBulkDelete}
            disabled={updatingBulk}
            className="bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-400 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir OS
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => setSelectedOrderIds([])}
            className="text-[11px] font-bold text-slate-450 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

export default function ServiceOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Preparando página...</p>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
