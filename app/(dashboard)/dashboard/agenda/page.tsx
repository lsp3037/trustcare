'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Chave YYYY-MM-DD no fuso local.
 *
 * `toISOString()` converte para UTC antes de cortar a string: no Brasil
 * (UTC-3) isso jogava toda OS com prazo até as 03:00 para o dia anterior no
 * calendário. Aqui a data é montada a partir dos componentes locais.
 */
function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

        const { data, error } = await supabase
          .from('service_orders')
          .select('id, codigo_os, equipment_details, delivery_prediction, status, priority')
          .not('delivery_prediction', 'is', null);

        if (error) {
          console.warn('Erro ao consultar Supabase, tentando local:', error.message);
        }

        let finalOrders = data || [];

        if (finalOrders.length === 0) {
          const localOrders = JSON.parse(localStorage.getItem('mock-orders') || '[]');
          finalOrders = localOrders.filter((o: any) => o.delivery_prediction);
        }

        setOrders(finalOrders);
      } catch {
        setErrorMsg('Não foi possível carregar a agenda.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handlePrevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const totalDaysPrev = new Date(year, month, 0).getDate();

  const daysGrid: Date[] = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push(new Date(year, month - 1, totalDaysPrev - i));
  }
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push(new Date(year, month, i));
  }
  const remaining = 42 - daysGrid.length;
  for (let i = 1; i <= remaining; i++) {
    daysGrid.push(new Date(year, month + 1, i));
  }

  const ordersByDate = orders.reduce((groups: Record<string, any[]>, os) => {
    if (!os.delivery_prediction) return groups;
    const key = dateKey(new Date(os.delivery_prediction));
    (groups[key] ||= []).push(os);
    return groups;
  }, {});

  const nextSevenDays = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return dateKey(d);
  });

  const upcomingOrders = orders
    .filter((os) => {
      if (!os.delivery_prediction) return false;
      const key = dateKey(new Date(os.delivery_prediction));
      return (
        nextSevenDays.includes(key) && os.status !== 'Finalizado' && os.status !== 'Cancelado'
      );
    })
    .sort(
      (a, b) =>
        new Date(a.delivery_prediction).getTime() - new Date(b.delivery_prediction).getTime(),
    );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CalendarIcon />}
        title="Agenda de Entregas & Prazos"
        description="Acompanhe o cronograma de entrega das Ordens de Serviço organizadas por prazo planejado."
        actions={
          <div className="flex items-center gap-1 bg-surface-sunken border border-border p-1 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
            </Button>
            <span
              className="text-small font-semibold px-3 text-text min-w-[150px] text-center"
              aria-live="polite"
            >
              {MONTHS[month]} {year}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday}>
              Hoje
            </Button>
          </div>
        }
      />

      {errorMsg && (
        <Card className="flex items-center gap-2.5 border-danger/25">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" aria-hidden />
          <p className="text-small font-semibold text-danger">{errorMsg}</p>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6" aria-busy="true" aria-label="Carregando agenda">
          <Card padding="none" className="xl:col-span-3 p-4">
            <Skeleton className="h-[560px] w-full" />
          </Card>
          <Card>
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <Card padding="none" className="overflow-hidden">
              <div className="grid grid-cols-7 border-b border-border bg-surface-sunken text-center">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-caption font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 auto-rows-[120px]">
                {daysGrid.map((date, idx) => {
                  const key = dateKey(date);
                  const dayOrders = ordersByDate[key] || [];
                  const isCurrentMonth = date.getMonth() === month;
                  const isToday = dateKey(new Date()) === key;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'border-r border-b border-border p-2.5 flex flex-col overflow-hidden',
                        !isCurrentMonth && 'bg-surface-sunken/40',
                        isToday && 'bg-brand/[0.04]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 shrink-0">
                        <span
                          className={cn(
                            'text-caption font-mono tabular-nums',
                            isToday
                              ? 'bg-brand text-brand-contrast w-6 h-6 flex items-center justify-center rounded-lg font-semibold'
                              : isCurrentMonth
                                ? 'text-text'
                                : 'text-text-subtle',
                          )}
                        >
                          {date.getDate()}
                        </span>
                        {dayOrders.length > 0 && (
                          <Badge className="text-caption px-1.5 py-0 font-mono tabular-nums">
                            {dayOrders.length}
                          </Badge>
                        )}
                      </div>

                      <div className="flex-1 mt-2 space-y-1.5 overflow-y-auto thin-scrollbar">
                        {dayOrders.map((os: any) => {
                          const isCompleted =
                            os.status === 'Finalizado' || os.status === 'Pronto para Retirada';
                          const isHighPriority = os.priority === 'Alta';

                          return (
                            <button
                              key={os.id}
                              type="button"
                              onClick={() => router.push(`/dashboard/orders/${os.id}`)}
                              title={`${os.codigo_os}: ${os.equipment_details}`}
                              className={cn(
                                'w-full text-left text-caption p-1.5 border rounded-lg cursor-pointer',
                                'flex flex-col gap-0.5 transition-colors',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                                isCompleted
                                  ? 'bg-success/5 hover:bg-success/10 border-success/25 text-success'
                                  : isHighPriority
                                    ? 'bg-danger/5 hover:bg-danger/10 border-danger/25 text-danger'
                                    : 'bg-info/5 hover:bg-info/10 border-info/25 text-info',
                              )}
                            >
                              <span className="font-semibold font-mono tabular-nums">
                                {os.codigo_os || 'OS'}
                              </span>
                              <span className="truncate text-text-muted">
                                {os.equipment_details}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card padding="sm" className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">
                Legenda
              </span>
              {[
                { className: 'bg-success/10 border-success/25', label: 'Pronto / Finalizado' },
                { className: 'bg-danger/10 border-danger/25', label: 'Urgente (prioridade alta)' },
                { className: 'bg-info/10 border-info/25', label: 'Prazo normal de bancada' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded border', item.className)} aria-hidden />
                  <span className="text-small text-text">{item.label}</span>
                </div>
              ))}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Clock className="w-4 h-4 text-text-subtle" aria-hidden />
                <h2 className="text-caption font-semibold uppercase tracking-wider text-text">
                  Próximos 7 dias
                </h2>
              </div>

              {upcomingOrders.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 />}
                  title="Sem prazos na semana"
                  description="Nenhuma OS ativa vence nos próximos 7 dias."
                />
              ) : (
                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 thin-scrollbar">
                  {upcomingOrders.map((os) => {
                    const dateLabel = new Date(os.delivery_prediction).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    });
                    const isHigh = os.priority === 'Alta';

                    return (
                      <button
                        key={os.id}
                        type="button"
                        onClick={() => router.push(`/dashboard/orders/${os.id}`)}
                        className={cn(
                          'w-full text-left p-3.5 border rounded-xl cursor-pointer',
                          'flex flex-col gap-2 transition-colors hover:border-border-strong',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                          isHigh ? 'bg-danger/5 border-danger/25' : 'bg-surface-sunken border-border',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-caption font-semibold font-mono tabular-nums text-text">
                            {os.codigo_os}
                          </span>
                          <span className="text-caption text-text-subtle flex items-center gap-1 font-mono tabular-nums shrink-0">
                            <Clock className="w-3 h-3" aria-hidden /> {dateLabel}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-small font-semibold text-text truncate">
                            {os.equipment_details}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {isHigh && <Badge tone="danger">Urgente</Badge>}
                            <StatusBadge status={os.status} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
