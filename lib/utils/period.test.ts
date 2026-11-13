import { describe, expect, it } from 'vitest';
import { comparisonPeriod, formatPeriod, periodLength, presetPeriod } from './period';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const ymd = (x: Date) => `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;

describe('period', () => {
  const today = new Date(2026, 10, 12, 15, 30); // 12/nov/2026 à tarde

  it('últimos 30 dias vão de 14/out a 12/nov e têm 30 dias', () => {
    const p = presetPeriod('Últimos 30 dias', today);
    expect(ymd(p.from)).toBe('2026-10-14');
    expect(ymd(p.to)).toBe('2026-11-12');
    expect(periodLength(p)).toBe(30);
  });

  it('comparação usa a mesma duração, terminando na véspera', () => {
    const c = comparisonPeriod(presetPeriod('Últimos 30 dias', today));
    expect(ymd(c.from)).toBe('2026-9-14');
    expect(ymd(c.to)).toBe('2026-10-13');
    expect(periodLength(c)).toBe(30);
  });

  it('hoje compara com ontem', () => {
    const c = comparisonPeriod(presetPeriod('Hoje', today));
    expect(ymd(c.from)).toBe('2026-11-11');
    expect(ymd(c.to)).toBe('2026-11-11');
  });

  it('mês passado cobre o mês inteiro anterior', () => {
    const p = presetPeriod('Mês passado', today);
    expect(ymd(p.from)).toBe('2026-10-1');
    expect(ymd(p.to)).toBe('2026-10-31');
    expect(periodLength(p)).toBe(31);
  });

  it('mês passado em janeiro volta para dezembro do ano anterior', () => {
    const p = presetPeriod('Mês passado', d(2027, 1, 10));
    expect(ymd(p.from)).toBe('2026-12-1');
    expect(ymd(p.to)).toBe('2026-12-31');
  });

  it('formata o período em pt-BR curto', () => {
    expect(formatPeriod(presetPeriod('Últimos 30 dias', today))).toBe('14 out – 12 nov');
    expect(formatPeriod(presetPeriod('Hoje', today))).toBe('12 nov');
  });
});
