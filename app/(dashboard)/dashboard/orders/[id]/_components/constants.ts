import { ChecklistTemplateItem, OrderChecklist } from './types';

/**
 * A cópia local de STATUS_CONFIG que vivia aqui foi removida — o mapa
 * está em `@/lib/design/status`. Reexportado para não quebrar imports.
 */
export { OS_STATUS_FLOW } from '@/lib/design/status';

// ---------------------------------------------------------------------------
// Defaults contextuais por tipo de equipamento
// ---------------------------------------------------------------------------

/** Itens para Notebook */
const NOTEBOOK_ITEMS: ChecklistTemplateItem[] = [
  { id: 'charger',         label: 'Carregador / Fonte' },
  { id: 'battery',         label: 'Bateria (autonomia)' },
  { id: 'screen',          label: 'Tela / Display' },
  { id: 'keyboard',        label: 'Teclado' },
  { id: 'touchpad',        label: 'Touchpad' },
  { id: 'casing',          label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on',        label: 'Ligar / Dar Vídeo' },
  { id: 'removable_media', label: 'Mídia Removível (PenDrive/SD)' },
  { id: 'missing_screws',  label: 'Parafusos Ausentes' },
];

/** Itens para Desktop / PC */
const DESKTOP_ITEMS: ChecklistTemplateItem[] = [
  { id: 'power_cable',     label: 'Cabos / Fonte de Alimentação' },
  { id: 'monitor',         label: 'Monitor' },
  { id: 'keyboard',        label: 'Teclado' },
  { id: 'mouse',           label: 'Mouse' },
  { id: 'casing',          label: 'Gabinete (Arranhões/Amassados)' },
  { id: 'power_on',        label: 'Ligar / Dar Vídeo' },
  { id: 'removable_media', label: 'Mídia Removível (PenDrive/SD)' },
  { id: 'missing_screws',  label: 'Parafusos Ausentes' },
];

/** Itens para All in One */
const ALL_IN_ONE_ITEMS: ChecklistTemplateItem[] = [
  { id: 'power_cable',     label: 'Cabo de Alimentação' },
  { id: 'screen',          label: 'Tela / Display' },
  { id: 'keyboard',        label: 'Teclado' },
  { id: 'mouse',           label: 'Mouse' },
  { id: 'casing',          label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on',        label: 'Ligar / Dar Vídeo' },
  { id: 'missing_screws',  label: 'Parafusos Ausentes' },
];

/** Itens para Smartphone / iPhone */
const SMARTPHONE_ITEMS: ChecklistTemplateItem[] = [
  { id: 'charger',         label: 'Carregador / Cabo' },
  { id: 'screen',          label: 'Tela / Display' },
  { id: 'casing',          label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on',        label: 'Ligar / Dar Imagem' },
  { id: 'buttons',         label: 'Botões (Volume / Power)' },
  { id: 'sim_card',        label: 'SIM Card / Bandeja' },
  { id: 'back_cover',      label: 'Tampa Traseira' },
];

/** Itens para Tablet / iPad */
const TABLET_ITEMS: ChecklistTemplateItem[] = [
  { id: 'charger',         label: 'Carregador / Cabo' },
  { id: 'screen',          label: 'Tela / Display' },
  { id: 'casing',          label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on',        label: 'Ligar / Dar Imagem' },
  { id: 'buttons',         label: 'Botões (Volume / Power)' },
  { id: 'back_cover',      label: 'Tampa Traseira' },
];

/** Itens para Impressora */
const PRINTER_ITEMS: ChecklistTemplateItem[] = [
  { id: 'power_cable',     label: 'Cabo de Alimentação' },
  { id: 'usb_cable',       label: 'Cabo USB / Cabo de Rede' },
  { id: 'print_head',      label: 'Cabeça de Impressão' },
  { id: 'paper_tray',      label: 'Bandeja de Papel' },
  { id: 'casing',          label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on',        label: 'Ligar / Testar Impressão' },
];

/** Fallback genérico quando a categoria não é reconhecida */
const GENERIC_ITEMS: ChecklistTemplateItem[] = [
  { id: 'screen',          label: 'Tela / Display' },
  { id: 'casing',          label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on',        label: 'Ligar / Dar Vídeo' },
  { id: 'missing_screws',  label: 'Parafusos Ausentes' },
];

/**
 * Retorna a lista de itens de checklist mais adequada para uma categoria,
 * com base em correspondência por palavras-chave (case-insensitive).
 * Quando não há correspondência, retorna GENERIC_ITEMS.
 */
export function getDefaultItemsForCategory(categoryName: string): ChecklistTemplateItem[] {
  const name = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (name.includes('notebook') || name.includes('laptop')) return NOTEBOOK_ITEMS;
  if (name.includes('all in one') || name.includes('allinone') || name.includes('all-in-one') || name.includes('aio')) return ALL_IN_ONE_ITEMS;
  if (name.includes('desktop') || name.includes('computador') || name.includes('pc') || name.includes('torre')) return DESKTOP_ITEMS;
  if (name.includes('smartphone') || name.includes('celular') || name.includes('iphone') || name.includes('android')) return SMARTPHONE_ITEMS;
  if (name.includes('tablet') || name.includes('ipad')) return TABLET_ITEMS;
  if (name.includes('impressora') || name.includes('printer')) return PRINTER_ITEMS;

  return GENERIC_ITEMS;
}

/**
 * Fallback legado (mantido para compatibilidade).
 * Prefira `getDefaultItemsForCategory` quando o nome da categoria estiver disponível.
 */
export const DEFAULT_TEMPLATE_ITEMS: ChecklistTemplateItem[] = GENERIC_ITEMS;

export const defaultChecklist: OrderChecklist = {
  password_pin: { has_password: false, password_value: '' },
  general_notes: ''
};
