'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Pencil,
  CalendarOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/context/UserContext';
import { useRouter } from 'next/navigation';
import DatePickerWithRange from '@/components/DatePickerWithRange';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Skeleton,
  SkeletonTable,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useConfirm,
  useToast,
} from '@/components/ui';
import { KpiCard } from './_components/KpiCard';
import { PaymentTable } from './_components/PaymentTable';
import { FinanceiroBarChart, FinanceiroPieChart } from './_components/FinanceiroChart';
import { exportFinancialToCsv, exportToCsv } from '@/lib/utils/csvExport';
import { AddExpenseModal } from './_components/AddExpenseModal';

interface DateRange { from: Date; to: Date; }

interface OrderItem {
  quantity: number;
  products_inventory: {
    cost_price: number;
  } | {
    cost_price: number;
  }[] | null;
}

interface Order {
  id: string;
  codigo_os?: string;
  total_value: number;
  status: string;
  created_at: string;
  payment_date?: string;
  payment_method?: string;
  pago?: boolean;
  clients?: { name: string };
  service_order_items?: OrderItem[];
}

interface RawOrder extends Omit<Order, 'clients'> {
  clients?: { name: string } | { name: string }[] | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
  recurrence?: string;
  end_date?: string | null;
}

const PAID_STATUSES = ['Finalizado', 'Pronto para Retirada', 'Entregue'];

// ─── Chart Helpers ────────────────────────────────────────────────────────────

function projectExpenses(expenses: Expense[], from: Date, to: Date): Expense[] {
  const projected: Expense[] = [];

  expenses.forEach((e) => {
    const start = new Date(e.expense_date);
    if (start > to) return;

    const recurrence = e.recurrence || 'Única';
    const end = e.end_date ? new Date(e.end_date) : null;
    const limit = end && end < to ? end : to;

    if (recurrence === 'Única') {
      if (start >= from && start <= to) {
        projected.push(e);
      }
      return;
    }

    const current = new Date(start);
    // Para evitar loops infinitos caso a data inicial seja inválida
    if (isNaN(current.getTime())) return;

    while (current <= limit) {
      if (current >= from) {
        projected.push({
          ...e,
          id: `${e.id}-proj-${current.toISOString().split('T')[0]}`,
          expense_date: current.toISOString(),
        });
      }

      if (recurrence === 'Diária') {
        current.setDate(current.getDate() + 1);
      } else if (recurrence === 'Semanal') {
        current.setDate(current.getDate() + 7);
      } else if (recurrence === 'Mensal') {
        current.setMonth(current.getMonth() + 1);
      } else if (recurrence === 'Anual') {
        current.setFullYear(current.getFullYear() + 1);
      } else {
        break;
      }
    }
  });

  return projected.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
}

function calculateOrderPartsCost(order: Order): number {
  if (!order.service_order_items) return 0;
  return order.service_order_items.reduce((sum, item) => {
    const rawCost = item.products_inventory;
    const cost = Array.isArray(rawCost)
      ? (rawCost[0]?.cost_price || 0)
      : (rawCost?.cost_price || 0);
    return sum + (item.quantity * cost);
  }, 0);
}

function buildBarData(orders: Order[], expenses: Expense[], from: Date, to: Date) {
  const daysCount = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const showByDay = daysCount <= 35;

  if (showByDay) {
    const days = Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      return {
        dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        rawDate: d.toISOString().split('T')[0],
        faturamento: 0,
        custos: 0,
      };
    });

    // Soma faturamento e custo de peças das OS pagas
    orders.forEach((o) => {
      const d = (o.payment_date || o.created_at)?.split('T')[0];
      const slot = days.find((x) => x.rawDate === d);
      if (slot && PAID_STATUSES.includes(o.status)) {
        slot.faturamento += Number(o.total_value || 0);
        slot.custos += calculateOrderPartsCost(o);
      }
    });

    // Soma despesas gerais
    expenses.forEach((e) => {
      const d = e.expense_date?.split('T')[0];
      const slot = days.find((x) => x.rawDate === d);
      if (slot) {
        slot.custos += Number(e.amount || 0);
      }
    });

    return days;
  }

  // Group by week
  const weeks: { dia: string; from: Date; to: Date; faturamento: number; custos: number; }[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    const end = new Date(cur);
    end.setDate(end.getDate() + 6);
    weeks.push({
      dia: `${cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
      from: new Date(cur),
      to: end > to ? to : end,
      faturamento: 0,
      custos: 0,
    });
    cur.setDate(cur.getDate() + 7);
  }

  // Soma faturamento e custo de peças das OS pagas
  orders.forEach((o) => {
    if (!PAID_STATUSES.includes(o.status)) return;
    const d = new Date(o.payment_date || o.created_at);
    const slot = weeks.find((w) => d >= w.from && d <= w.to);
    if (slot) {
      slot.faturamento += Number(o.total_value || 0);
      slot.custos += calculateOrderPartsCost(o);
    }
  });

  // Soma despesas gerais
  expenses.forEach((e) => {
    const d = new Date(e.expense_date);
    const slot = weeks.find((w) => d >= w.from && d <= w.to);
    if (slot) {
      slot.custos += Number(e.amount || 0);
    }
  });

  return weeks;
}

function buildPieData(orders: Order[]) {
  const dist: Record<string, number> = {};
  orders.forEach((o) => {
    const m = o.payment_method || 'Não Informado';
    dist[m] = (dist[m] || 0) + Number(o.total_value || 0);
  });
  return Object.entries(dist).map(([name, value]) => ({ name, value }));
}

// ──────────────────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const router = useRouter();
  const { isAdmin, loading: userLoading } = useUser();
  const toast = useToast();
  const confirm = useConfirm();

  const defaultFrom = new Date();
  defaultFrom.setDate(1);
  const defaultTo = new Date();

  const [dateRange, setDateRange] = useState<DateRange>({ from: defaultFrom, to: defaultTo });
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'recebidos' | 'despesas'>('pendentes');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Busca Ordens de Serviço com itens de ordem de serviço e custo do produto associado
      const { data: osData, error: osError } = await supabase
        .from('service_orders')
        .select(`
          id, codigo_os, total_value, status, created_at, payment_date, payment_method, pago,
          clients(name),
          service_order_items(quantity, products_inventory(cost_price))
        `)
        .order('created_at', { ascending: false });

      if (osError) throw osError;

      // Supabase returns joined tables as arrays; normalize to object
      const normalizedOrders = ((osData as RawOrder[]) ?? []).map((o) => ({
        ...o,
        clients: Array.isArray(o.clients) ? o.clients[0] : (o.clients ?? undefined),
      })) as Order[];
      setAllOrders(normalizedOrders);

      // 2. Busca Despesas Gerais
      const { data: expensesData, error: expError } = await supabase
        .from('company_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expError) throw expError;
      setExpenses((expensesData as Expense[]) ?? []);

    } catch (err) {
      console.warn('Financeiro: erro ao carregar dados', err);
      setAllOrders([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Ocorrências projetadas carregam `-proj-N` no id; o banco só conhece a raiz. */
  const rootExpenseId = (id: string) => (id.includes('-proj-') ? id.split('-proj-')[0] : id);

  const handleDeleteExpense = async (expense: Expense) => {
    const isRecorrente = Boolean(expense.recurrence && expense.recurrence !== 'Única');

    const confirmed = await confirm({
      title: `Excluir a despesa "${expense.description}"?`,
      description: isRecorrente
        ? 'Esta é uma despesa recorrente: excluir remove TODAS as ocorrências, inclusive as já passadas. Para parar só daqui para frente, use "Encerrar recorrência".'
        : 'A despesa sai do cálculo de lucro do período. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir despesa',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('company_expenses')
        .delete()
        .eq('id', rootExpenseId(expense.id));

      if (error) throw error;
      toast.success('Despesa excluída');
      fetchData();
    } catch (err: any) {
      toast.error('Não foi possível excluir a despesa', {
        description: err.message || 'Erro inesperado.',
      });
    }
  };

  const handleEndRecurrence = async (expense: Expense) => {
    const confirmed = await confirm({
      title: `Encerrar a recorrência de "${expense.description}"?`,
      description:
        'As ocorrências passadas continuam no histórico; a despesa deixa de ser projetada a partir de hoje.',
      confirmLabel: 'Encerrar recorrência',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('company_expenses')
        .update({ end_date: new Date().toISOString() })
        .eq('id', rootExpenseId(expense.id));

      if (error) throw error;
      toast.success('Recorrência encerrada');
      fetchData();
    } catch (err: any) {
      toast.error('Não foi possível encerrar a recorrência', {
        description: err.message || 'Erro inesperado.',
      });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    const originalExpense = expenses.find((e) => e.id === rootExpenseId(expense.id));
    if (originalExpense) {
      setExpenseToEdit(originalExpense);
      setIsAddExpenseOpen(true);
    } else {
      toast.error('Despesa original não encontrada', {
        description: 'Atualize a página e tente de novo.',
      });
    }
  };

  // Filter by date range ──────────────────────────────────────────────────────

  const inRange = useCallback(
    (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= dateRange.from && d <= dateRange.to;
    },
    [dateRange]
  );

  const periodOrders = allOrders.filter((o) => inRange(o.created_at));

  // OS efetivamente pagas no período (caixa)
  const paidOrders = allOrders.filter(
    (o) => o.pago === true && inRange(o.payment_date || o.created_at) && PAID_STATUSES.includes(o.status)
  );

  // OS pendentes de pagamento (concluídas mas não pagas)
  const pendingOrders = allOrders.filter(
    (o) => PAID_STATUSES.includes(o.status) && !o.pago
  );

  // Projeta e filtra despesas gerais no período selecionado
  const periodExpenses = projectExpenses(expenses, dateRange.from, dateRange.to);

  // Cálculos Financeiros
  const receitaRecebida = paidOrders.reduce((s, o) => s + Number(o.total_value || 0), 0);
  const aReceber = pendingOrders.reduce((s, o) => s + Number(o.total_value || 0), 0);

  // Custo de peças das OS pagas
  const totalPartsCost = paidOrders.reduce((s, o) => s + calculateOrderPartsCost(o), 0);

  // Despesas gerais do período
  const totalGeneralExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // Custos acumulados
  const totalCustos = totalPartsCost + totalGeneralExpenses;

  // Lucro líquido real (Receita Recebida - Custos)
  const lucroLiquido = receitaRecebida - totalCustos;

  const barData = buildBarData(paidOrders, periodExpenses, dateRange.from, dateRange.to);
  const pieData = buildPieData(paidOrders);

  const fmtCurrency = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const handleExportPending = () => {
    exportToCsv(
      pendingOrders.map((o) => ({
        OS: o.codigo_os ?? o.id.slice(0, 8),
        Cliente: o.clients?.name ?? '',
        Valor: Number(o.total_value).toFixed(2).replace('.', ','),
        Status: o.status,
        'Criada em': o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : '',
      })),
      'trustcare_recebiveis_pendentes'
    );
  };

  const handleExportPaid = () => {
    exportToCsv(
      paidOrders.map((o) => ({
        OS: o.codigo_os ?? o.id.slice(0, 8),
        Cliente: o.clients?.name ?? '',
        Valor: Number(o.total_value).toFixed(2).replace('.', ','),
        'Forma de Pagamento': o.payment_method ?? '',
        'Pago em': o.payment_date ? new Date(o.payment_date).toLocaleDateString('pt-BR') : '',
      })),
      'trustcare_faturamento_recebido'
    );
  };

  const handleExportExpenses = () => {
    exportToCsv(
      periodExpenses.map((e) => ({
        Descrição: e.description,
        Valor: Number(e.amount).toFixed(2).replace('.', ','),
        Categoria: e.category,
        Data: e.expense_date ? new Date(e.expense_date).toLocaleDateString('pt-BR') : '',
      })),
      'trustcare_despesas'
    );
  };

  if (userLoading || !isAdmin) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Carregando financeiro">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} padding="sm">
              <Skeleton className="h-3 w-28 mb-2" style={{ animationDelay: `${i * 80}ms` }} />
              <Skeleton className="h-7 w-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const TABS = [
    { value: 'pendentes' as const, label: `A Receber (${pendingOrders.length})` },
    { value: 'recebidos' as const, label: `Recebido (${paidOrders.length})` },
    { value: 'despesas' as const, label: `Despesas (${periodExpenses.length})` },
  ];

  const exportAtual =
    activeTab === 'pendentes'
      ? handleExportPending
      : activeTab === 'recebidos'
        ? handleExportPaid
        : handleExportExpenses;

  return (
    <div className="space-y-6">
      {isAddExpenseOpen && (
        <AddExpenseModal
          expenseToEdit={expenseToEdit || undefined}
          onClose={() => {
            setIsAddExpenseOpen(false);
            setExpenseToEdit(null);
          }}
          onSuccess={fetchData}
        />
      )}

      <PageHeader
        icon={<DollarSign />}
        title="Financeiro"
        description="Controle de fluxo de caixa, custos de peças e lucratividade."
        actions={
          <>
            <DatePickerWithRange onChange={setDateRange} />
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                const transactions = [
                  ...paidOrders.map((o) => ({
                    date: o.payment_date || o.created_at,
                    type: 'income',
                    description: `OS #${o.codigo_os || (o.id ? o.id.slice(0, 8) : '')} - ${o.clients?.name || 'Cliente'}`,
                    amount: o.total_value,
                    status: 'Pago',
                  })),
                  ...periodExpenses.map((e) => ({
                    date: e.expense_date,
                    type: 'expense',
                    description: `${e.description} (${e.category})`,
                    amount: e.amount,
                    status: e.recurrence || 'Único',
                  })),
                ];
                exportFinancialToCsv(transactions);
              }}
            >
              Exportar CSV
            </Button>
            <Button
              variant="ghost"
              onClick={fetchData}
              title="Atualizar dados"
              aria-label="Atualizar dados"
              className="px-2.5"
            >
              <RefreshCw className="w-4 h-4" aria-hidden />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Faturamento (Caixa)"
          value={loading ? '—' : fmtCurrency(receitaRecebida)}
          subtitle={`${paidOrders.length} OS pagas no período`}
          icon={CheckCircle2}
          accentColor="success"
        />
        <KpiCard
          title="Custos Operacionais"
          value={loading ? '—' : fmtCurrency(totalCustos)}
          subtitle={`Peças: ${fmtCurrency(totalPartsCost)} · Despesas: ${fmtCurrency(totalGeneralExpenses)}`}
          icon={TrendingUp}
          accentColor="danger"
        />
        <KpiCard
          title="Lucro Líquido"
          value={loading ? '—' : fmtCurrency(lucroLiquido)}
          subtitle="Faturamento menos custos acumulados"
          icon={DollarSign}
          accentColor={lucroLiquido >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          title="A Receber"
          value={loading ? '—' : fmtCurrency(aReceber)}
          subtitle={`${pendingOrders.length} OS pendentes`}
          icon={Clock}
          accentColor="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h2 className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-4">
            Faturamento vs Custos
          </h2>
          {loading ? <Skeleton className="h-[220px] w-full" /> : <FinanceiroBarChart data={barData} />}
        </Card>
        <Card>
          <h2 className="text-caption font-semibold text-text-muted uppercase tracking-wider mb-4">
            Faturamento por Forma de Pagamento
          </h2>
          {loading ? <Skeleton className="h-[220px] w-full" /> : <FinanceiroPieChart data={pieData} />}
        </Card>
      </div>

      <Card padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
          <SegmentedControl
            label="Seção do financeiro"
            value={activeTab}
            onChange={setActiveTab}
            options={TABS}
          />

          <div className="flex items-center gap-2">
            {activeTab === 'despesas' && (
              <Button
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsAddExpenseOpen(true)}
              >
                Nova Despesa
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={exportAtual}
            >
              Exportar CSV
            </Button>
          </div>
        </div>

        <div>
          {loading ? (
            <SkeletonTable rows={5} columns={5} />
          ) : activeTab === 'pendentes' ? (
            <PaymentTable orders={pendingOrders} mode="pending" onPaymentSuccess={fetchData} />
          ) : activeTab === 'recebidos' ? (
            <PaymentTable orders={paidOrders} mode="paid" onPaymentSuccess={fetchData} />
          ) : periodExpenses.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle />}
              title="Nenhuma despesa neste período"
              description="Cadastre custos fixos e variáveis para que o lucro líquido reflita a realidade."
              action={
                <Button
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddExpenseOpen(true)}
                >
                  Cadastrar despesa
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>Descrição</TH>
                  <TH>Categoria</TH>
                  <TH align="right">Valor</TH>
                  <TH align="right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {periodExpenses.map((exp) => {
                  const isRecorrente = Boolean(exp.recurrence && exp.recurrence !== 'Única');
                  return (
                    <TR key={exp.id}>
                      <TD numeric className="text-text-muted">
                        {exp.expense_date
                          ? new Date(exp.expense_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </TD>
                      <TD className="font-semibold max-w-[240px]">
                        <div className="flex flex-col gap-1">
                          <span className="truncate">{exp.description}</span>
                          {isRecorrente && (
                            <Badge tone="info" className="w-fit">
                              ⟳ {exp.recurrence}
                              {exp.end_date &&
                                ` até ${new Date(exp.end_date).toLocaleDateString('pt-BR')}`}
                            </Badge>
                          )}
                        </div>
                      </TD>
                      <TD>
                        <Badge>{exp.category}</Badge>
                      </TD>
                      <TD align="right" numeric className="font-semibold text-danger">
                        {fmtCurrency(Number(exp.amount))}
                      </TD>
                      <TD align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-1.5"
                            onClick={() => handleEditExpense(exp)}
                            title="Editar despesa"
                            aria-label={`Editar ${exp.description}`}
                          >
                            <Pencil className="w-4 h-4" aria-hidden />
                          </Button>

                          {isRecorrente && !exp.end_date && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-1.5 hover:text-warning"
                              onClick={() => handleEndRecurrence(exp)}
                              title="Encerrar recorrência"
                              aria-label={`Encerrar recorrência de ${exp.description}`}
                            >
                              <CalendarOff className="w-4 h-4" aria-hidden />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-1.5 hover:text-danger"
                            onClick={() => handleDeleteExpense(exp)}
                            title="Excluir despesa"
                            aria-label={`Excluir ${exp.description}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
