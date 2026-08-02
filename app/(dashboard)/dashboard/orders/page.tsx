'use client';
import { SlaTracker } from '@/components/ui/SlaTracker';
import {
  StatusBadge,
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  useToast,
  useConfirm,
  PageHeader,
  Toolbar,
  ToolbarGroup,
  ToolbarSearch,
  ToolbarDivider,
  SegmentedControl,
  BulkActionBar,
  BulkDivider,
  Checkbox,
} from '@/components/ui';
import { OS_STATUS_FLOW } from '@/lib/design/status';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ClipboardList,
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
  const toast = useToast();
  const confirm = useConfirm();
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
    const count = selectedOrderIds.length;

    try {
      setUpdatingBulk(true);

      const { error } = await supabase
        .from('service_orders')
        .update({ status: newStatus })
        .in('id', selectedOrderIds);

      if (error) throw error;

      setOrders(prev => prev.map(o => selectedOrderIds.includes(o.id) ? { ...o, status: newStatus } : o));
      toast.success(
        `${count} ${count === 1 ? 'OS movida' : 'OS movidas'} para "${newStatus}"`,
      );
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
        toast.warning(
          `${count} ${count === 1 ? 'OS movida' : 'OS movidas'} para "${newStatus}" apenas neste dispositivo`,
          {
            description:
              'Sem conexão com o servidor. A alteração está salva localmente e não foi sincronizada.',
          },
        );
      }
    } finally {
      setSelectedOrderIds([]);
      setUpdatingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedOrderIds.length;

    const confirmed = await confirm({
      title:
        count === 1
          ? 'Excluir esta ordem de serviço?'
          : `Excluir ${count} ordens de serviço?`,
      description:
        'As peças alocadas voltam para o estoque. Esta ação não pode ser desfeita.',
      confirmLabel: count === 1 ? 'Excluir OS' : `Excluir ${count} OS`,
      destructive: true,
    });
    if (!confirmed) return;

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
      toast.success(
        count === 1 ? 'Ordem de serviço excluída' : `${count} ordens de serviço excluídas`,
        { description: 'As peças alocadas voltaram para o estoque.' },
      );
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
        toast.warning('Exclusão aplicada apenas neste dispositivo', {
          description:
            'Sem conexão com o servidor. As OS continuam no servidor até a próxima sincronização.',
        });
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

  const allVisibleSelected =
    filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.includes(o.id));
  const someVisibleSelected = filteredOrders.some((o) => selectedOrderIds.includes(o.id));

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<ClipboardList />}
        title="Ordens de Serviço"
        description="Acompanhe e gerencie as Ordens de Serviço (OS)."
        actions={
          !isCreating && (
            <>
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
            </>
          )
        }
      />

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
          <Toolbar>
            <ToolbarSearch
              aria-label="Buscar ordens de serviço"
              placeholder="Buscar por cliente, equipamento, problema..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />

            <ToolbarGroup>
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

              <ToolbarDivider />

              <SegmentedControl
                label="Modo de visualização"
                value={viewMode}
                onChange={handleSetViewMode}
                options={[
                  {
                    value: 'grid',
                    label: 'Visualização em Cards',
                    icon: <LayoutGrid className="w-4 h-4" aria-hidden />,
                    iconOnly: true,
                  },
                  {
                    value: 'table',
                    label: 'Visualização em Tabela',
                    icon: <List className="w-4 h-4" aria-hidden />,
                    iconOnly: true,
                  },
                ]}
              />
            </ToolbarGroup>
          </Toolbar>

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
                  padding="sm"
                  href={`/dashboard/orders/${order.id}`}
                  linkLabel={`Abrir OS ${order.codigo_os || order.id.slice(0, 8)} — ${order.clients?.name || 'Cliente'}`}
                  className="flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header do Card */}
                    <div className="flex justify-between items-start gap-2">
                      {/* `relative z-10`: o link que cobre o card fica acima do
                          conteúdo comum; sem isto o checkbox não recebe clique. */}
                      <div className="flex items-center gap-2 relative z-10">
                        <Checkbox
                          aria-label={`Selecionar OS ${order.codigo_os || order.id.slice(0, 8)}`}
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds([...selectedOrderIds, order.id]);
                            } else {
                              setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                            }
                          }}
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
                      <Checkbox
                        aria-label="Selecionar todas as OS visíveis"
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected && !allVisibleSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(filteredOrders.map(o => o.id));
                          } else {
                            setSelectedOrderIds([]);
                          }
                        }}
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
                        <Checkbox
                          aria-label={`Selecionar OS ${order.codigo_os || order.id.slice(0, 8)}`}
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds([...selectedOrderIds, order.id]);
                            } else {
                              setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                            }
                          }}
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
      <BulkActionBar
        count={selectedOrderIds.length}
        itemLabel={['OS selecionada', 'OS selecionadas']}
        onClear={() => setSelectedOrderIds([])}
      >
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

          <BulkDivider />

          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            loading={updatingBulk}
            onClick={handleBulkDelete}
          >
            Excluir OS
          </Button>
      </BulkActionBar>
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
