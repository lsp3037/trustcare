/**
 * Regras de período compartilhadas pelo seletor de datas e pelos indicadores.
 * Tudo em dias de calendário locais (meia-noite), para não depender da hora.
 */

export interface Period {
  from: Date;
  to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Meia-noite local do dia de `d`. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 23:59:59.999 local do dia de `d`. */
export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Quantidade de dias do período, contando o primeiro e o último. */
export function periodLength(p: Period): number {
  const a = Date.UTC(p.from.getFullYear(), p.from.getMonth(), p.from.getDate());
  const b = Date.UTC(p.to.getFullYear(), p.to.getMonth(), p.to.getDate());
  return Math.round((b - a) / DAY_MS) + 1;
}

/**
 * Período de comparação dos KPIs: mesma quantidade de dias, terminando na
 * véspera do início. 14/out–12/nov (30 dias) compara com 14/set–13/out.
 */
export function comparisonPeriod(p: Period): Period {
  const days = periodLength(p);
  const to = addDays(startOfDay(p.from), -1);
  const from = addDays(to, -(days - 1));
  return { from, to: endOfDay(to) };
}

export type PresetName = 'Hoje' | 'Últimos 7 dias' | 'Últimos 30 dias' | 'Este mês' | 'Mês passado';

export const PRESETS: PresetName[] = ['Hoje', 'Últimos 7 dias', 'Últimos 30 dias', 'Este mês', 'Mês passado'];

/** Intervalo de um atalho, relativo a `today`. */
export function presetPeriod(name: PresetName, today: Date = new Date()): Period {
  const t = startOfDay(today);
  switch (name) {
    case 'Hoje':
      return { from: t, to: endOfDay(t) };
    case 'Últimos 7 dias':
      return { from: addDays(t, -6), to: endOfDay(t) };
    case 'Últimos 30 dias':
      return { from: addDays(t, -29), to: endOfDay(t) };
    case 'Este mês':
      return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: endOfDay(t) };
    case 'Mês passado':
      return {
        from: new Date(t.getFullYear(), t.getMonth() - 1, 1),
        to: endOfDay(new Date(t.getFullYear(), t.getMonth(), 0)),
      };
  }
}

/** "14 out" */
export function formatDayMonth(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ');
}

/** "14 out – 12 nov", ou "14 out" quando começa e termina no mesmo dia. */
export function formatPeriod(p: Period): string {
  if (isSameDay(p.from, p.to)) return formatDayMonth(p.from);
  return `${formatDayMonth(p.from)} – ${formatDayMonth(p.to)}`;
}
