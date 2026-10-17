import { describe, it, expect } from 'vitest';
import { toLocalYMD, toBrazilianDate, addMonthsPreservingDay } from './dates';

describe('Date Utilities (F-15)', () => {
  it('deve formatar data string YYYY-MM-DD sem alteração ou conversão de fuso', () => {
    expect(toLocalYMD('2026-10-01')).toBe('2026-10-01');
    expect(toLocalYMD('2026-01-01')).toBe('2026-01-01');
    expect(toLocalYMD('2026-12-31')).toBe('2026-12-31');
  });

  it('deve extrair data local a partir de string ISO sem deslocamento de dia', () => {
    // Mesmo que venha com horário, extrai a data informada
    expect(toLocalYMD('2026-10-01T12:00:00.000Z')).toBe('2026-10-01');
  });

  it('deve formatar data para exibição brasileira DD/MM/YYYY', () => {
    expect(toBrazilianDate('2026-10-01')).toBe('01/10/2026');
    expect(toBrazilianDate('2026-05-25')).toBe('25/05/2026');
    expect(toBrazilianDate(null)).toBe('-');
  });

  it('deve adicionar meses de forma consistente sem overflow indevido de dia', () => {
    // 31 de janeiro + 1 mês em ano não bissexto (2026) -> 28 de fevereiro
    const jan31 = new Date(2026, 0, 31);
    const febResult = addMonthsPreservingDay(jan31, 1);
    expect(febResult.getFullYear()).toBe(2026);
    expect(febResult.getMonth()).toBe(1); // Fevereiro (0-indexed)
    expect(febResult.getDate()).toBe(28);

    // 15 de março + 2 meses -> 15 de maio
    const mar15 = new Date(2026, 2, 15);
    const mayResult = addMonthsPreservingDay(mar15, 2);
    expect(mayResult.getMonth()).toBe(4); // Maio
    expect(mayResult.getDate()).toBe(15);
  });
});
