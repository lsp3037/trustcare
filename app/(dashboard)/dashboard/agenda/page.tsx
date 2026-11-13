'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CalendarCheck, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Card, Skeleton } from '@/components/ui';
import { GLASS_PANEL } from '@/components/dashboard/glass';
import { cn } from '@/lib/utils';
import { toLocalYMD } from '@/lib/utils/dates';
import { addDays, startOfDay } from '@/lib/utils/period';
import s from './agenda.module.css';

interface AgendaOrder {
  id: string;
  codigo_os: string | null;
  equipment_details: string | null;
  delivery_prediction: string;
  status: string;
  priority: string | null;
  technician_id: string | null;
  clients?: { name: string } | { name: string }[] | null;
}

type Kind = 'urgente' | 'bancada' | 'espera' | 'pronto';

/** Cor de cada estado, pelos tokens do tema (Recharts/CSS resolvem var()). */
const KIND: Record<Kind, { color: string; label: string; chip: string }> = {
  urgente: { color: 'var(--color-danger)', label: 'Urgente', chip: 'urgente' },
  bancada: { color: 'var(--color-info)', label: 'Na bancada', chip: 'na bancada' },
  espera: { color: 'var(--color-warning)', label: 'Esperando cliente/peça', chip: 'esperando' },
  pronto: { color: 'var(--color-brand)', label: 'Pronto', chip: 'pronta' },
};

const DONE = ['Pronto para Retirada', 'Finalizado', 'Entregue'];
const WAITING = ['Aguardando Equipamento', 'Aguardando Aparelho', 'Aguardando Aprovação', 'Aguardando Peça', 'Aguardando Peças'];

function kindOf(o: AgendaOrder): Kind {
  if (DONE.includes(o.status)) return 'pronto';
  if (o.priority === 'Alta') return 'urgente';
  if (WAITING.includes(o.status)) return 'espera';
  return 'bancada';
}

const AVATAR_COLORS = ['var(--color-info)', 'var(--color-status-execucao)', 'var(--color-warning)', 'var(--color-status-testes)', 'var(--color-brand)'];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const monthName = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' });
const shortMonth = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

/** "8 – 14 nov 2026", ou "29 nov – 5 dez 2026" quando a semana vira o mês. */
function weekLabel(start: Date) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.getDate()} – ${end.getDate()} ${shortMonth(end)} ${end.getFullYear()}`
    : `${start.getDate()} ${shortMonth(start)} – ${end.getDate()} ${shortMonth(end)} ${end.getFullYear()}`;
}

const sundayOf = (d: Date) => addDays(startOfDay(d), -d.getDay());

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/** Texto que troca com um esmaecimento e blur, como no modelo. */
function SoftText({ text, className }: { text: string; className?: string }) {
  const [items, setItems] = useState([{ id: 0, text, state: 'in' as 'in' | 'out' }]);
  const seq = useRef(0);

  useEffect(() => {
    if (items[items.length - 1].text === text) return;
    const id = ++seq.current;
    setItems((prev) => [...prev.map((i) => ({ ...i, state: 'out' as const })), { id, text, state: 'out' as const }]);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, state: 'in' } : i)))),
    );
    const t = setTimeout(() => setItems((prev) => prev.filter((i) => i.id === id)), 220);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // Só reage a um texto novo.
  }, [text]);

  return (
    <span className={cn(s.soft, className)}>
      {items.map((i) => (
        <span key={i.id} data-state={i.state} aria-hidden={i.text !== text}>
          {i.text}
        </span>
      ))}
    </span>
  );
}

export default function AgendaPage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toLocalYMD(today);

  const [selected, setSelected] = useState<Date>(today);
  const [orders, setOrders] = useState<AgendaOrder[]>([]);
  const [techs, setTechs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const firstPill = useRef(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const [osRes, techRes] = await Promise.all([
          supabase
            .from('service_orders')
            .select('id, codigo_os, equipment_details, delivery_prediction, status, priority, technician_id, clients(name)')
            .not('delivery_prediction', 'is', null)
            .neq('status', 'Cancelado'),
          supabase.from('profiles').select('id, full_name'),
        ]);
        if (osRes.error) throw osRes.error;
        setOrders((osRes.data as AgendaOrder[]) ?? []);
        const map: Record<string, string> = {};
        ((techRes.data as { id: string; full_name: string | null }[]) ?? []).forEach((p) => {
          if (p.full_name) map[p.id] = p.full_name;
        });
        setTechs(map);
      } catch {
        setErrorMsg('Não foi possível carregar a agenda.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const byDay = useMemo(() => {
    const groups: Record<string, AgendaOrder[]> = {};
    orders.forEach((o) => {
      (groups[toLocalYMD(o.delivery_prediction)] ||= []).push(o);
    });
    const rank: Record<Kind, number> = { urgente: 0, bancada: 1, espera: 2, pronto: 3 };
    Object.values(groups).forEach((g) => g.sort((a, b) => rank[kindOf(a)] - rank[kindOf(b)]));
    return groups;
  }, [orders]);

  const overdue = useMemo(
    () =>
      orders
        .filter((o) => toLocalYMD(o.delivery_prediction) < todayKey && !DONE.includes(o.status))
        .sort((a, b) => toLocalYMD(a.delivery_prediction).localeCompare(toLocalYMD(b.delivery_prediction))),
    [orders, todayKey],
  );

  const weekStart = sundayOf(selected);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selIndex = selected.getDay();
  const dayOrders = byDay[toLocalYMD(selected)] ?? [];

  // Pílula: posiciona sob o dia escolhido; sem animação na primeira vez e no resize.
  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const tab = tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[selIndex];
      const pill = pillRef.current;
      if (!tab || !pill) return;
      if (!animate) pill.style.transition = 'none';
      pill.style.transform = `translateX(${tab.offsetLeft - 5}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      if (!animate) {
        void pill.offsetWidth;
        pill.style.transition = '';
      }
    };
    place(!firstPill.current);
    firstPill.current = false;
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [selIndex, loading]);

  const onTabsKey = (e: React.KeyboardEvent) => {
    const delta = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = addDays(selected, delta);
    setSelected(next);
    requestAnimationFrame(() =>
      tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next.getDay()]?.focus(),
    );
  };

  const isToday = (d: Date) => toLocalYMD(d) === todayKey;
  const lead = isToday(selected) ? `Hoje, ${WEEKDAY_FULL[selIndex].toLowerCase()}` : WEEKDAY_FULL[selIndex];
  const counts = dayOrders.reduce<Partial<Record<Kind, number>>>((acc, o) => {
    const k = kindOf(o);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const techName = (id: string | null) => (id ? techs[id] : undefined);
  const techColor = (id: string | null) => {
    if (!id) return 'var(--color-text-subtle)';
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  };
  const clientName = (o: AgendaOrder) => (Array.isArray(o.clients) ? o.clients[0]?.name : o.clients?.name);

  const renderOrder = (o: AgendaOrder, compact = false) => {
    const k = kindOf(o);
    const name = techName(o.technician_id);
    const lateDays = Math.round((today.getTime() - startOfDay(new Date(`${toLocalYMD(o.delivery_prediction)}T00:00:00`)).getTime()) / 86400000);
    const tag = k === 'urgente' ? `Urgente · ${o.status}` : o.status;
    return (
      <li key={o.id}>
        <Link
          href={`/dashboard/orders/${o.id}`}
          style={{ '--c': KIND[k].color } as React.CSSProperties}
          className={cn(
            s.os,
            'flex items-center rounded-2xl',
            compact ? 'gap-3 py-2.5 pl-2.5 pr-3' : 'gap-4 py-3.5 pl-3 pr-4',
            FOCUS,
          )}
        >
          <span className={cn(s.bar, 'shrink-0 self-stretch w-1 rounded-full')} aria-hidden />
          <div className="flex-1 min-w-0">
            <p className={cn('font-semibold text-text truncate', compact ? 'text-small' : 'text-body')}>
              {o.equipment_details || 'Equipamento não informado'}
            </p>
            <p className="text-caption text-text-muted truncate mt-0.5">
              <span className={cn('font-semibold tabular-nums', compact ? 'text-danger' : 'text-text')}>{o.codigo_os ?? 'OS'}</span>
              {compact
                ? ` · atrasada há ${lateDays} ${lateDays === 1 ? 'dia' : 'dias'}`
                : clientName(o)
                  ? ` · ${clientName(o)}`
                  : ''}
            </p>
          </div>
          {!compact && (
            <span className={cn(s.tag, 'hidden sm:inline-flex shrink-0 h-[26px] px-2.5 rounded-full items-center text-caption font-bold whitespace-nowrap')}>
              {tag}
            </span>
          )}
          {name ? (
            <span
              className={cn(s.avatar, 'shrink-0 w-[30px] h-[30px] rounded-full grid place-items-center text-caption font-bold text-text ring-1 ring-inset ring-white/10')}
              style={{ background: `color-mix(in srgb, ${techColor(o.technician_id)} 40%, var(--color-surface-raised))` }}
              title={`Técnico: ${name}`}
              aria-label={`Técnico: ${name}`}
            >
              {initials(name)}
            </span>
          ) : (
            <span
              className="shrink-0 w-[30px] h-[30px] rounded-full grid place-items-center text-text-subtle border border-dashed border-text-subtle/60"
              title="Sem técnico atribuído"
              aria-label="Sem técnico atribuído"
            >
              <UserRound className="w-3.5 h-3.5" aria-hidden />
            </span>
          )}
        </Link>
      </li>
    );
  };

  // Mini mês do dia escolhido
  const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const monthDays = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();

  return (
    <div className={cn(s.root, 'space-y-7')}>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text tracking-tight">Agenda de Entregas</h1>
          <p className="mt-1 text-small text-text-muted">O que precisa sair da bancada em cada dia da semana.</p>
        </div>
        <div className="flex items-center gap-1 h-11 p-1 rounded-full bg-surface-raised/90 border border-glass-border-strong self-start" role="group" aria-label="Semana">
          <button
            type="button"
            onClick={() => setSelected(addDays(selected, -7))}
            aria-label="Semana anterior"
            className={cn('w-[34px] h-[34px] rounded-full grid place-items-center text-text-muted hover:text-text hover:bg-surface-overlay cursor-pointer', FOCUS)}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </button>
          <span className="px-2 min-w-[150px] text-center text-small font-bold text-text tabular-nums" aria-live="polite">
            {weekLabel(weekStart)}
          </span>
          <button
            type="button"
            onClick={() => setSelected(addDays(selected, 7))}
            aria-label="Próxima semana"
            className={cn('w-[34px] h-[34px] rounded-full grid place-items-center text-text-muted hover:text-text hover:bg-surface-overlay cursor-pointer', FOCUS)}
          >
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSelected(today)}
            className={cn('h-[34px] px-3.5 rounded-full text-small font-bold text-text hover:bg-surface-overlay border-l border-glass-divider cursor-pointer', FOCUS)}
          >
            Hoje
          </button>
        </div>
      </div>

      {errorMsg && (
        <Card className="flex items-center gap-2.5 border-danger/25">
          <AlertCircle className="w-5 h-5 text-danger shrink-0" aria-hidden />
          <p className="text-small font-semibold text-danger">{errorMsg}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-7 items-start">
        {/* Cartão do dia */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          aria-label="Entregas do dia"
          className={cn(GLASS_PANEL, 'p-5 sm:p-7 flex flex-col gap-5 sm:gap-6')}
        >
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h2 className="text-[28px] sm:text-[34px] leading-tight font-semibold tracking-tight text-text">
                <SoftText text={lead} />
              </h2>
              <p className="flex text-small text-text-muted mt-1 whitespace-pre">
                <SoftText text={`${selected.getDate()} de ${monthName(selected)}`} />
                <span> · </span>
                <SoftText className="font-semibold text-text tabular-nums" text={String(dayOrders.length)} />
                <SoftText text={dayOrders.length === 1 ? ' entrega' : ' entregas'} />
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND) as Kind[])
                .filter((k) => counts[k])
                .map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-caption font-semibold text-text-muted bg-glass border border-glass-divider tabular-nums"
                  >
                    <i className="w-1.5 h-1.5 rounded-full" style={{ background: KIND[k].color }} aria-hidden />
                    {counts[k]} {KIND[k].chip}
                  </span>
                ))}
            </div>
          </header>

          <div
            ref={tabsRef}
            role="tablist"
            aria-label={`Semana de ${weekLabel(weekStart)}`}
            onKeyDown={onTabsKey}
            className={cn(s.tabs, 'bg-glass border border-glass-divider')}
          >
            <span ref={pillRef} className={s.pill} aria-hidden />
            {week.map((d, i) => {
              const list = byDay[toLocalYMD(d)] ?? [];
              const sel = i === selIndex;
              const td = isToday(d);
              return (
                <button
                  key={toLocalYMD(d)}
                  type="button"
                  role="tab"
                  aria-selected={sel}
                  aria-controls="agenda-dia"
                  tabIndex={sel ? 0 : -1}
                  aria-label={`${WEEKDAY_FULL[i]}, ${d.getDate()} de ${monthName(d)}, ${list.length} ${list.length === 1 ? 'entrega' : 'entregas'}`}
                  onClick={() => setSelected(d)}
                  className={cn(s.tab, 'h-[62px] sm:h-[72px] cursor-pointer', !sel && 'hover:bg-white/5', FOCUS)}
                >
                  <span className={cn('text-caption font-semibold uppercase tracking-wide', sel ? 'text-text-muted' : 'text-text-subtle')}>
                    {td ? 'Hoje' : WEEKDAY[i]}
                  </span>
                  <span className={cn('text-[18px] sm:text-[20px] leading-6 font-semibold tabular-nums', td ? 'text-brand-hover' : sel ? 'text-text' : 'text-text-muted')}>
                    {d.getDate()}
                  </span>
                  <span className="flex gap-[3px] h-1.5 mt-0.5" aria-hidden>
                    {list.slice(0, 4).map((o) => (
                      <i key={o.id} className="w-[5px] h-[5px] rounded-full" style={{ background: KIND[kindOf(o)].color }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-2.5" aria-busy="true" aria-label="Carregando entregas">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[70px] w-full rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          ) : (
            <div className={cn(s.pages, 'min-h-[300px]')} id="agenda-dia" role="tabpanel" aria-label={`Entregas de ${lead}`}>
              {week.map((d, i) => {
                const list = byDay[toLocalYMD(d)] ?? [];
                return (
                  <div
                    key={toLocalYMD(d)}
                    className={s.page}
                    data-on={i === selIndex ? '' : undefined}
                    aria-hidden={i !== selIndex}
                    style={{ '--dir': i < selIndex ? -1 : 1 } as React.CSSProperties}
                  >
                    {list.length > 0 ? (
                      <ul className="flex flex-col gap-2.5">{list.map((o) => renderOrder(o))}</ul>
                    ) : (
                      <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-1.5 text-center rounded-[18px] border border-dashed border-glass-divider px-6">
                        <CalendarCheck className="w-7 h-7 text-text-subtle mb-1" aria-hidden />
                        <p className="text-body font-semibold text-text">Nenhuma entrega</p>
                        <p className="text-small text-text-muted">Dia livre para adiantar a fila da bancada.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-5">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.06 }}
            aria-label="Entregas atrasadas"
            className={cn(GLASS_PANEL, 'p-5')}
          >
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.08em] text-text-muted">
                <i className={cn('w-[7px] h-[7px] rounded-full', overdue.length ? 'bg-danger shadow-[0_0_8px_var(--color-danger)]' : 'bg-brand')} aria-hidden />
                Atrasadas
              </h2>
              {overdue.length > 0 && (
                <span className="text-caption font-bold text-danger tabular-nums">{overdue.length} OS</span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-14 w-full rounded-2xl" />
            ) : overdue.length === 0 ? (
              <p className="flex items-center gap-2 text-small text-text-muted">
                <CheckCircle2 className="w-4 h-4 text-brand" aria-hidden /> Nenhuma entrega atrasada.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-[320px] overflow-y-auto thin-scrollbar">
                {overdue.map((o) => renderOrder({ ...o, priority: 'Alta' }, true))}
              </ul>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.12 }}
            aria-label="Mês"
            className={cn(GLASS_PANEL, 'p-5')}
          >
            <h2 className="text-caption font-bold uppercase tracking-[0.08em] text-text-muted mb-3.5">
              {monthName(selected)} {selected.getFullYear()}
            </h2>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => (
                <span key={i} className="text-caption font-bold text-text-subtle h-5" aria-hidden>
                  {w}
                </span>
              ))}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <span key={`e${i}`} aria-hidden />
              ))}
              {Array.from({ length: monthDays }).map((_, i) => {
                const d = new Date(selected.getFullYear(), selected.getMonth(), i + 1);
                const key = toLocalYMD(d);
                const list = byDay[key] ?? [];
                const inWeek = d >= weekStart && d <= addDays(weekStart, 6);
                const col = d.getDay();
                const first = list[0];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(d)}
                    aria-label={`${d.getDate()} de ${monthName(d)}, ${list.length} ${list.length === 1 ? 'entrega' : 'entregas'}`}
                    className={cn(
                      'relative h-[34px] text-small tabular-nums cursor-pointer transition-colors',
                      inWeek ? 'bg-brand/10 text-text' : 'text-text-muted hover:text-text hover:bg-surface-overlay rounded-[10px]',
                      inWeek && col === 0 && 'rounded-l-[10px]',
                      inWeek && col === 6 && 'rounded-r-[10px]',
                      isToday(d) && 'text-brand-hover font-bold',
                      key === toLocalYMD(selected) && 'ring-1 ring-inset ring-brand/50 rounded-[10px]',
                      FOCUS,
                    )}
                  >
                    {d.getDate()}
                    {first && (
                      <i
                        className="absolute left-1/2 -translate-x-1/2 bottom-[3px] w-1 h-1 rounded-full"
                        style={{ background: KIND[kindOf(first)].color }}
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-2 mt-3.5 pt-3.5 border-t border-glass-divider text-caption text-text-muted">
              {(Object.keys(KIND) as Kind[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <i className="w-2 h-2 rounded-[3px]" style={{ background: KIND[k].color }} aria-hidden />
                  {KIND[k].label}
                </span>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
