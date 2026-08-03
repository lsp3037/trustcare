/**
 * Formatação de telefone para exibição.
 *
 * Os números chegam ao banco por caminhos diferentes (cadastro manual,
 * conversão de lead, importação), então convivem formatos como
 * `+55 65 9986-2527`, `65 9996-2858` e `(11) 98765-4321` na mesma listagem.
 * Normalizar na hora de exibir mantém a coluna alinhada sem precisar
 * reescrever o que já está salvo.
 *
 * Formato desconhecido volta como veio: é melhor mostrar o dado original
 * do que arriscar recortar dígitos de um número fora do padrão brasileiro.
 */
export function formatPhone(raw?: string | null): string {
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  // Descarta o código do país quando ele veio junto.
  const local = digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }

  return raw.trim();
}
