/**
 * Origem do lead — de onde o contato chegou.
 *
 * Fonte única, no mesmo espírito de `status.ts`. Origem não é status: não
 * indica progresso nem severidade, então não usa a rampa semântica de
 * validação (`success`/`warning`/`danger`). Reaproveitar aquelas cores aqui
 * faria um lead do Instagram parecer um erro.
 *
 * As cores saem dos tokens `--color-origem-*` em globals.css, que trocam de
 * valor entre tema claro e escuro.
 */

export const LEAD_ORIGINS = [
  'WhatsApp',
  'Instagram Ads',
  'Indicação',
  'Telefone',
  'Outro',
] as const;

export type LeadOrigin = (typeof LEAD_ORIGINS)[number];

const ORIGIN_CLASSES: Record<LeadOrigin, string> = {
  WhatsApp: 'bg-origem-whatsapp/10 text-origem-whatsapp border-origem-whatsapp/25',
  'Instagram Ads': 'bg-origem-instagram/10 text-origem-instagram border-origem-instagram/25',
  Indicação: 'bg-origem-indicacao/10 text-origem-indicacao border-origem-indicacao/25',
  Telefone: 'bg-origem-telefone/10 text-origem-telefone border-origem-telefone/25',
  Outro: 'bg-origem-outro/10 text-origem-outro border-origem-outro/25',
};

/** Classes de badge (fundo + texto + borda) para uma origem. */
export function getOriginClasses(origin: string | null | undefined): string {
  return ORIGIN_CLASSES[(origin as LeadOrigin) ?? 'Outro'] ?? ORIGIN_CLASSES.Outro;
}
