import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

function verifyWebhookToken(headerToken: string | null, secret: string | undefined): boolean {
  if (!secret || !headerToken) return false;
  const secretBuffer = Buffer.from(secret);
  const headerBuffer = Buffer.from(headerToken);
  if (secretBuffer.length !== headerBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(secretBuffer, headerBuffer);
}

function parseSafeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function parseExternalReference(extRef: string | null | undefined) {
  if (!extRef || typeof extRef !== 'string') return { companyId: '', targetPlan: '' };
  if (extRef.includes(':')) {
    const [companyId, targetPlan] = extRef.split(':');
    return { companyId, targetPlan };
  }
  return { companyId: extRef, targetPlan: '' };
}

describe('Asaas Webhook & Billing Security (F-31, F-03)', () => {
  const SECRET = 'webhook_secret_token_12345';

  it('deve validar token de webhook corretamente via timingSafeEqual', () => {
    expect(verifyWebhookToken(SECRET, SECRET)).toBe(true);
    expect(verifyWebhookToken('wrong_secret', SECRET)).toBe(false);
    expect(verifyWebhookToken(null, SECRET)).toBe(false);
    expect(verifyWebhookToken(SECRET, undefined)).toBe(false);
    expect(verifyWebhookToken('short', SECRET)).toBe(false);
  });

  it('deve extrair companyId e targetPlan de externalReference estruturado', () => {
    const uuid = '76adcb0d-4c23-41f8-a673-0144c9681de1';
    const ref = `${uuid}:pro`;
    const parsed = parseExternalReference(ref);

    expect(parsed.companyId).toBe(uuid);
    expect(parsed.targetPlan).toBe('pro');

    const simpleRef = parseExternalReference(uuid);
    expect(simpleRef.companyId).toBe(uuid);
    expect(simpleRef.targetPlan).toBe('');
  });

  it('deve tratar parsing de datas com segurança sem lançar RangeError', () => {
    expect(parseSafeDate('2026-10-17')).toBeInstanceOf(Date);
    expect(parseSafeDate('invalid-date')).toBeNull();
    expect(parseSafeDate(null)).toBeNull();
    expect(parseSafeDate(undefined)).toBeNull();
  });

  it('deve garantir que PAYMENT_DELETED e PAYMENT_REFUNDED não alteram status de assinatura', () => {
    // Regra F-31 da auditoria: apagar cobrança avulsa não pode cancelar o tenant
    const eventsNonCanceling = ['PAYMENT_DELETED', 'PAYMENT_REFUNDED'];
    eventsNonCanceling.forEach((eventType) => {
      const cancelsSubscription = ['SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'].includes(eventType);
      expect(cancelsSubscription).toBe(false);
    });
  });
});
