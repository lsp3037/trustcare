import { ChecklistTemplateItem, OrderChecklist } from './types';

export const STATUS_CONFIG: Record<string, { label: string; colorClass: string; desc: string }> = {
  'Aguardando Equipamento': { label: 'Aguardando Equipamento', colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20', desc: 'Aparelho ainda não entregue pelo cliente' },
  'Em Análise': { label: 'Em Análise', colorClass: 'bg-blue-500/10 text-blue-450 border-blue-500/20', desc: 'Aparelho recebido para diagnóstico' },
  'Aguardando Aprovação': { label: 'Aguardando Aprovação', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', desc: 'Orçamento gerado, aguardando aprovação' },
  'Aprovado': { label: 'Aprovado', colorClass: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20', desc: 'Orçamento aprovado pelo cliente, aguardando execução' },
  'Aguardando Peças': { label: 'Aguardando Peças', colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', desc: 'Conserto pausado aguardando peças' },
  'Em Execução': { label: 'Em Execução', colorClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20', desc: 'Técnico trabalhando no reparo' },
  'Em Testes': { label: 'Em Testes', colorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', desc: 'Passando por testes pós-reparo' },
  'Pronto para Retirada': { label: 'Pronto para Retirada', colorClass: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20', desc: 'Pronto para retirada física' },
  'Finalizado': { label: 'Finalizado', colorClass: 'bg-emerald-600/10 text-emerald-500 border-emerald-600/20', desc: 'Equipamento entregue e finalizado' },
  'Cancelado': { label: 'Cancelado', colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', desc: 'Ordem de serviço cancelada' }
};

export const DEFAULT_TEMPLATE_ITEMS: ChecklistTemplateItem[] = [
  { id: 'charger', label: 'Carregador' },
  { id: 'battery', label: 'Bateria' },
  { id: 'screen', label: 'Tela / Display' },
  { id: 'keyboard', label: 'Teclado' },
  { id: 'casing', label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on', label: 'Ligar / Dar Vídeo' },
  { id: 'removable_media', label: 'Mídia Removível (PenDrive/SD)' },
  { id: 'missing_screws', label: 'Parafusos Ausentes' }
];

export const defaultChecklist: OrderChecklist = {
  password_pin: { has_password: false, password_value: '' },
  general_notes: ''
};
