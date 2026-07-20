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
  ExternalLink
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#020617] min-h-screen text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-500" />
            Agenda de Entregas & Prazos
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Acompanhe o cronograma de entrega das Ordens de Serviço organizadas por prazo planejado.
          </p>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center gap-2 border border-slate-800 bg-[#070a13] p-1.5 rounded-none">
          <button
            onClick={handlePrevMonth}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider px-3 text-slate-300 min-w-[120px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Grid do Calendário */}
      <div className="border border-slate-900 bg-[#070a13] overflow-hidden">
        {/* Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-slate-900 bg-[#04060b] text-center">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                className={`border-r border-b border-slate-900 p-2 flex flex-col justify-between transition-colors overflow-hidden ${
                  isCurrentMonth ? 'bg-transparent' : 'bg-slate-950/20 text-slate-700'
                } ${isToday ? 'bg-emerald-500/[0.02] border-emerald-500/20' : ''}`}
              >
                {/* Cabeçalho do Dia */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${
                    isToday 
                      ? 'bg-emerald-600 text-white w-5 h-5 flex items-center justify-center font-bold'
                      : isCurrentMonth ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    {date.getDate()}
                  </span>
                  {dayOrders.length > 0 && (
                    <span className="text-[9px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-none font-mono">
                      {dayOrders.length} OS
                    </span>
                  )}
                </div>

                {/* Eventos / OSs do Dia */}
                <div className="flex-1 mt-1.5 space-y-1 overflow-y-auto custom-scrollbar">
                  {dayOrders.map((os: any) => {
                    const isCompleted = os.status === 'Finalizado' || os.status === 'Pronto para Retirada';
                    return (
                      <div
                        key={os.id}
                        onClick={() => router.push(`/dashboard/orders/${os.id}`)}
                        className={`text-[10px] p-1 border cursor-pointer flex flex-col justify-between transition-all ${
                          isCompleted
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                            : os.priority === 'Alta'
                            ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-450'
                            : 'bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 text-blue-450'
                        }`}
                        title={`${os.codigo_os}: ${os.equipment_details}`}
                      >
                        <span className="font-bold font-mono tracking-tighter shrink-0">
                          {os.codigo_os || 'OS'}
                        </span>
                        <span className="truncate text-slate-400 font-medium">
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
      <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 border border-slate-900 bg-[#070a13] p-4">
        <span className="font-semibold text-slate-400 uppercase tracking-wider">Legenda:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 bg-emerald-500/10 border border-emerald-500/25" />
          <span>Pronto / Finalizado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 bg-rose-500/10 border border-rose-500/25" />
          <span>Prioridade Alta / Urgente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 bg-blue-500/10 border border-blue-500/25" />
          <span>Outros Status / Prazos</span>
        </div>
      </div>
    </div>
  );
}
