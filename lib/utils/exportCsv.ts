/**
 * Exporta um array de objetos para um arquivo CSV e dispara o download no browser.
 * @param data - Array de objetos a exportar
 * @param filename - Nome do arquivo (sem extensão)
 * @param columnLabels - Mapeamento de chaves para labels das colunas (opcional)
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columnLabels?: Partial<Record<keyof T, string>>
): void {
  if (!data || data.length === 0) return;

  const keys = Object.keys(data[0]) as (keyof T)[];

  // Cabeçalho
  const header = keys
    .map((k) => columnLabels?.[k] ?? String(k))
    .map(csvEscape)
    .join(';');

  // Linhas
  const rows = data.map((row) =>
    keys.map((k) => csvEscape(String(row[k] ?? ''))).join(';')
  );

  const csvContent = [header, ...rows].join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM para Excel português
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  // Encapsula em aspas se contém ponto-e-vírgula, aspas ou nova linha
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
