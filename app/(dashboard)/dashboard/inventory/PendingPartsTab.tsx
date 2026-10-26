'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  Edit2,
  PackageCheck,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowRight,
  Phone,
} from 'lucide-react';
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Card,
  useToast,
  LoadingSpinner,
  EmptyState,
} from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface PendingPartItem {
  id: string;
  service_order_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  actual_cost: number | null;
  custom_name: string | null;
  supplier_link: string | null;
  tracking_code: string | null;
  part_status: 'em_estoque' | 'pendente' | 'a_comprar' | 'pedido_realizado' | 'recebido';
  product_name?: string;
  order_code?: string;
  order_status?: string;
  equipment_details?: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
}

const brl = (val: number) => `R$ ${val.toFixed(2)}`;

const STATUS_CONFIG: Record<
  string,
  { label: string; tone: 'warning' | 'info' | 'success' | 'neutral'; icon: React.ComponentType<any> }
> = {
  pendente: { label: 'Aguardando Aprovação', tone: 'neutral', icon: Clock },
  a_comprar: { label: 'A Comprar (Aprovado)', tone: 'warning', icon: ShoppingBag },
  pedido_realizado: { label: 'Em Trânsito / Pedido', tone: 'info', icon: Truck },
  recebido: { label: 'Recebido na Loja', tone: 'success', icon: CheckCircle2 },
};

export function PendingPartsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingPartItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal de edição / atualização da peça
  const [editingItem, setEditingItem] = useState<PendingPartItem | null>(null);
  const [modalStatus, setModalStatus] = useState<string>('');
  const [modalTracking, setModalTracking] = useState<string>('');
  const [modalActualCost, setModalActualCost] = useState<string>('');
  const [modalSupplierLink, setModalSupplierLink] = useState<string>('');
  const [savingModal, setSavingModal] = useState(false);

  const fetchPendingParts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_order_items')
        .select(`
          id,
          service_order_id,
          quantity,
          unit_price,
          unit_cost,
          actual_cost,
          custom_name,
          supplier_link,
          tracking_code,
          part_status,
          products_inventory (
            name
          ),
          service_orders!inner (
            id,
            codigo_os,
            status,
            equipment_details,
            clients (
              id,
              name,
              phone
            )
          )
        `)
        .or('product_id.is.null,part_status.neq.em_estoque');

      if (error) throw error;

      if (data) {
        const mapped: PendingPartItem[] = data.map((item: any) => {
          const order = item.service_orders;
          const client = order?.clients;
          return {
            id: item.id,
            service_order_id: item.service_order_id,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            unit_cost: Number(item.unit_cost) || 0,
            actual_cost: item.actual_cost ? Number(item.actual_cost) : null,
            custom_name: item.custom_name,
            supplier_link: item.supplier_link,
            tracking_code: item.tracking_code,
            part_status: item.part_status || 'pendente',
            product_name: item.products_inventory?.name || item.custom_name || 'Peça sob Encomenda',
            order_code: order?.codigo_os || order?.id?.substring(0, 8),
            order_status: order?.status || 'Em Análise',
            equipment_details: order?.equipment_details || '',
            client_id: client?.id,
            client_name: client?.name || 'Cliente',
            client_phone: client?.phone || '',
          };
        });

        // Ordenar por prioridade: a_comprar primeiro, depois pedido_realizado, pendente e por fim recebido
        const priorityOrder: Record<string, number> = {
          a_comprar: 1,
          pedido_realizado: 2,
          pendente: 3,
          recebido: 4,
          em_estoque: 5,
        };

        mapped.sort((a, b) => (priorityOrder[a.part_status] || 99) - (priorityOrder[b.part_status] || 99));
        setItems(mapped);
      }
    } catch (err: any) {
      console.error('Erro ao carregar peças sob encomenda:', err);
      toast.error('Não foi possível carregar as peças sob encomenda', {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingParts();
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const toBuy = items.filter((i) => i.part_status === 'a_comprar');
    const inTransit = items.filter((i) => i.part_status === 'pedido_realizado');
    const received = items.filter((i) => i.part_status === 'recebido');
    const pendingApproval = items.filter((i) => i.part_status === 'pendente');

    const totalEstCostToBuy = toBuy.reduce((acc, curr) => acc + curr.unit_cost * curr.quantity, 0);

    return {
      toBuyCount: toBuy.length,
      inTransitCount: inTransit.length,
      receivedCount: received.length,
      pendingApprovalCount: pendingApproval.length,
      totalEstCostToBuy,
    };
  }, [items]);

  // Filtros
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'todos' && item.part_status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = item.product_name?.toLowerCase().includes(query);
        const matchesOrder = item.order_code?.toLowerCase().includes(query);
        const matchesClient = item.client_name?.toLowerCase().includes(query);
        const matchesTracking = item.tracking_code?.toLowerCase().includes(query);
        const matchesEquip = item.equipment_details?.toLowerCase().includes(query);
        return Boolean(matchesName || matchesOrder || matchesClient || matchesTracking || matchesEquip);
      }
      return true;
    });
  }, [items, statusFilter, search]);

  const handleOpenEdit = (item: PendingPartItem) => {
    setEditingItem(item);
    setModalStatus(item.part_status);
    setModalTracking(item.tracking_code || '');
    setModalActualCost(item.actual_cost?.toString() || item.unit_cost?.toString() || '');
    setModalSupplierLink(item.supplier_link || '');
  };

  const handleSaveModal = async () => {
    if (!editingItem) return;
    setSavingModal(true);

    try {
      const parsedCost = parseFloat(modalActualCost);
      const actualCostVal = isNaN(parsedCost) ? null : parsedCost;

      const { data, error } = await supabase.rpc('update_order_item_part_status', {
        p_item_id: editingItem.id,
        p_part_status: modalStatus,
        p_tracking_code: modalTracking.trim() || null,
        p_actual_cost: actualCostVal,
        p_supplier_link: modalSupplierLink.trim() || null,
      });

      if (error) throw error;

      toast.success('Informações da peça atualizadas com sucesso!');
      if (modalStatus === 'recebido' && editingItem.part_status !== 'recebido') {
        toast.info('Peça marcada como recebida na loja.');
      }

      setEditingItem(null);
      await fetchPendingParts();
    } catch (err: any) {
      console.error('Erro ao atualizar peça:', err);
      toast.error('Erro ao salvar alterações da peça', { description: err.message });
    } finally {
      setSavingModal(false);
    }
  };

  const handleQuickAdvance = async (item: PendingPartItem, nextStatus: 'pedido_realizado' | 'recebido') => {
    try {
      const { error } = await supabase.rpc('update_order_item_part_status', {
        p_item_id: item.id,
        p_part_status: nextStatus,
        p_tracking_code: item.tracking_code,
        p_actual_cost: item.actual_cost || item.unit_cost,
        p_supplier_link: item.supplier_link,
      });

      if (error) throw error;

      const actionText = nextStatus === 'pedido_realizado' ? 'marcada como Em Trânsito' : 'marcada como Recebida';
      toast.success(`Peça "${item.product_name}" ${actionText}!`);

      await fetchPendingParts();
    } catch (err: any) {
      console.error('Erro na ação rápida:', err);
      toast.error('Falha ao atualizar status da peça', { description: err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <LoadingSpinner />
        <p className="text-small text-text-subtle font-medium">Carregando painel de compras e encomendas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo Operacional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-warning">A Comprar (Urgente)</p>
              <h3 className="text-h2 font-bold text-text mt-1">{kpis.toBuyCount}</h3>
              <p className="text-caption text-text-subtle mt-0.5">
                Custo estimado: <span className="font-mono font-semibold">{brl(kpis.totalEstCostToBuy)}</span>
              </p>
            </div>
            <div className="p-3 bg-warning/15 text-warning rounded-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-info/30 bg-info/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-info">Em Trânsito / Pedido</p>
              <h3 className="text-h2 font-bold text-text mt-1">{kpis.inTransitCount}</h3>
              <p className="text-caption text-text-subtle mt-0.5">Aguardando entrega do fornecedor</p>
            </div>
            <div className="p-3 bg-info/15 text-info rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-success/30 bg-success/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-success">Recebidas na Loja</p>
              <h3 className="text-h2 font-bold text-text mt-1">{kpis.receivedCount}</h3>
              <p className="text-caption text-text-subtle mt-0.5">Prontas para bancada técnica</p>
            </div>
            <div className="p-3 bg-success/15 text-success rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wider text-text-subtle">Em Orçamento</p>
              <h3 className="text-h2 font-bold text-text mt-1">{kpis.pendingApprovalCount}</h3>
              <p className="text-caption text-text-subtle mt-0.5">Aguardando cliente autorizar</p>
            </div>
            <div className="p-3 bg-surface-sunken text-text-subtle rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-raised p-3 border border-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            aria-label="Buscar peça, O.S, cliente ou rastreio"
            placeholder="Buscar por peça, O.S, cliente ou rastreio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="todos">Todos os Status</option>
            <option value="a_comprar">A Comprar (Aprovadas)</option>
            <option value="pedido_realizado">Em Trânsito / Pedido</option>
            <option value="recebido">Recebidas</option>
            <option value="pendente">Aguardando Aprovação</option>
          </Select>

          <Button variant="secondary" size="sm" onClick={fetchPendingParts} title="Atualizar dados">
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabela de Peças */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="Nenhuma peça sob encomenda encontrada"
          description={
            statusFilter !== 'todos' || search
              ? 'Nenhum resultado corresponde aos filtros selecionados.'
              : 'Quando uma O.S orçar peças fora de estoque, elas serão listadas aqui para compras e rastreamento.'
          }
        />
      ) : (
        <div className="border border-border overflow-x-auto bg-surface">
          <Table>
            <THead>
              <TR>
                <TH>Status</TH>
                <TH>Ordem de Serviço</TH>
                <TH>Cliente</TH>
                <TH>Peça Solicitada</TH>
                <TH className="text-center">Qtd</TH>
                <TH className="text-right">Venda</TH>
                <TH className="text-right">Custo Est. / Real</TH>
                <TH>Fornecedor & Rastreio</TH>
                <TH className="text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {filteredItems.map((item) => {
                const cfg = STATUS_CONFIG[item.part_status] || STATUS_CONFIG.pendente;
                const StatusIcon = cfg.icon;

                return (
                  <TR key={item.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <TD>
                      <Badge tone={cfg.tone} className="flex items-center gap-1.5 w-fit">
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{cfg.label}</span>
                      </Badge>
                    </TD>

                    <TD>
                      <div className="space-y-0.5">
                        <Link
                          href={`/dashboard/orders/${item.service_order_id}`}
                          className="font-mono font-bold text-small text-brand hover:underline flex items-center gap-1"
                        >
                          #{item.order_code} <ArrowRight className="w-3 h-3" />
                        </Link>
                        {item.equipment_details && (
                          <p className="text-caption text-text-subtle truncate max-w-[160px]" title={item.equipment_details}>
                            {item.equipment_details}
                          </p>
                        )}
                        <span className="text-[11px] text-text-muted">OS: {item.order_status}</span>
                      </div>
                    </TD>

                    <TD>
                      <div className="space-y-0.5 min-w-[140px]">
                        <p className="text-small font-semibold text-text truncate">{item.client_name}</p>
                        {item.client_phone && (
                          <a
                            href={`https://wa.me/55${item.client_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-caption text-text-subtle hover:text-brand flex items-center gap-1"
                            title="Conversar no WhatsApp"
                          >
                            <Phone className="w-3 h-3 text-success" />
                            {item.client_phone}
                          </a>
                        )}
                      </div>
                    </TD>

                    <TD>
                      <div className="space-y-1 min-w-[180px]">
                        <p className="text-small font-semibold text-text">{item.product_name}</p>
                        <Badge tone="warning" className="text-[10px] py-0 px-1.5">
                          Sob Encomenda
                        </Badge>
                      </div>
                    </TD>

                    <TD className="text-center font-mono font-semibold text-small">
                      {item.quantity} un
                    </TD>

                    <TD className="text-right font-mono tabular-nums font-semibold text-small text-text">
                      {brl(item.quantity * item.unit_price)}
                    </TD>

                    <TD className="text-right font-mono tabular-nums text-small">
                      <div className="space-y-0.5">
                        <span className="text-text-subtle block text-caption">
                          Est: {brl(item.unit_cost)}
                        </span>
                        {item.actual_cost !== null ? (
                          <span className="text-success font-semibold block">
                            Real: {brl(item.actual_cost)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px] block">Sem custo real</span>
                        )}
                      </div>
                    </TD>

                    <TD>
                      <div className="space-y-1 min-w-[150px]">
                        {item.supplier_link ? (
                          <a
                            href={item.supplier_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-caption font-semibold text-brand hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Abrir Link Fornecedor
                          </a>
                        ) : (
                          <span className="text-caption text-text-subtle italic">Sem link</span>
                        )}

                        {item.tracking_code ? (
                          <div className="flex items-center gap-1 text-caption text-text font-mono">
                            <Truck className="w-3 h-3 text-info shrink-0" />
                            <a
                              href={`https://rastreamento.correios.com.br/app/index.php?codigo=${item.tracking_code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-info hover:underline"
                              title="Rastrear entrega"
                            >
                              {item.tracking_code}
                            </a>
                          </div>
                        ) : (
                          <span className="text-caption text-text-subtle block">Sem rastreio</span>
                        )}
                      </div>
                    </TD>

                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.part_status === 'a_comprar' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickAdvance(item, 'pedido_realizado')}
                            title="Marcar que o pedido foi feito ao fornecedor"
                          >
                            Pedir Peça
                          </Button>
                        )}

                        {item.part_status === 'pedido_realizado' && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<PackageCheck className="w-3.5 h-3.5" />}
                            onClick={() => handleQuickAdvance(item, 'recebido')}
                            title="Confirmar recebimento físico na loja"
                          >
                            Recebido
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(item)}
                          title="Editar fornecedor, custo real e rastreio"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}

      {/* Modal de Detalhes e Gestão da Peça */}
      <Modal
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Gerenciar Peça sob Encomenda"
      >
        {editingItem && (
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-surface-sunken border border-border rounded-lg space-y-1">
              <p className="text-caption uppercase text-text-subtle font-semibold">Peça Selecionada</p>
              <p className="text-body font-bold text-text">{editingItem.product_name}</p>
              <p className="text-caption text-text-subtle font-mono">
                O.S #{editingItem.order_code} • Cliente: {editingItem.client_name} • Qtd: {editingItem.quantity} un
              </p>
            </div>

            <Select
              label="Status da Peça"
              value={modalStatus}
              onChange={(e) => setModalStatus(e.target.value)}
            >
              <option value="pendente">Aguardando Aprovação do Cliente</option>
              <option value="a_comprar">A Comprar (Orçamento Aprovado)</option>
              <option value="pedido_realizado">Em Trânsito / Pedido Feito ao Fornecedor</option>
              <option value="recebido">Recebido na Loja (Pronto para Reparo)</option>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Custo Estimado (R$)"
                value={editingItem.unit_cost.toString()}
                disabled
                className="bg-surface-sunken text-text-subtle font-mono"
              />
              <Input
                label="Custo Real Pago (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 120.00"
                value={modalActualCost}
                onChange={(e) => setModalActualCost(e.target.value)}
                className="font-mono tabular-nums font-semibold"
              />
            </div>

            <Input
              label="Código de Rastreio"
              placeholder="Ex: AA123456789BR"
              value={modalTracking}
              onChange={(e) => setModalTracking(e.target.value)}
              className="font-mono uppercase"
            />

            <Input
              label="Link do Fornecedor / Anúncio"
              placeholder="https://..."
              value={modalSupplierLink}
              onChange={(e) => setModalSupplierLink(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setEditingItem(null)} disabled={savingModal}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveModal} loading={savingModal}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
