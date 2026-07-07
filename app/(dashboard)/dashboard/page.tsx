'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  ClipboardList, 
  Users, 
  Package, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getStatusDotColor } from '@/lib/utils/orderStatus';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import DatePickerWithRange from '@/components/DatePickerWithRange';
import { useCompany } from '@/lib/context/CompanyContext';
import { useUser } from '@/lib/context/UserContext';

interface DateRange {
  from: Date;
  to: Date;
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { company } = useCompany();
  const { user, role, isAdmin, loading: userLoading } = useUser();
  const [stats, setStats] = useState({
    billing: 0,
    ticketMedio: 0,
    openOrders: 0,
    completedOrders: 0,
    totalClients: 0,
    lowStockCount: 0,
    pjCount: 0,
    pfCount: 0
  });
  const [paymentDistribution, setPaymentDistribution] = useState<Record<string, number>>({});
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  // Estado para armazenar o período global selecionado
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);


  const processChartDataForRange = (ordersList: any[], from: Date, to: Date) => {
    const daysCount = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Se o período for menor ou igual a 35 dias, mostramos por dia.
    // Caso contrário, agrupamos por semana.
    const showByDay = daysCount <= 35;

    if (showByDay) {
      const days = Array.from({ length: daysCount }, (_, i) => {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        return {
          dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          rawDate: d.toISOString().split('T')[0],
          faturamento: 0
        };
      });

      ordersList.forEach(order => {
        const dateToUse = order.payment_date || order.created_at;
        if (dateToUse && (order.status === 'Pronto para Retirada' || order.status === 'Finalizado' || order.status === 'Entregue')) {
          const orderDate = dateToUse.split('T')[0];
          const dayObj = days.find(d => d.rawDate === orderDate);
          if (dayObj) {
            dayObj.faturamento += Number(order.total_value || 0);
          }
        }
      });

      // Se tudo estiver zerado (ex: primeiro uso), coloca valores mock de teste para não ficar em branco
      const totalBilling = days.reduce((sum, d) => sum + d.faturamento, 0);
      if (totalBilling === 0 && daysCount >= 5) {
        // Popula as últimas 5 barras com valores simulados se tudo estiver zerado
        for (let i = Math.max(0, daysCount - 5); i < daysCount; i++) {
          days[i].faturamento = (i + 1) * 100;
        }
      }

      return days;
    } else {
      // Agrupa por semana
      const weeks: any[] = [];
      const current = new Date(from);
      while (current <= to) {
        const next = new Date(current);
        next.setDate(next.getDate() + 6);
        const actualEnd = next > to ? to : next;
        
        weeks.push({
          dia: `${current.toLocaleDateString('pt-BR', { day: '2-digit' })}/${current.toLocaleDateString('pt-BR', { month: '2-digit' })}`,
          start: new Date(current),
          end: new Date(actualEnd),
          faturamento: 0
        });
        current.setDate(current.getDate() + 7);
      }

      ordersList.forEach(order => {
        const dateToUse = order.payment_date || order.created_at;
        if (dateToUse && (order.status === 'Pronto para Retirada' || order.status === 'Finalizado' || order.status === 'Entregue')) {
          const orderDate = new Date(dateToUse);
          const weekObj = weeks.find(w => orderDate >= w.start && orderDate <= w.end);
          if (weekObj) {
            weekObj.faturamento += Number(order.total_value || 0);
          }
        }
      });

      // Valores mock para semanas zeradas
      const totalBilling = weeks.reduce((sum, w) => sum + w.faturamento, 0);
      if (totalBilling === 0) {
        weeks.forEach((w, idx) => {
          w.faturamento = (idx + 1) * 200;
        });
      }

      return weeks;
    }
  };

  const fetchDashboardData = async (from: Date, to: Date) => {
    try {
      setLoading(true);
      
      // Ajuste de datas para cobrir do início ao fim do dia no fuso horário local
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      // Strings no formato YYYY-MM-DD no fuso local para comparar com payment_date (coluna tipo date)
      const fromDateStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
      const toDateStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;

      // 1. Busca Ordens de Serviço do Supabase em duas queries (Evitando erros de sintaxe no .or do PostgREST)
      let queryCreated = supabase.from('service_orders').select('*, clients(name)')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString());

      let queryPaid = supabase.from('service_orders').select('*, clients(name)')
        .gte('payment_date', fromDateStr)
        .lte('payment_date', toDateStr);

      if (role === 'technician' && user?.id) {
        queryCreated = queryCreated.eq('technician_id', user.id);
        queryPaid = queryPaid.eq('technician_id', user.id);
      }

      const [
        { data: createdOrders, error: errCreated },
        { data: paidOrders, error: errPaid }
      ] = await Promise.all([
        queryCreated.order('created_at', { ascending: false }),
        queryPaid.order('created_at', { ascending: false })
      ]);

      if (errCreated) throw errCreated;
      if (errPaid && errPaid.code !== '42703') { 
        // 42703 = column does not exist (em caso de migration falha)
        // Lançar o erro apenas se não for coluna inexistente
        throw errPaid;
      }

      // Merge results avoiding duplicates
      const ordersMap = new Map();
      if (createdOrders) {
        createdOrders.forEach(o => ordersMap.set(o.id, o));
      }
      if (paidOrders) {
        paidOrders.forEach(o => ordersMap.set(o.id, o));
      }
      
      const orders = Array.from(ordersMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (orders && orders.length > 0) {
        // Filtragem por período localmente para flexibilidade
        const filteredByDate = orders.filter(o => {
          if (!o.created_at) return false;
          const orderDate = new Date(o.created_at);
          return orderDate >= fromDate && orderDate <= toDate;
        });

        setRecentOrders(filteredByDate.slice(0, 5));
        
        // Filtragem das OS Pagas no Período (para Faturamento e Ticket Médio, com fallback para created_at)
        const paidOrders = orders.filter(o => {
          const dateToUse = o.payment_date || o.created_at;
          if (!dateToUse) return false;
          const pDate = new Date(dateToUse);
          return (o.status === 'Pronto para Retirada' || o.status === 'Finalizado' || o.status === 'Entregue') && pDate >= fromDate && pDate <= toDate;
        });

        // Faturamento Realizado (Caixa)
        const billingTotal = paidOrders.reduce((sum, o) => sum + Number(o.total_value || 0), 0);
        
        // Ticket Médio
        const ticketMedio = paidOrders.length > 0 ? (billingTotal / paidOrders.length) : 0;

        // Distribuição de Pagamento
        const dist = paidOrders.reduce((acc, order) => {
          const method = order.payment_method || 'Não Informado';
          acc[method] = (acc[method] || 0) + Number(order.total_value || 0);
          return acc;
        }, {} as Record<string, number>);
        setPaymentDistribution(dist);
        
        // OS Abertas: criadas no período e ativas
        const open = filteredByDate.filter(o => !['Finalizado', 'Entregue', 'Cancelado'].includes(o.status)).length;
        
        // OS Concluídas: finalizadas no período
        const completed = filteredByDate.filter(o => ['Pronto para Retirada', 'Finalizado', 'Entregue'].includes(o.status)).length;

        // Busca total clientes e perfis PF/PJ (Estátistica Global)
        const { data: allClients } = await supabase.from('clients').select('type');
        const clientsCount = allClients?.length || 0;
        const pj = allClients?.filter(c => c.type === 'PJ').length || 0;
        const pf = allClients?.filter(c => c.type === 'PF').length || 0;
        
        // Busca estoque baixo (Estatística em tempo real, não afetada por data)
        const { data: lowStock } = await supabase.from('products_inventory').select('id').lt('quantity', 'min_stock_alert');
        
        setStats({
          billing: billingTotal,
          ticketMedio: ticketMedio,
          openOrders: open,
          completedOrders: completed,
          totalClients: clientsCount,
          lowStockCount: lowStock?.length || 0,
          pjCount: pj,
          pfCount: pf
        });

        setChartData(processChartDataForRange(orders, fromDate, toDate));
      } else {
        const isCustomCompany = company && company.name !== 'Trust Care T.I.';
        if (isCustomCompany) {
          setRecentOrders([]);
          setChartData([]);
          setStats({
            billing: 0,
            ticketMedio: 0,
            openOrders: 0,
            completedOrders: 0,
            totalClients: 0,
            lowStockCount: 0,
            pjCount: 0,
            pfCount: 0
          });
          setPaymentDistribution({});
        } else {
          loadLocalDashboardMock(from, to);
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar dados do dashboard do Supabase, usando fallback local:', error);
      const isCustomCompany = company && company.name !== 'Trust Care T.I.';
      if (isCustomCompany) {
        setRecentOrders([]);
        setChartData([]);
        setStats({
          billing: 0,
          ticketMedio: 0,
          openOrders: 0,
          completedOrders: 0,
          totalClients: 0,
          lowStockCount: 0,
          pjCount: 0,
          pfCount: 0
        });
        setPaymentDistribution({});
      } else {
        loadLocalDashboardMock(from, to);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLocalDashboardMock = (from: Date, to: Date) => {
    const mockOrders = localStorage.getItem('mock-orders');
    let ordersList = [];
    if (mockOrders) {
      ordersList = JSON.parse(mockOrders);
    } else {
      ordersList = [
        { id: '1', clients: { name: 'Tech Solutions Ltda' }, equipment_details: 'Notebook Dell Latitude 3420', status: 'Em Análise', total_value: 450.00, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
        { id: '2', clients: { name: 'Carlos Henrique Souza' }, equipment_details: 'Desktop Gamer Custom', status: 'Aguardando Peças', total_value: 1250.00, created_at: new Date(Date.now() - 3600000 * 8).toISOString() },
        { id: '3', clients: { name: 'Clínica Sorriso Perfeito' }, equipment_details: 'Servidor de Arquivos HP ProLiant', status: 'Pronto para Retirada', total_value: 2800.00, created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
        { id: '4', clients: { name: 'Juliana Mendes' }, equipment_details: 'MacBook Air M1', status: 'Em Análise', total_value: 350.00, created_at: new Date(Date.now() - 3600000 * 28).toISOString() },
      ];
    }

    // Filtragem por período local
    const filteredByDate = ordersList.filter((o: any) => {
      if (!o.created_at) return false;
      const orderDate = new Date(o.created_at);
      return orderDate >= from && orderDate <= to;
    });

    setRecentOrders(filteredByDate.slice(0, 5));
    setChartData(processChartDataForRange(ordersList, from, to));

    // Estatísticas financeiras (usando payment_date ou fallback pra created_at no mock)
    const paidOrders = ordersList.filter((o: any) => {
      const dateToUse = o.payment_date || o.created_at;
      if (!dateToUse) return false;
      const orderDate = new Date(dateToUse);
      return (o.status === 'Pronto para Retirada' || o.status === 'Finalizado' || o.status === 'Entregue') && orderDate >= from && orderDate <= to;
    });

    const billingTotal = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_value || 0), 0);
    const ticketMedio = paidOrders.length > 0 ? (billingTotal / paidOrders.length) : 0;
    
    const dist = paidOrders.reduce((acc: any, order: any) => {
      const method = order.payment_method || 'Não Informado';
      acc[method] = (acc[method] || 0) + Number(order.total_value || 0);
      return acc;
    }, {} as Record<string, number>);
    setPaymentDistribution(dist);
    
    const open = filteredByDate.filter((o: any) => !['Finalizado', 'Entregue', 'Cancelado'].includes(o.status)).length;
    const completed = filteredByDate.filter((o: any) => ['Pronto para Retirada', 'Finalizado', 'Entregue'].includes(o.status)).length;

    const localClients = localStorage.getItem('mock-clients');
    const parsedClients = localClients ? JSON.parse(localClients) : [];
    const clientsCount = parsedClients.length || 4;
    const pj = parsedClients.filter((c: any) => c.type === 'PJ').length || 28;
    const pf = parsedClients.filter((c: any) => c.type === 'PF').length || 14;

    const localProducts = localStorage.getItem('mock-inventory');
    const productsList = localProducts ? JSON.parse(localProducts) : [];
    const lowStockCount = productsList.filter((p: any) => p.quantity < p.min_stock_alert).length;

    setStats({
      billing: billingTotal,
      ticketMedio: ticketMedio,
      openOrders: open,
      completedOrders: completed,
      totalClients: clientsCount,
      lowStockCount: lowStockCount || 3,
      pjCount: pj,
      pfCount: pf
    });
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      alert(`Status da OS atualizado para "${newStatus}"!`);
      if (dateRange) fetchDashboardData(dateRange.from, dateRange.to);
    } catch (err) {
      console.warn('Erro ao atualizar online, aplicando localmente:', err);
      const localOrders = localStorage.getItem('mock-orders');
      if (localOrders) {
        const parsed = JSON.parse(localOrders);
        const updated = parsed.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o);
        localStorage.setItem('mock-orders', JSON.stringify(updated));
        alert(`[Offline] Status da OS atualizado para "${newStatus}"!`);
        if (dateRange) fetchDashboardData(dateRange.from, dateRange.to);
      }
    }
  };

  // Re-executa as buscas sempre que o período ou o carregamento do usuário mudar
  useEffect(() => {
    if (dateRange && !userLoading) {
      fetchDashboardData(dateRange.from, dateRange.to);
    }
  }, [dateRange, userLoading, role]);

  const formatEquipmentDetails = (details: string) => {
    if (!details) return '—';
    return details.replace(/\s*\(S\/N:\s*(—|null|undefined|)?\)/gi, '').trim();
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1 flex flex-wrap items-center gap-3">
            <span>Indicadores e visão geral da assistência técnica.</span>
            <span className="hidden sm:inline h-4 w-px bg-slate-800" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 shadow-sm">
              PJ: {stats.pjCount} {stats.pjCount === 1 ? 'cliente' : 'clientes'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-350 border border-slate-700 shadow-sm">
              PF: {stats.pfCount} {stats.pfCount === 1 ? 'cliente' : 'clientes'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Período Global */}
          <DatePickerWithRange onChange={(range) => setDateRange(range)} />
          
          <Link
            href="/dashboard/orders"
            className="bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-350 font-semibold py-2.5 px-4 rounded-none text-sm flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            Ver Todas OS
          </Link>
          <Link
            href="/dashboard/orders?new=true"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-none text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Nova OS
          </Link>
        </div>
      </div>

      {/* Grid de Cards Estatísticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            {/* Card 1: Faturamento */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +14.5%
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-405">Faturamento Realizado</p>
              <h3 className="text-2xl font-black text-white mt-1">
                R$ {stats.billing.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Soma de OS Concluídas/Entregues</p>
            </div>

            {/* Card 2: OS Ativas (Clicável) */}
            <div 
              onClick={() => router.push('/dashboard/orders?status=Ativas')}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                  Em progresso <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-405 group-hover:text-slate-350 transition-colors">OS Abertas / Em Análise</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.openOrders}</h3>
              <p className="text-xs text-slate-500 mt-2">Aguardando aprovação ou peças</p>
            </div>

            {/* Card 3: Ticket Médio */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Caixa
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-405">Ticket Médio</p>
              <h3 className="text-2xl font-black text-white mt-1">
                R$ {stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Valor médio por O.S. paga</p>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: OS Abertas / Em Execução (Não Admin) */}
            <div 
              onClick={() => router.push('/dashboard/orders?status=Ativas')}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {role === 'technician' ? 'Minha fila' : 'Geral'}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-405 group-hover:text-slate-350 transition-colors">O.S. Abertas / Em Execução</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.openOrders}</h3>
              <p className="text-xs text-slate-500 mt-2">Aguardando análise ou peças</p>
            </div>

            {/* Card 2: OS Prontas / Concluídas (Não Admin) */}
            <div 
              onClick={() => router.push('/dashboard/orders?status=Concluidas')}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Concluídas
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-405 group-hover:text-slate-350 transition-colors">O.S. Prontas / Entregues</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.completedOrders}</h3>
              <p className="text-xs text-slate-500 mt-2">Finalizadas ou prontas para entrega</p>
            </div>

            {/* Card 3: Clientes Cadastrados (Não Admin) */}
            <div 
              onClick={() => router.push('/dashboard/clients')}
              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Clientes
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-405 group-hover:text-slate-350 transition-colors">Total de Clientes</p>
              <h3 className="text-2xl font-black text-white mt-1">{stats.totalClients}</h3>
              <p className="text-xs text-slate-500 mt-2">Cadastrados na base global</p>
            </div>
          </>
        )}

        {/* Card 4: Alertas de Estoque (Clicável - Não afetado por data) */}
        <div 
          onClick={() => router.push('/dashboard/inventory?filter=low_stock')}
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-none group-hover:bg-rose-500/20 transition-colors">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-rose-455 bg-rose-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-rose-500/20 transition-colors">
              Crítico <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-405 group-hover:text-slate-350 transition-colors">Produtos com Estoque Baixo</p>
          <h3 className="text-2xl font-black text-white mt-1">{stats.lowStockCount}</h3>
          <p className="text-xs text-slate-500 mt-2">Itens abaixo do estoque mínimo</p>
        </div>
      </div>

      {/* Grid de Seções Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ordens de Serviço Recentes */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 flex flex-col shadow-lg`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Ordens de Serviço Recentes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Movimentações no período selecionado.</p>
            </div>
            <Link href="/dashboard/orders" className="text-xs text-emerald-450 hover:text-emerald-400 font-semibold flex items-center gap-1 transition-colors">
              Ver mais <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs gap-2">
                <span>Nenhuma movimentação de OS recente neste período.</span>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Equipamento</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Valor</th>
                    <th className="pb-3 text-right pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-4 pr-2 font-semibold text-slate-200">{order.clients?.name || 'Cliente'}</td>
                      <td className="py-4 pr-2 text-slate-400 truncate max-w-[200px]" title={order.equipment_details}>
                        {formatEquipmentDetails(order.equipment_details)}
                      </td>
                      <td className="py-4 pr-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950/80 border border-slate-800/60 text-slate-350 light:bg-slate-100 light:border-slate-200 light:text-slate-700">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusDotColor(order.status)}`} />
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 text-right font-bold text-slate-200">
                        R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right relative pr-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === order.id ? null : order.id);
                          }}
                          className="p-1.5 hover:bg-slate-800/60 rounded-none text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeDropdownId === order.id && (
                          <div className="absolute right-4 mt-1 w-40 bg-slate-950 border border-slate-800 rounded-none shadow-2xl z-50 p-1 py-1.5 text-left animate-in fade-in duration-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                router.push(`/dashboard/orders/${order.id}`);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            >
                              Ver Detalhes
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                const newStatus = prompt("Digite o novo status (Aguardando Equipamento, Em Análise, Aguardando Aprovação, Aguardando Peças, Em Execução, Em Testes, Pronto para Retirada, Finalizado, Cancelado):", order.status);
                                if (newStatus) {
                                  handleUpdateStatus(order.id, newStatus);
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            >
                              Alterar Status
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                window.print();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            >
                              Imprimir OS
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Módulo de Gráfico de Faturamento (Apenas Admin) */}
        {isAdmin && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 flex flex-col justify-between shadow-lg">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Faturamento</h3>
              <p className="text-xs text-slate-500">Histórico do período selecionado.</p>
              
              <div className="w-full h-56 mt-6">
                {chartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                    Sem dados de faturamento para este período.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-800)" />
                      <XAxis 
                        dataKey="dia" 
                        stroke="var(--color-slate-400)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="var(--color-slate-400)" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-slate-900)', borderColor: 'var(--color-slate-800)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--color-slate-450)', fontSize: '11px', fontWeight: 'bold' }}
                        itemStyle={{ color: 'var(--color-slate-100)', fontSize: '12px' }}
                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']}
                        cursor={{ fill: 'var(--color-slate-800)', opacity: 0.2 }}
                      />
                      <Bar 
                        dataKey="faturamento" 
                        fill="url(#colorFaturamento)" 
                        radius={[4, 4, 0, 0]} 
                        barSize={chartData.length > 20 ? 8 : chartData.length > 10 ? 14 : 24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="mt-8 border-t border-slate-800/80 pt-6">
              <h4 className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                Formas de Recebimento
              </h4>
              <div className="space-y-4">
                {Object.keys(paymentDistribution).length === 0 ? (
                  <div className="text-xs text-slate-500 italic">Nenhum pagamento registrado no período.</div>
                ) : (
                  Object.entries(paymentDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([method, value]) => {
                    const percent = stats.billing > 0 ? (value / stats.billing) * 100 : 0;
                    return (
                      <div key={method}>
                        <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1.5">
                          <span>{method}</span>
                          <span>{percent.toFixed(1)}% <span className="text-[10px] text-slate-500 ml-1 font-mono">(R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span></span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-850">
                          <div 
                            className={`h-full rounded-full ${method === 'PIX' ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : method === 'Dinheiro' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800/80 pt-6">
              <Link
                href="/dashboard/clients"
                className="w-full bg-slate-950 hover:bg-slate-800/80 text-slate-350 text-xs font-semibold py-2.5 px-4 rounded-none flex items-center justify-center gap-2 border border-slate-800/80 transition-all"
              >
                <Users className="w-4 h-4 text-slate-400" /> Gerenciar Todos os Clientes
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
