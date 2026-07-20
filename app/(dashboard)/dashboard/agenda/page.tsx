'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  Wrench,
  ExternalLink,
  ClipboardList,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function AgendaPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        // Busca OSs com previsão de entrega cadastrada
        const { data, error } = await supabase
          .from('service_orders')
          .select('id, codigo_os, equipment_details, delivery_prediction, status, priority')
          .not('delivery_prediction', 'is', null);

        if (error) {
          console.warn('Erro ao consultar Supabase, tentando local:', error.message);
        }

        let finalOrders = data || [];

        // Fallback local / offline
        if (finalOrders.length === 0) {
          const localOrdersStr = localStorage.getItem('mock-orders') || '[]';
          const localOrders = JSON.parse(localOrdersStr);
          finalOrders = localOrders.filter((o: any) => o.delivery_prediction);
        }

        setOrders(finalOrders);
      } catch (err: any) {
        setErrorMsg('Erro ao carregar agenda.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Navegação de Meses
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Lógica de Renderização dos Dias
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const totalDaysPrev = new Date(year, month, 0).getDate();

  const daysGrid: Date[] = [];

  // Preenche dias do mês anterior
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push(new Date(year, month - 1, totalDaysPrev - i));
  }

  // Preenche dias do mês atual
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push(new Date(year, month, i));
  }

  // Preenche dias do próximo mês para completar grid de 42 posições (6 semanas)
  const remaining = 42 - daysGrid.length;
  for (let i = 1; i <= remaining; i++) {
    daysGrid.push(new Date(year, month + 1, i));
  }

  // Agrupa OSs por data (YYYY-MM-DD)
  const ordersByDate = orders.reduce((groups: any, os) => {
    if (!os.delivery_prediction) return groups;
    const dateKey = new Date(os.delivery_prediction).toISOString().split('T')[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(os);
    return groups;
  }, {});

  // Filtra OSs urgentes ou próximas (vencimento nos próximos 7 dias)
  const todayStr = new Date().toISOString().split('T')[0];
  const nextSevenDays = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const upcomingOrders = orders
    .filter((os) => {
      if (!os.delivery_prediction) return false;
      const osDateStr = new Date(os.delivery_prediction).toISOString().split('T')[0];
      return nextSevenDays.includes(osDateStr) && os.status !== 'Finalizado' && os.status !== 'Cancelado';
    })
    .sort((a, b) => new Date(a.delivery_prediction).getTime() - new Date(b.delivery_prediction).getTime());

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-slate-950 min-h-screen text-slate-200 font-sans">
      {/* Header com Design Premium */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-emerald-500" />
            Agenda de Entregas & Prazos
          </h1>
          <p className="text-slate-400 text-xs">
            Acompanhe o cronograma de entrega das Ordens de Serviço organizadas por prazo planejado.
          </p>
        </div>

        {/* Controles de Navegação Flutuantes */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-none shadow-md">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-850 transition-all cursor-pointer rounded-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest px-4 text-slate-200 min-w-[140px] text-center font-mono">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-850 transition-all cursor-pointer rounded-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center gap-2.5 rounded-none">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Grid Layout Flexível: Calendário + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Lado Esquerdo: Calendário */}
        <div className="xl:col-span-3 space-y-6">
          <div className="border border-slate-800 bg-slate-900 shadow-sm overflow-hidden rounded-none">
            {/* Dias da Semana */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40 text-center">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-3 text-xs font-bold uppercase tracking-wider text-slate-450 border-r border-slate-800/30 last:border-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Grade de Dias */}
            <div className="grid grid-cols-7 grid-rows-6 auto-rows-[120px]">
              {daysGrid.map((date, idx) => {
                const dateStr = date.toISOString().split('T')[0];
                const dayOrders = ordersByDate[dateStr] || [];
                const isCurrentMonth = date.getMonth() === month;
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <div
                    key={idx}
                    className={`border-r border-b border-slate-800 p-2.5 flex flex-col justify-between transition-colors overflow-hidden group ${
                      isCurrentMonth ? 'bg-transparent' : 'bg-slate-950/30 text-slate-600'
                    } ${isToday ? 'bg-emerald-500/[0.03]' : ''}`}
                  >
                    {/* Cabeçalho do Dia */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-mono ${
                        isToday 
                          ? 'bg-emerald-600 text-white w-6 h-6 flex items-center justify-center font-black rounded-none shadow-sm'
                          : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {date.getDate()}
                      </span>
                      {dayOrders.length > 0 && (
                        <span className="text-[9px] font-extrabold bg-slate-850 border border-slate-800 text-slate-350 px-1.5 py-0.5 rounded-none font-mono">
                          {dayOrders.length} OS
                        </span>
                      )}
                    </div>

                    {/* Lista de OS do Dia */}
                    <div className="flex-1 mt-2 space-y-1.5 overflow-y-auto custom-scrollbar">
                      {dayOrders.map((os: any) => {
                        const isCompleted = os.status === 'Finalizado' || os.status === 'Pronto para Retirada';
                        const isHighPriority = os.priority === 'Alta';
                        return (
                          <div
                            key={os.id}
                            onClick={() => router.push(`/dashboard/orders/${os.id}`)}
                            className={`text-[10px] p-1.5 border rounded-none cursor-pointer flex flex-col gap-0.5 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150 ${
                              isCompleted
                                ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : isHighPriority
                                ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-400'
                                : 'bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}
                            title={`${os.codigo_os}: ${os.equipment_details}`}
                          >
                            <span className="font-extrabold font-mono tracking-wider">
                              {os.codigo_os || 'OS'}
                            </span>
                            <span className="truncate text-slate-400 font-semibold leading-tight">
                              {os.equipment_details}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda de Status / Prioridades */}
          <div className="flex flex-wrap items-center gap-6 text-xs border border-slate-800 bg-slate-900 p-4 shadow-sm">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Legendas de Prazo:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500/10 border border-emerald-500/25" />
              <span className="text-slate-350">Pronto / Finalizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500/10 border border-rose-500/25" />
              <span className="text-slate-350">Urgente (Prioridade Alta)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500/10 border border-blue-500/25" />
              <span className="text-slate-350">Prazos de Bancada (Normal)</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Sidebar "Próximas OS" */}
        <div className="space-y-6">
          <div className="border border-slate-800 bg-slate-900 p-5 shadow-sm rounded-none">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Próximos 7 Dias</h2>
            </div>

            {upcomingOrders.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs italic space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-700 stroke-1" />
                <p>Nenhum prazo pendente para a próxima semana.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {upcomingOrders.map((os) => {
                  const dateLabel = new Date(os.delivery_prediction).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short'
                  });
                  const isHigh = os.priority === 'Alta';

                  return (
                    <div 
                      key={os.id}
                      onClick={() => router.push(`/dashboard/orders/${os.id}`)}
                      className={`p-3.5 border cursor-pointer hover:border-slate-700 transition-all duration-150 rounded-none flex flex-col gap-2 ${
                        isHigh ? 'bg-rose-500/[0.01] border-rose-950/30' : 'bg-slate-950/20 border-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold font-mono text-emerald-500">
                          {os.codigo_os}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {dateLabel}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-250 truncate">{os.equipment_details}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase ${
                            isHigh ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800/60 text-slate-400'
                          }`}>
                            {os.priority}
                          </span>
                          <span className="text-[9px] text-slate-450 truncate font-semibold">
                            {os.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
