'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';
import { useUser } from '@/lib/context/UserContext';
import { useToast } from '@/components/ui';
import { toLocalYMD, toBrazilianDate } from '@/lib/utils/dates';

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
  const toast = useToast();
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
        const rawDate = toLocalYMD(d);
        return {
          dia: toBrazilianDate(rawDate).slice(0, 5),
          rawDate,
          faturamento: 0
        };
      });

      ordersList.forEach(order => {
        const dateToUse = order.payment_date ? toLocalYMD(order.payment_date) : toLocalYMD(order.created_at);
        if (dateToUse && (order.status === 'Pronto para Retirada' || order.status === 'Finalizado')) {
          const dayObj = days.find(d => d.rawDate === dateToUse);
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
          dia: `${toBrazilianDate(current).slice(0, 5)}`,
          start: toLocalYMD(current),
          end: toLocalYMD(actualEnd),
          faturamento: 0
        });
        current.setDate(current.getDate() + 7);
      }

      ordersList.forEach(order => {
        const dateToUse = order.payment_date ? toLocalYMD(order.payment_date) : toLocalYMD(order.created_at);
        if (dateToUse && (order.status === 'Pronto para Retirada' || order.status === 'Finalizado')) {
          const weekObj = weeks.find(w => dateToUse >= w.start && dateToUse <= w.end);
          if (weekObj) {
            weekObj.faturamento += Number(order.total_value || 0);
          }
        }
      });

      return weeks;
    }
  };

  const fetchDashboardData = async (from: Date, to: Date) => {
    try {
      setLoading(true);
      
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const fromDateStr = toLocalYMD(fromDate);
      const toDateStr = toLocalYMD(toDate);

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
        { data: paidOrders, error: errPaid },
        { data: allClients },
        { data: allProducts }
      ] = await Promise.all([
        queryCreated.order('created_at', { ascending: false }),
        queryPaid.order('created_at', { ascending: false }),
        supabase.from('clients').select('type'),
        supabase.from('products_inventory').select('quantity, min_stock_alert')
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
          const dStr = toLocalYMD(o.created_at);
          return dStr >= fromDateStr && dStr <= toDateStr;
        });

        setRecentOrders(filteredByDate.slice(0, 5));
        
        const actuallyPaidOrders = orders.filter(o => {
          const dateToUse = o.payment_date ? toLocalYMD(o.payment_date) : toLocalYMD(o.created_at);
          if (!dateToUse) return false;
          return (o.status === 'Pronto para Retirada' || o.status === 'Finalizado') && dateToUse >= fromDateStr && dateToUse <= toDateStr;
        });

        const billingTotal = actuallyPaidOrders.reduce((sum, o) => sum + Number(o.total_value || 0), 0);
        const ticketMedio = actuallyPaidOrders.length > 0 ? (billingTotal / actuallyPaidOrders.length) : 0;

        const dist = actuallyPaidOrders.reduce((acc, order) => {
          const method = order.payment_method || 'Não Informado';
          acc[method] = (acc[method] || 0) + Number(order.total_value || 0);
          return acc;
        }, {} as Record<string, number>);
        setPaymentDistribution(dist);
        
        const open = filteredByDate.filter(o => !['Finalizado', 'Cancelado'].includes(o.status)).length;
        const completed = filteredByDate.filter(o => ['Pronto para Retirada', 'Finalizado'].includes(o.status)).length;

        const clientsCount = allClients?.length || 0;
        const pj = allClients?.filter(c => c.type === 'PJ').length || 0;
        const pf = allClients?.filter(c => c.type === 'PF').length || 0;
        
        const lowStockCount = allProducts?.filter(p => Number(p.min_stock_alert) > 0 && Number(p.quantity) <= Number(p.min_stock_alert)).length || 0;
        
        setStats({
          billing: billingTotal,
          ticketMedio: ticketMedio,
          openOrders: open,
          completedOrders: completed,
          totalClients: clientsCount,
          lowStockCount,
          pjCount: pj,
          pfCount: pf
        });

        setChartData(processChartDataForRange(orders, fromDate, toDate));
      } else {
        setRecentOrders([]);
        setChartData([]);
        setStats({
          billing: 0,
          ticketMedio: 0,
          openOrders: 0,
          completedOrders: 0,
          totalClients: allClients?.length || 0,
          lowStockCount: allProducts?.filter(p => Number(p.min_stock_alert) > 0 && Number(p.quantity) <= Number(p.min_stock_alert)).length || 0,
          pjCount: allClients?.filter(c => c.type === 'PJ').length || 0,
          pfCount: allClients?.filter(c => c.type === 'PF').length || 0
        });
        setPaymentDistribution({});
      }
    } catch (error: any) {
      console.warn('Erro ao carregar dados do dashboard do Supabase:', error);
      toast.error('Erro ao atualizar painel', {
        description: error?.message || 'Falha na comunicação com o banco de dados.'
      });
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
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.rpc('change_order_status', {
        order_id: orderId,
        new_status: newStatus,
      });

      if (error) throw error;

      toast.success(`OS movida para "${newStatus}"`);
      if (dateRange) fetchDashboardData(dateRange.from, dateRange.to);
    } catch (err: any) {
      console.warn('Erro ao atualizar status da OS:', err);
      toast.error('Transição não permitida', {
        description: err?.message || 'Não foi possível mover a OS para esta coluna.',
      });
      if (dateRange) fetchDashboardData(dateRange.from, dateRange.to);
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
