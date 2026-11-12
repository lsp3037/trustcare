/**
 * Superfícies de vidro do Dashboard (redesign "Apple glassmorphism").
 * Ficam aqui para o Financeiro e outras telas usarem a mesma identidade.
 */

/** Painel grande: gráficos, tabelas, listas. */
export const GLASS_PANEL =
  'bg-gradient-to-br from-surface-raised/95 via-surface/90 to-surface-sunken/95 backdrop-blur-2xl border border-border/80 border-t-white/20 border-x-white/8 border-b-black/40 rounded-[24px] shadow-[0_20px_45px_-10px_rgba(0,0,0,0.6)]';

/** Título de seção acima de um grid ("Visão geral"). */
export const SECTION_TITLE = 'font-sans text-[15px] font-bold tracking-[0.02em] text-text';

/** Botão principal em pílula com brilho esmeralda (ex.: "Nova OS"). */
export const GLOW_BUTTON =
  'rounded-full shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] transition-all duration-300 font-bold';

/** "Últimos 30 dias" quando o período termina hoje; senão, "23/09 – 22/10". */
export function formatPeriodLabel(range: { from: Date; to: Date } | null) {
  if (!range) return undefined;
  // Compara só as datas: a hora do `to` (agora) somava um dia a mais.
  const dayMs = 24 * 60 * 60 * 1000;
  const dateOnly = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((dateOnly(range.to) - dateOnly(range.from)) / dayMs) + 1;
  if (range.to.toDateString() === new Date().toDateString()) {
    return days === 1 ? 'Hoje' : `Últimos ${days} dias`;
  }
  const short = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${short(range.from)} – ${short(range.to)}`;
}
