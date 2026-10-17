/**
 * Utilitários padronizados para manipulação e formatação de datas.
 *
 * Evita o bug de deslocamento de fuso horário (F-15), onde `new Date('YYYY-MM-DD').toISOString()`
 * converte a data para meia-noite UTC (21:00 do dia anterior em Brasília, UTC-3),
 * fazendo pagamentos do dia 1º caírem no mês anterior.
 */

/**
 * Converte um objeto Date, string ou timestamp para o formato canônico 'YYYY-MM-DD'
 * respeitando os componentes de data locais (sem converter para UTC).
 */
export function toLocalYMD(dateInput?: Date | string | null): string {
  if (!dateInput) {
    const now = new Date();
    return formatYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  if (typeof dateInput === 'string') {
    // Se já estiver no formato 'YYYY-MM-DD', retorna diretamente sem mexer
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // Se for ISO string 'YYYY-MM-DDTHH:mm:ss...', extrai a parte da data
    if (dateInput.includes('T')) {
      const parts = dateInput.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(parts)) {
        return parts;
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return formatYMD(fallback.getFullYear(), fallback.getMonth() + 1, fallback.getDate());
  }

  return formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Formata números de ano, mês e dia como 'YYYY-MM-DD'.
 */
function formatYMD(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Converte 'YYYY-MM-DD' ou Date para formato legível brasileiro 'DD/MM/YYYY'.
 */
export function toBrazilianDate(dateInput?: Date | string | null): string {
  if (!dateInput) return '-';

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    return `${day}/${month}/${year}`;
  }

  const ymd = toLocalYMD(dateInput);
  const [year, month, day] = ymd.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Adiciona meses a uma data base preservando o dia do mês sem overflow para o mês seguinte
 * (ex.: 31 de janeiro + 1 mês = 28 de fevereiro, e não 3 de março).
 */
export function addMonthsPreservingDay(baseDate: Date, monthsToAdd: number): Date {
  const result = new Date(baseDate.getTime());
  const targetMonth = result.getMonth() + monthsToAdd;
  result.setMonth(targetMonth);

  // Se o dia do mês mudou (overflow), retrocede para o último dia do mês desejado
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }
  return result;
}
