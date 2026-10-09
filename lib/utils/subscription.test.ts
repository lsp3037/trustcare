import { describe, it, expect } from 'vitest';
import { isSubscriptionReadOnly } from '@/lib/utils/subscription';

// Mesma tabela de casos validada contra public.is_company_read_only no banco.
const NOW = new Date('2026-10-09T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const ro = (status: string | null, expires: string | null) =>
  isSubscriptionReadOnly({ subscription_status: status, subscription_expires_at: expires }, NOW);

describe('isSubscriptionReadOnly', () => {
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

  it('canceled sempre bloqueia; status vazio ou desconhecido não bloqueia', () => {
    expect(ro('canceled', null)).toBe(true);
    expect(ro('canceled', daysAgo(-30))).toBe(true);
    expect(ro(null, null)).toBe(false);
    expect(ro('desconhecido', daysAgo(30))).toBe(false);
  });
});
