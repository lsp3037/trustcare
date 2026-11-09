/**
 * Dados de EXEMPLO da landing v2.
 *
 * Nada aqui é métrica de cliente real. É um cenário de demonstração que a
 * página declara como tal ("dados de exemplo"). Os totais não são digitados à
 * mão: são calculados destes arrays, do mesmo jeito que o sistema calcula.
 */

export type Peca = { sku: string; nome: string; custo: number; venda: number; estoque: number; minimo: number };
export type Servico = { nome: string; preco: number };

export const OS = {
  codigo: 'TC-2026-0147',
  cliente: 'Renata Moura',
  documento: 'CPF ***.482.***-07',
  telefone: '(65) 9 ****-2210',
  equipamento: 'Notebook Dell G15 5520',
  serie: 'Service Tag 7HX2K93',
  specs: 'i7-12700H · 16 GB · RTX 3050 · SSD 512 GB',
  defeito: 'Desliga sozinho depois de 10 minutos em jogo',
  laudo:
    'Cooler obstruído e pasta térmica ressecada. CPU chega a 98 °C sob carga e o sistema desarma por temperatura. SSD com 11% de vida útil restante.',
  pecas: [
    { sku: 'SSD-NV2-1T', nome: 'SSD NVMe 1 TB Kingston NV2', custo: 289, venda: 429, estoque: 12, minimo: 3 },
    { sku: 'PST-KRY-1G', nome: 'Pasta térmica Kryonaut 1 g', custo: 38, venda: 70, estoque: 30, minimo: 5 },
  ] as Peca[],
  servicos: [
    { nome: 'Limpeza interna e troca de pasta', preco: 180 },
    { nome: 'Clonagem do sistema para o SSD novo', preco: 120 },
  ] as Servico[],
};

export const totalPecasVenda = OS.pecas.reduce((s, p) => s + p.venda, 0);
export const totalPecasCusto = OS.pecas.reduce((s, p) => s + p.custo, 0);
export const totalServicos = OS.servicos.reduce((s, x) => s + x.preco, 0);
export const totalOS = totalPecasVenda + totalServicos;
export const lucroOS = totalOS - totalPecasCusto;
export const margemOS = lucroOS / totalOS;

/** Outras peças do estoque de exemplo (só para a tabela não ter uma linha). */
export const OUTRAS_PECAS: Peca[] = [
  { sku: 'BAT-DEL-56W', nome: 'Bateria Dell 56 Wh', custo: 210, venda: 349, estoque: 2, minimo: 3 },
  { sku: 'TEC-ACR-A515', nome: 'Teclado Acer Aspire 5', custo: 95, venda: 180, estoque: 6, minimo: 2 },
  { sku: 'TEL-IP11-LCD', nome: 'Tela iPhone 11 LCD', custo: 160, venda: 320, estoque: 4, minimo: 2 },
];

/** Mês de exemplo: OS pagas no período. A primeira é a OS acompanhada. */
export const MES = [
  { codigo: OS.codigo, equip: 'Dell G15 5520', receita: totalOS, custoPecas: totalPecasCusto },
  { codigo: 'TC-2026-0139', equip: 'iPhone 11 · tela', receita: 450, custoPecas: 160 },
  { codigo: 'TC-2026-0141', equip: 'Acer Aspire 5 · teclado', receita: 290, custoPecas: 95 },
  { codigo: 'TC-2026-0143', equip: 'PC gamer · formatação', receita: 180, custoPecas: 0 },
  { codigo: 'TC-2026-0144', equip: 'MacBook Air · bateria', receita: 980, custoPecas: 520 },
  { codigo: 'TC-2026-0145', equip: 'Positivo · placa-mãe', receita: 640, custoPecas: 310 },
];
export const DESPESAS_FIXAS = [
  { nome: 'Aluguel da loja (proporcional)', valor: 420 },
  { nome: 'Energia e internet', valor: 160 },
];
export const mesReceita = MES.reduce((s, o) => s + o.receita, 0);
export const mesCustoPecas = MES.reduce((s, o) => s + o.custoPecas, 0);
export const mesDespesas = DESPESAS_FIXAS.reduce((s, d) => s + d.valor, 0);
export const mesLucro = mesReceita - mesCustoPecas - mesDespesas;

/** Máquina de estados real do sistema (PRD, RF-2.2). Cancelado fica de fora do trilho. */
export const STATUS = [
  { id: 'aguardando', nome: 'Aguardando Equipamento', cor: '#64748b' },
  { id: 'analise', nome: 'Em Análise', cor: '#3b82f6' },
  { id: 'aprovacao', nome: 'Aguardando Aprovação', cor: '#f59e0b' },
  { id: 'aprovado', nome: 'Aprovado', cor: '#14b8a6' },
  { id: 'pecas', nome: 'Aguardando Peças', cor: '#f97316' },
  { id: 'execucao', nome: 'Em Execução', cor: '#6366f1' },
  { id: 'testes', nome: 'Em Testes', cor: '#06b6d4' },
  { id: 'pronto', nome: 'Pronto para Retirada', cor: '#10b981' },
  { id: 'finalizado', nome: 'Finalizado', cor: '#059669' },
] as const;

export const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: '29,90', para: 'Para quem atende sozinho.', itens: ['1 usuário', 'OS ilimitadas', 'Cadastro de clientes', 'Orçamento em PDF'] },
  { id: 'pro', nome: 'Pro', preco: '69,90', para: 'O ponto de equilíbrio para crescer.', itens: ['Até 3 usuários', 'Rastreio público', 'Módulo financeiro', 'Aviso automático de status', 'Controle de estoque'] },
  { id: 'premium', nome: 'Premium', preco: '149,90', para: 'Para assistências de alto volume.', itens: ['Usuários ilimitados', 'Tudo do plano Pro', 'API para integrações', 'Suporte prioritário'] },
] as const;

export const FAQ = [
  { q: 'O teste grátis pede cartão de crédito?', a: 'Não. São 7 dias para testar na sua bancada, sem cartão, e você cancela quando quiser.' },
  { q: 'Meus dados ficam separados dos de outras assistências?', a: 'Sim. Cada empresa é isolada no próprio banco de dados (Row Level Security). Ninguém de outra assistência enxerga seus clientes, OS ou financeiro.' },
  { q: 'Posso ter mais de um técnico?', a: 'Sim, a partir do plano Pro. Cada pessoa tem papel próprio (admin, técnico ou atendente) e o sistema registra quem mexeu em cada OS.' },
  { q: 'Serve para celular e notebook de qualquer marca?', a: 'Serve. Checklist de entrada, número de série (IMEI ou Service Tag) e laudo foram pensados para bancada de hardware.' },
];

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const reais = (v: number) => brl.format(v).replace(/ /g, ' ');
export const pct = (v: number) => `${Math.round(v * 100)}%`;
