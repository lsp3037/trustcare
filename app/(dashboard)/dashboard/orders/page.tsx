'use client';
import { SlaTracker } from '@/components/ui/SlaTracker';
import {
  StatusBadge,
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  Input,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from '@/components/ui';
import { OS_STATUS_FLOW } from '@/lib/design/status';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  Wrench,
  Eye,
  Calendar,
  Trash2,
  LayoutGrid,
  List,
  Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import NewOrderForm from '@/components/NewOrderForm';
import { useCompany } from '@/lib/context/CompanyContext';
import { exportOrdersToCsv } from '@/lib/utils/csvExport';
import { cn } from '@/lib/utils';

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
  technical_report?: string | null;
  equipment_details?: string;
  client_id?: string;
  pago?: boolean;
  analysis_started_at?: string;
  clients: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
  type: string;
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

  const hasActiveFilters = Boolean(searchTerm) || statusFilter !== 'Todos';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-text-subtle" aria-hidden /> Ordens de Serviço
          </h1>
          <p className="text-small text-text-muted mt-2">Acompanhe e gerencie as Ordens de Serviço (OS).</p>
        </div>
        {!isCreating && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={() => exportOrdersToCsv(filteredOrders)}
            >
              Exportar CSV
            </Button>
            <Button
              icon={<Plus className="w-4 h-4" />}
              disabled={isReadOnly}
              title={isReadOnly ? 'Conta em modo apenas-leitura por faturamento pendente' : undefined}
              onClick={() => router.push('/dashboard/orders?new=true')}
            >
              Nova Ordem de Serviço
            </Button>
          </div>
        )}
      </div>

      {isCreating ? (
        <Card padding="lg" className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start gap-4 mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-h2 text-text">Nova Ordem de Serviço</h2>
              <p className="text-small text-text-muted mt-1">Cadastre um novo chamado técnico no sistema.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/orders')}>
              Cancelar
            </Button>
          </div>

          {isReadOnly ? (
            <p className="p-6 bg-danger/10 border border-danger/25 text-danger text-center text-small font-semibold">
              A criação de Ordens de Serviço está desabilitada temporariamente. A conta do tenant está em modo de apenas-leitura por faturamento pendente no Asaas.
            </p>
          ) : (
            <NewOrderForm
              clients={clients}
              onSuccess={() => {
                fetchOrdersAndClients();
                router.push('/dashboard/orders');
              }}
            />
          )}
        </Card>
      ) : (
        <>
          {/* Barra de Filtros e Busca */}
          <Card padding="sm" className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
            {/* Campo de Busca */}
            <div className="relative w-full md:max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none z-10"
                aria-hidden
              />
              <Input
                type="search"
                aria-label="Buscar ordens de serviço"
                placeholder="Buscar por cliente, equipamento, problema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Status e Controle de Visualização */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 md:justify-end">
              <Filter className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />
              <Select
                aria-label="Filtrar por status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                wrapperClassName="w-auto"
                className="w-auto"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Ativas">OS Abertas / Em Análise</option>
                {OS_STATUS_FLOW.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>

              <div className="h-8 w-px bg-border hidden sm:block mx-1" />

              <div
                className="flex items-center bg-surface-sunken border border-border p-1 shrink-0"
                role="group"
                aria-label="Modo de visualização"
              >
                {([
                  { mode: 'grid' as const, icon: LayoutGrid, label: 'Visualização em Cards' },
                  { mode: 'table' as const, icon: List, label: 'Visualização em Tabela' },
                ]).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSetViewMode(mode)}
                    aria-pressed={viewMode === mode}
                    title={label}
                    className={cn(
                      'p-1.5 transition-colors cursor-pointer',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                      viewMode === mode
                        ? 'bg-brand text-brand-contrast'
                        : 'text-text-subtle hover:text-text',
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Listagem de OS */}
          {loading ? (
            <Card className="flex flex-col items-center justify-center py-20 gap-4">
              <LoadingSpinner className="w-8 h-8 text-brand" />
              <p className="text-small text-text-muted">Carregando ordens de serviço...</p>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList />}
              title={
                hasActiveFilters
                  ? 'Nenhuma OS encontrada com esses filtros'
                  : 'Nenhuma Ordem de Serviço criada ainda'
              }
              description={
                hasActiveFilters
                  ? 'Tente limpar os filtros de busca ou status para ver todas as OS.'
                  : 'Crie sua primeira Ordem de Serviço para começar a gerenciar os atendimentos da sua assistência.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('Todos');
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => router.push('/dashboard/orders?new=true')}
                  >
                    Criar Primeira OS
                  </Button>
                )
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  interactive
                  padding="sm"
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                  className="flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar OS ${order.codigo_os || order.id.slice(0, 8)}`}
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds([...selectedOrderIds, order.id]);
                            } else {
                              setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 border-border bg-surface-sunken accent-brand cursor-pointer"
                        />
                        <StatusBadge status={order.status} />
                      </div>
                      <span className="text-caption font-mono text-text-subtle shrink-0">
                        OS #{order.codigo_os || order.id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Cliente e Equipamento */}
                    <div>
                      <h3 className="text-h3 text-text truncate">
                        {order.clients?.name || 'Cliente'}
                      </h3>
                      <p className="text-small text-text-muted mt-1 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-text-subtle shrink-0" aria-hidden />
                        {order.equipment_details}
                      </p>
                    </div>

                    {/* Problema Reportado */}
                    <div className="p-3 bg-surface-sunken border border-border">
                      <p className="text-caption uppercase tracking-wider text-text-subtle mb-1">
                        Problema Reportado
                      </p>
                      <p className="text-small text-text-muted line-clamp-2">
                        {stripHtml(order.reported_problem || '')}
                      </p>
                    </div>

                    <SlaTracker variant="mini" startedAt={order?.analysis_started_at} status={order.status} />
                  </div>

                  {/* Rodapé do Card */}
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-3 text-small">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <Calendar className="w-3.5 h-3.5 text-text-subtle" aria-hidden />
                      <span className="font-mono tabular-nums">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-text">
                      R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card padding="none">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-8">
                      <input
                        type="checkbox"
                        aria-label="Selecionar todas as OS visíveis"
                        checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(filteredOrders.map(o => o.id));
                          } else {
                            setSelectedOrderIds([]);
                          }
                        }}
                        className="w-4 h-4 border-border bg-surface-sunken accent-brand cursor-pointer"
                      />
                    </TH>
                    <TH>OS</TH>
                    <TH>Cliente</TH>
                    <TH>Equipamento</TH>
                    <TH>Status</TH>
                    <TH className="hidden lg:table-cell">SLA / Prazo</TH>
                    <TH className="hidden md:table-cell">Criação</TH>
                    <TH align="right">Valor</TH>
                    <TH align="center" className="w-12">
                      <span className="sr-only">Ações</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredOrders.map((order) => (
                    <TR
                      key={order.id}
                      interactive
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      <TD onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar OS ${order.codigo_os || order.id.slice(0, 8)}`}
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds([...selectedOrderIds, order.id]);
                            } else {
                              setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                            }
                          }}
                          className="w-4 h-4 border-border bg-surface-sunken accent-brand cursor-pointer"
                        />
                      </TD>
                      <TD numeric className="text-text-muted">
                        {order.codigo_os || order.id.slice(0, 8).toUpperCase()}
                      </TD>
                      <TD className="font-semibold">
                        {order.clients?.name || 'Cliente'}
                      </TD>
                      <TD className="text-text-muted text-small">
                        {order.equipment_details}
                      </TD>
                      <TD>
                        <StatusBadge status={order.status} />
                      </TD>
                      <TD className="hidden lg:table-cell">
                        <div className="w-44">
                          <SlaTracker variant="mini" startedAt={order?.analysis_started_at} status={order.status} />
                        </div>
                      </TD>
                      <TD numeric className="text-text-muted hidden md:table-cell">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </TD>
                      <TD align="right" numeric className="font-semibold">
                        R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TD>
                      <TD align="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                          className="p-1 text-text-subtle hover:text-text transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          title="Visualizar OS"
                          aria-label={`Visualizar OS ${order.codigo_os || order.id.slice(0, 8)}`}
                        >
                          <Eye className="w-4 h-4" aria-hidden />
                        </button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Card>
          )}
        </>
      )}
      {/* Barra de Ações em Massa */}
      {selectedOrderIds.length > 0 && (
        <div
          role="toolbar"
          aria-label="Ações em massa"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] bg-surface-overlay border border-border-strong py-3 px-4 shadow-2xl flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
        >
          <span className="text-small text-text-muted">
            <strong className="font-mono tabular-nums text-text">{selectedOrderIds.length}</strong>{' '}
            {selectedOrderIds.length === 1 ? 'OS selecionada' : 'OS selecionadas'}
          </span>
          <div className="h-4 w-px bg-border" />
          <Select
            aria-label="Alterar status das OS selecionadas"
            onChange={async (e) => {
              const newStatus = e.target.value;
              if (!newStatus) return;
              await handleBulkStatusUpdate(newStatus);
            }}
            defaultValue=""
            disabled={updatingBulk}
            wrapperClassName="w-auto"
            className="w-auto py-1.5 text-small"
          >
            <option value="" disabled>Alterar status para...</option>
            {OS_STATUS_FLOW.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            loading={updatingBulk}
            onClick={handleBulkDelete}
          >
            Excluir OS
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedOrderIds([])}>
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ServiceOrdersPage() {
  return (
    <Suspense fallback={
      <Card className="flex flex-col items-center justify-center py-20 gap-4">
        <LoadingSpinner className="w-8 h-8 text-brand" />
        <p className="text-small text-text-muted">Preparando página...</p>
      </Card>
    }>
      <OrdersContent />
    </Suspense>
  );
}
