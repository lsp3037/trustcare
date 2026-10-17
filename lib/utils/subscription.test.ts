import { describe, it, expect } from 'vitest';
import { isSubscriptionReadOnly, getTrialDaysRemaining } from '@/lib/utils/subscription';

// Mesma tabela de casos validada contra public.is_company_read_only no banco.
const NOW = new Date('2026-10-09T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const ro = (status: string | null, expires: string | null, trialEnds?: string | null) =>
  isSubscriptionReadOnly({ subscription_status: status, subscription_expires_at: expires, trial_ends_at: trialEnds }, NOW);

describe('isSubscriptionReadOnly (F-08, F-35)', () => {
  it('active: sem vencimento nunca bloqueia (conta manual)', () => {
    expect(ro('active', null)).toBe(false);
  });

  it('active: respeita 5 dias de carência após o vencimento', () => {
    expect(ro('active', daysAgo(-10))).toBe(false); // vence no futuro
    expect(ro('active', daysAgo(4))).toBe(false); // venceu, ainda na carência
    expect(ro('active', daysAgo(6))).toBe(true); // passou da carência
  });

  it('past_due: sem data bloqueia; com data respeita a carência', () => {
    expect(ro('past_due', null)).toBe(true);
    expect(ro('past_due', daysAgo(4))).toBe(false);
    expect(ro('past_due', daysAgo(6))).toBe(true);
  });

  it('trialing: bloqueia na data, sem carência; sem data é vencido', () => {
    expect(ro('trialing', daysAgo(-1))).toBe(false);
    expect(ro('trialing', daysAgo(1))).toBe(true);
    expect(ro('trialing', null)).toBe(true);
  });

  it('trialing: respeita trial_ends_at explicitamente quando presente', () => {
    expect(ro('trialing', null, daysAgo(-7))).toBe(false); // 7 dias restantes de trial
    expect(ro('trialing', null, daysAgo(1))).toBe(true); // trial expirado há 1 dia
  });

  it('canceled sempre bloqueia; status vazio ou desconhecido não bloqueia', () => {
    expect(ro('canceled', null)).toBe(true);
    expect(ro('canceled', daysAgo(-30))).toBe(true);
    expect(ro(null, null)).toBe(false);
    expect(ro('desconhecido', daysAgo(30))).toBe(false);
  });
});

describe('getTrialDaysRemaining (F-08)', () => {
  it('deve retornar null quando a empresa não estiver em trialing', () => {
    expect(getTrialDaysRemaining({ subscription_status: 'active' }, NOW)).toBeNull();
    expect(getTrialDaysRemaining({ subscription_status: 'past_due' }, NOW)).toBeNull();
    expect(getTrialDaysRemaining({ subscription_status: 'canceled' }, NOW)).toBeNull();
  });

  it('deve calcular dias restantes com precisão para conta em trial', () => {
    const trialFuture = daysAgo(-5); // 5 dias no futuro
    expect(getTrialDaysRemaining({ subscription_status: 'trialing', trial_ends_at: trialFuture }, NOW)).toBe(5);

    const trialPast = daysAgo(2); // 2 dias no passado
    expect(getTrialDaysRemaining({ subscription_status: 'trialing', trial_ends_at: trialPast }, NOW)).toBe(-2);
  });
});
