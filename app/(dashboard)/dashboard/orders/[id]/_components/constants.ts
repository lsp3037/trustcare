import { ChecklistTemplateItem, OrderChecklist } from './types';

/**
 * A cópia local de STATUS_CONFIG que vivia aqui foi removida — o mapa
 * está em `@/lib/design/status`. Reexportado para não quebrar imports.
 */
export { OS_STATUS_FLOW } from '@/lib/design/status';

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
