/**
 * Fonte única de verdade para a aparência de status.
 *
 * Antes existiam 7 cópias divergentes deste mapa (orders/page.tsx,
 * orders/[id]/_components/constants.ts, OrderHeader, RecentOrdersTable,
 * clients/[id], rastreio, settings/billing). Qualquer status novo tinha
 * que ser adicionado em todos — e não era.
 *
 * As cores saem dos tokens `--color-status-*` em globals.css, que já
 * trocam de valor entre tema claro e escuro. Nenhuma cor literal aqui.
 */

export type StatusTone =
  | 'aguardando'
  | 'analise'
  | 'aprovacao'
  | 'aprovado'
  | 'pecas'
  | 'execucao'
  | 'testes'
  | 'pronto'
  | 'finalizado'
  | 'cancelado';

/** Classes Tailwind por tom. Referenciam os tokens, não valores literais. */
const TONE_CLASSES: Record<StatusTone, string> = {
  aguardando: 'bg-status-aguardando/10 text-status-aguardando border-status-aguardando/25',
  analise: 'bg-status-analise/10 text-status-analise border-status-analise/25',
  aprovacao: 'bg-status-aprovacao/10 text-status-aprovacao border-status-aprovacao/25',
  aprovado: 'bg-status-aprovado/10 text-status-aprovado border-status-aprovado/25',
  pecas: 'bg-status-pecas/10 text-status-pecas border-status-pecas/25',
  execucao: 'bg-status-execucao/10 text-status-execucao border-status-execucao/25',
  testes: 'bg-status-testes/10 text-status-testes border-status-testes/25',
  pronto: 'bg-status-pronto/10 text-status-pronto border-status-pronto/25',
  finalizado: 'bg-status-finalizado/10 text-status-finalizado border-status-finalizado/25',
  cancelado: 'bg-status-cancelado/10 text-status-cancelado border-status-cancelado/25',
};

const TONE_DOT: Record<StatusTone, string> = {
  aguardando: 'bg-status-aguardando',
  analise: 'bg-status-analise',
  aprovacao: 'bg-status-aprovacao',
  aprovado: 'bg-status-aprovado',
  pecas: 'bg-status-pecas',
  execucao: 'bg-status-execucao',
  testes: 'bg-status-testes',
  pronto: 'bg-status-pronto',
  finalizado: 'bg-status-finalizado',
  cancelado: 'bg-status-cancelado',
};

interface StatusEntry {
  label: string;
  tone: StatusTone;
  /** Frase curta explicando o que o status significa na prática. */
  desc: string;
}

/**
 * Cobre tanto o ciclo da OS quanto o funil de leads — os dois usam
 * o mesmo componente de badge, então vivem no mesmo mapa.
 */
export const STATUS: Record<string, StatusEntry> = {
  // ── Funil de leads ──
  'Novo Contato': { label: 'Novo Contato', tone: 'analise', desc: 'Lead recebido, ainda sem orçamento' },
  'Em Orçamento': { label: 'Em Orçamento', tone: 'analise', desc: 'Orçamento sendo montado' },
  'Em Negociação': { label: 'Em Negociação', tone: 'aprovacao', desc: 'Proposta enviada, decisão com o cliente' },
  'Ganho/Convertido': { label: 'Ganho/Convertido', tone: 'finalizado', desc: 'Lead virou ordem de serviço' },
  'Perdido': { label: 'Perdido', tone: 'cancelado', desc: 'Lead descartado, com motivo registrado' },
  'Aprovado (Na Fila)': { label: 'Aprovado (Na Fila)', tone: 'aprovado', desc: 'Aprovado, aguardando início' },

  // ── Ciclo da OS ──
  'Aguardando Equipamento': { label: 'Aguardando Equipamento', tone: 'aguardando', desc: 'Aparelho ainda não entregue pelo cliente' },
  'Aguardando Aparelho': { label: 'Aguardando Aparelho', tone: 'aguardando', desc: 'Aparelho ainda não entregue pelo cliente' },
  'Em Análise': { label: 'Em Análise', tone: 'analise', desc: 'Aparelho recebido para diagnóstico' },
  'Aguardando Aprovação': { label: 'Aguardando Aprovação', tone: 'aprovacao', desc: 'Orçamento gerado, aguardando aprovação' },
  'Aprovado': { label: 'Aprovado', tone: 'aprovado', desc: 'Orçamento aprovado, aguardando execução' },
  'Aguardando Peça': { label: 'Aguardando Peça', tone: 'pecas', desc: 'Conserto pausado aguardando peça' },
  'Aguardando Peças': { label: 'Aguardando Peças', tone: 'pecas', desc: 'Conserto pausado aguardando peças' },
  'Em Manutenção': { label: 'Em Manutenção', tone: 'execucao', desc: 'Técnico trabalhando no reparo' },
  'Em Execução': { label: 'Em Execução', tone: 'execucao', desc: 'Técnico trabalhando no reparo' },
  'Em Testes': { label: 'Em Testes', tone: 'testes', desc: 'Passando por testes pós-reparo' },
  'Pronto para Retirada': { label: 'Pronto para Retirada', tone: 'pronto', desc: 'Pronto para retirada física' },
  'Finalizado': { label: 'Finalizado', tone: 'finalizado', desc: 'Equipamento entregue e finalizado' },
  'Entregue': { label: 'Entregue', tone: 'finalizado', desc: 'Equipamento entregue ao cliente' },
  'Cancelado': { label: 'Cancelado', tone: 'cancelado', desc: 'Ordem de serviço cancelada' },
};

/**
 * Ciclo da OS na ordem em que acontece na bancada.
 * Use isto para popular seletores — `Object.keys(STATUS)` traria
 * também os status de lead e os aliases legados.
 */
/** Etapas do funil de leads, na ordem do kanban. */
export const LEAD_STATUS_FLOW = [
  'Novo Contato',
  'Em Negociação',
  'Aguardando Equipamento',
  'Ganho/Convertido',
  'Perdido',
] as const;

export const OS_STATUS_FLOW = [
  'Aguardando Equipamento',
  'Em Análise',
  'Aguardando Aprovação',
  'Aprovado',
  'Aguardando Peças',
  'Em Execução',
  'Em Testes',
  'Pronto para Retirada',
  'Finalizado',
  'Cancelado',
] as const;

const FALLBACK: StatusEntry = { label: 'Desconhecido', tone: 'aguardando', desc: '' };

export function getStatus(status: string | null | undefined): StatusEntry {
  if (!status) return FALLBACK;
  return STATUS[status] ?? { ...FALLBACK, label: status };
}

/** Classes de badge (fundo + texto + borda) para um status. */
export function getStatusClasses(status: string | null | undefined): string {
  return TONE_CLASSES[getStatus(status).tone];
}

/** Classe de fundo para o marcador circular de status. */
export function getStatusDot(status: string | null | undefined): string {
  return TONE_DOT[getStatus(status).tone];
}

/** Descrição legível do que o status significa. */
export function getStatusDescription(status: string | null | undefined): string {
  return getStatus(status).desc;
}
