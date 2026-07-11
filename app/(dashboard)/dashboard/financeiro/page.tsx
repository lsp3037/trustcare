'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/lib/context/UserContext';
import { useRouter } from 'next/navigation';
import DatePickerWithRange from '@/components/DatePickerWithRange';
import { KpiCard } from './_components/KpiCard';
import { PaymentTable } from './_components/PaymentTable';
import { FinanceiroBarChart, FinanceiroPieChart } from './_components/FinanceiroChart';
import { exportToCsv } from '@/lib/utils/exportCsv';

interface DateRange { from: Date; to: Date; }
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
}

// Raw shape returned by Supabase (joined table comes as array)
interface RawOrder extends Omit<Order, 'clients'> {
  clients?: { name: string } | { name: string }[] | null;
}

const PAID_STATUSES = ['Finalizado', 'Pronto para Retirada', 'Entregue'];

// Chart helpers ──────────────────────────────────────────────────────────────

function buildBarData(orders: Order[], from: Date, to: Date) {
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
      };
    });
    orders.forEach((o) => {
      const d = (o.payment_date || o.created_at)?.split('T')[0];
      const slot = days.find((x) => x.rawDate === d);
      if (slot && PAID_STATUSES.includes(o.status)) {
        slot.faturamento += Number(o.total_value || 0);
      }
    });
    return days;
  }

  // Group by week
  const weeks: { dia: string; from: Date; to: Date; faturamento: number }[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    const end = new Date(cur);
    end.setDate(end.getDate() + 6);
    weeks.push({
      dia: `${cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
      from: new Date(cur),
      to: end > to ? to : end,
      faturamento: 0,
    });
    cur.setDate(cur.getDate() + 7);
  }
  orders.forEach((o) => {
    if (!PAID_STATUSES.includes(o.status)) return;
    const d = new Date(o.payment_date || o.created_at);
    const slot = weeks.find((w) => d >= w.from && d <= w.to);
    if (slot) slot.faturamento += Number(o.total_value || 0);
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'recebidos'>('pendentes');

  // Redirect non-admins
  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('id, codigo_os, total_value, status, created_at, payment_date, payment_method, pago, clients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Supabase returns joined tables as arrays; normalize to object
      const normalized = ((data as RawOrder[]) ?? []).map((o) => ({
        ...o,
        clients: Array.isArray(o.clients) ? o.clients[0] : (o.clients ?? undefined),
      })) as Order[];
      setAllOrders(normalized);
    } catch (err) {
      console.warn('Financeiro: erro ao carregar OS', err);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  // OS concluídas no período (faturamento)
  const billedOrders = periodOrders.filter((o) => PAID_STATUSES.includes(o.status));

  // OS efetivamente pagas no período (caixa)
  const paidOrders = allOrders.filter(
    (o) => o.pago === true && inRange(o.payment_date || o.created_at) && PAID_STATUSES.includes(o.status)
  );

  // OS pendentes de pagamento (concluídas mas não pagas)
  const pendingOrders = allOrders.filter(
    (o) => PAID_STATUSES.includes(o.status) && !o.pago
  );

  const receitaBruta = billedOrders.reduce((s, o) => s + Number(o.total_value || 0), 0);
  const receitaRecebida = paidOrders.reduce((s, o) => s + Number(o.total_value || 0), 0);
  const aReceber = pendingOrders.reduce((s, o) => s + Number(o.total_value || 0), 0);
  const ticketMedio = paidOrders.length > 0 ? receitaRecebida / paidOrders.length : 0;

  const barData = buildBarData(paidOrders, dateRange.from, dateRange.to);
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
      'trustcare_pendentes'
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
      'trustcare_recebidos'
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
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Financeiro</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle de receitas e recebíveis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
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
          title="Receita Bruta"
          value={loading ? '...' : fmtCurrency(receitaBruta)}
          subtitle={`${billedOrders.length} OS concluídas`}
          icon={TrendingUp}
          accentColor="blue"
        />
        <KpiCard
          title="Receita Recebida"
          value={loading ? '...' : fmtCurrency(receitaRecebida)}
          subtitle={`${paidOrders.length} OS pagas`}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <KpiCard
          title="A Receber"
          value={loading ? '...' : fmtCurrency(aReceber)}
          subtitle={`${pendingOrders.length} OS pendentes`}
          icon={Clock}
          accentColor="amber"
        />
        <KpiCard
          title="Ticket Médio"
          value={loading ? '...' : fmtCurrency(ticketMedio)}
          subtitle="Por OS paga no período"
          icon={DollarSign}
          accentColor="rose"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-none p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Faturamento Recebido no Período
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
            Por Forma de Pagamento
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

      {/* ── Tabs: Pendentes / Recebidos ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-none">
        {/* Tab bar */}
        <div className="flex border-b border-slate-800">
          {(['pendentes', 'recebidos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'pendentes'
                ? `A Receber (${pendingOrders.length})`
                : `Recebidos (${paidOrders.length})`}
            </button>
          ))}
          <div className="ml-auto flex items-center px-4">
            <button
              onClick={activeTab === 'pendentes' ? handleExportPending : handleExportPaid}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-none transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'pendentes' ? (
            <PaymentTable
              orders={pendingOrders}
              mode="pending"
              onPaymentSuccess={() => fetchOrders()}
            />
          ) : (
            <PaymentTable orders={paidOrders} mode="paid" />
          )}
        </div>
      </div>
    </div>
  );
}
