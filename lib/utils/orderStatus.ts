export const STATUS_CONFIG: Record<string, { label: string; colorClass: string; dotClass?: string }> = {
  // Novos Contatos e Orçamentos
  'Novo Contato': { label: 'Novo Contato', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  'Em Orçamento': { label: 'Em Orçamento', colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  'Aguardando Aprovação': { label: 'Aguardando Aprovação', colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  'Aprovado': { label: 'Aprovado', colorClass: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' },
  'Aprovado (Na Fila)': { label: 'Aprovado (Na Fila)', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  
  // Execução
  'Aguardando Equipamento': { label: 'Aguardando Equipamento', colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  'Aguardando Aparelho': { label: 'Aguardando Aparelho', colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  'Em Análise': { label: 'Em Análise', colorClass: 'bg-blue-500/10 text-blue-450 border-blue-500/20' },
  'Em Manutenção': { label: 'Em Manutenção', colorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  'Em Execução': { label: 'Em Execução', colorClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  'Aguardando Peça': { label: 'Aguardando Peça', colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  'Aguardando Peças': { label: 'Aguardando Peças', colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  'Em Testes': { label: 'Em Testes', colorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  
  // Finalização
  'Pronto para Retirada': { label: 'Pronto para Retirada', colorClass: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' },
  'Finalizado': { label: 'Finalizado', colorClass: 'bg-emerald-600/10 text-emerald-500 border-emerald-600/20' },
  'Entregue': { label: 'Entregue', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  'Cancelado': { label: 'Cancelado', colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
};

export const getStatusColor = (status: string) => {
  return STATUS_CONFIG[status]?.colorClass || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

export const getStatusDotColor = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s.includes('pronto') || s.includes('finalizado') || s.includes('entregue') || s.includes('aprovado')) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  if (s.includes('orçamento') || s.includes('fila') || s.includes('manutenção') || s.includes('análise') || s.includes('execução') || s.includes('testes')) return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
  if (s.includes('aguardando') || s.includes('peça')) return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
  if (s.includes('cancelado')) return 'bg-rose-500 shadow-[0_0_8px_rgba(243,62,94,0.5)]';
  return 'bg-slate-500';
};
