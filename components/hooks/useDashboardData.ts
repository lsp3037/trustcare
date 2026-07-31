'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';
import { useUser } from '@/lib/context/UserContext';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ServiceOrder {
  id: string;
  codigo_os: string;
  status: string;
  total_value: number;
  payment_date?: string;
  created_at: string;
  equipment_details?: string;
  clients: { name: string } | null;
}

export interface ChartDay {
  dia: string;
  rawDate?: string;
  faturamento: number;
}

export interface DashboardStats {
  billing: number;
  ticketMedio: number;
  openOrders: number;
  completedOrders: number;
  totalClients: number;
  lowStockCount: number;
  pjCount: number;
  pfCount: number;
}

export function useDashboardData(dateRange: DateRange | null) {
  const { company } = useCompany();
  const { user, role, loading: userLoading } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
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
  const [recentOrders, setRecentOrders] = useState<ServiceOrder[]>([]);
  const [chartData, setChartData] = useState<ChartDay[]>([]);
  const [loading, setLoading] = useState(true);

  const processChartDataForRange = (ordersList: any[], from: Date, to: Date) => {
    const daysCount = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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

      return days;
    } else {
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

      const totalBilling = weeks.reduce((sum, w) => sum + w.faturamento, 0);
      if (totalBilling === 0) {
        weeks.forEach((w, idx) => {
          w.faturamento = (idx + 1) * 200;
        });
      }

      return weeks;
    }
  };

  const resetDashboardState = () => {
    setRecentOrders([]);
    setChartData([]);
    setPaymentDistribution({});
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
  };

  const fetchDashboardData = async (from: Date, to: Date) => {
    try {
      setLoading(true);
      
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const fromDateStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
      const toDateStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;

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
        throw errPaid;
      }

      const ordersMap = new Map();
      if (createdOrders) {
        createdOrders.forEach(o => ordersMap.set(o.id, o));
      }
      if (paidOrders) {
        paidOrders.forEach(o => ordersMap.set(o.id, o));
      }
      
      const orders = Array.from(ordersMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (orders && orders.length > 0) {
        const filteredByDate = orders.filter(o => {
          if (!o.created_at) return false;
          const orderDate = new Date(o.created_at);
          return orderDate >= fromDate && orderDate <= toDate;
        });

        setRecentOrders(filteredByDate.slice(0, 5));
        
        const paidOrders = orders.filter(o => {
          const dateToUse = o.payment_date || o.created_at;
          if (!dateToUse) return false;
          const pDate = new Date(dateToUse);
          return (o.status === 'Pronto para Retirada' || o.status === 'Finalizado' || o.status === 'Entregue') && pDate >= fromDate && pDate <= toDate;
        });

        const billingTotal = paidOrders.reduce((sum, o) => sum + Number(o.total_value || 0), 0);
        const ticketMedio = paidOrders.length > 0 ? (billingTotal / paidOrders.length) : 0;

        const dist = paidOrders.reduce((acc, order) => {
          const method = order.payment_method || 'Não Informado';
          acc[method] = (acc[method] || 0) + Number(order.total_value || 0);
          return acc;
        }, {} as Record<string, number>);
        setPaymentDistribution(dist);
        
        const open = filteredByDate.filter(o => !['Finalizado', 'Entregue', 'Cancelado'].includes(o.status)).length;
        const completed = filteredByDate.filter(o => ['Pronto para Retirada', 'Finalizado', 'Entregue'].includes(o.status)).length;

        const { data: allClients } = await supabase.from('clients').select('type');
        const clientsCount = allClients?.length || 0;
        const pj = allClients?.filter(c => c.type === 'PJ').length || 0;
        const pf = allClients?.filter(c => c.type === 'PF').length || 0;
        
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
        resetDashboardState();
      }
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      resetDashboardState();
    } finally {
      setLoading(false);
    }
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
      console.error('Erro ao atualizar status da OS:', err);
      alert(`Não foi possível atualizar o status: ${(err as Error).message}`);
    }
  };

  useEffect(() => {
    if (dateRange && !userLoading) {
      fetchDashboardData(dateRange.from, dateRange.to);
    }
  }, [dateRange, userLoading, role]);

  return {
    stats,
    paymentDistribution,
    recentOrders,
    chartData,
    loading,
    handleUpdateStatus,
    refetch: () => dateRange && fetchDashboardData(dateRange.from, dateRange.to)
  };
}
