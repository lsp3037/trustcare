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
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/context/UserContext';
import { useRouter } from 'next/navigation';
import DatePickerWithRange from '@/components/DatePickerWithRange';
import { KpiCard } from './_components/KpiCard';
import { PaymentTable } from './_components/PaymentTable';
import { FinanceiroBarChart, FinanceiroPieChart } from './_components/FinanceiroChart';
import { exportToCsv } from '@/lib/utils/exportCsv';
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

  const defaultFrom = new Date();
  defaultFrom.setDate(1);
  const defaultTo = new Date();

  const [dateRange, setDateRange] = useState<DateRange>({ from: defaultFrom, to: defaultTo });
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'recebidos' | 'despesas'>('pendentes');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

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

  // Excluir despesa
  const handleDeleteExpense = async (id: string) => {
    const confirmDelete = window.confirm('Deseja realmente excluir esta despesa?');
    if (!confirmDelete) return;

    try {
      const baseId = id.includes('-proj-') ? id.split('-proj-')[0] : id;
      const { error } = await supabase
        .from('company_expenses')
        .delete()
        .eq('id', baseId);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Erro ao excluir despesa: ${err.message}`);
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

  if (userLoading || (!isAdmin && !userLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <AddExpenseModal
          onClose={() => setIsAddExpenseOpen(false)}
          onSuccess={fetchData}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Financeiro</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle de fluxo de caixa, custos de peças e lucratividade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-none transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <DatePickerWithRange onChange={setDateRange} />
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Faturamento (Caixa)"
          value={loading ? '...' : fmtCurrency(receitaRecebida)}
          subtitle={`${paidOrders.length} OS pagas no período`}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <KpiCard
          title="Custos Operacionais"
          value={loading ? '...' : fmtCurrency(totalCustos)}
          subtitle={`Peças: ${fmtCurrency(totalPartsCost)} | Despesas: ${fmtCurrency(totalGeneralExpenses)}`}
          icon={TrendingUp}
          accentColor="rose"
        />
        <KpiCard
          title="Lucro Líquido"
          value={loading ? '...' : fmtCurrency(lucroLiquido)}
          subtitle="Faturamento - Custos acumulados"
          icon={DollarSign}
          accentColor={lucroLiquido >= 0 ? 'emerald' : 'rose'}
        />
        <KpiCard
          title="A Receber"
          value={loading ? '...' : fmtCurrency(aReceber)}
          subtitle={`${pendingOrders.length} OS pendentes`}
          icon={Clock}
          accentColor="amber"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-none p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Comparativo Faturamento vs Custos
          </h2>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <FinanceiroBarChart data={barData} />
          )}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-none p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Faturamento por Forma de Pagamento
          </h2>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <FinanceiroPieChart data={pieData} />
          )}
        </div>
      </div>

      {/* ── Tabs: Pendentes / Recebidos / Despesas Gerais ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-none">
        {/* Tab bar */}
        <div className="flex border-b border-slate-800 overflow-x-auto">
          {(['pendentes', 'recebidos', 'despesas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'pendentes'
                ? `A Receber (${pendingOrders.length})`
                : tab === 'recebidos'
                  ? `Faturamento Recebido (${paidOrders.length})`
                  : `Despesas Gerais (${periodExpenses.length})`}
            </button>
          ))}
          <div className="ml-auto flex items-center px-4 gap-2 py-2 sm:py-0">
            {activeTab === 'despesas' && (
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center gap-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-3 py-1.5 rounded-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Despesa
              </button>
            )}
            <button
              onClick={
                activeTab === 'pendentes'
                  ? handleExportPending
                  : activeTab === 'recebidos'
                    ? handleExportPaid
                    : handleExportExpenses
              }
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-none transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'pendentes' ? (
            <PaymentTable
              orders={pendingOrders}
              mode="pending"
              onPaymentSuccess={fetchData}
            />
          ) : activeTab === 'recebidos' ? (
            <PaymentTable
              orders={paidOrders}
              mode="paid"
              onPaymentSuccess={fetchData}
            />
          ) : (
            /* Despesas Gerais Table */
            <div className="overflow-x-auto">
              {periodExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                  <AlertTriangle className="w-8 h-8 opacity-30 text-rose-500" />
                  <p className="text-sm">Nenhuma despesa geral registrada neste período.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-400 text-xs font-medium">
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-semibold truncate max-w-[200px]">
                          <div className="flex flex-col gap-0.5">
                            <span>{exp.description}</span>
                            {exp.recurrence && exp.recurrence !== 'Única' && (
                              <span className="text-[9px] text-rose-400 font-mono font-semibold uppercase tracking-wider">
                                ⟳ {exp.recurrence}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-semibold px-2 py-0.5 border border-slate-700 bg-slate-800/80 text-slate-300 rounded-none">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-400 tabular-nums">
                          {fmtCurrency(Number(exp.amount))}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-slate-500 hover:text-rose-500 transition-colors p-1 rounded-none"
                            title="Excluir Despesa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
