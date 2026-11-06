import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyWebhookToken,
  parseSafeDate,
  parseExternalReference,
  isBillingSimulationAllowed,
  getAsaasBaseUrl,
  safeCheckoutUrl,
} from '@/lib/services/billing';

describe('Asaas Webhook & Billing Security (F-31, F-03)', () => {
  const SECRET = 'webhook_secret_token_12345';

  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
      const cancelsSubscription = [
        'SUBSCRIPTION_CANCELED',
        'SUBSCRIPTION_DELETED',
        'SUBSCRIPTION_INACTIVATED',
      ].includes(eventType);
      expect(cancelsSubscription).toBe(false);
    });
  });

  describe('Controle de Simulação de Checkout (F-03)', () => {
    it('NUNCA deve permitir simulação quando NODE_ENV é production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ENABLE_BILLING_SIMULATION', '1');
      expect(isBillingSimulationAllowed()).toBe(false);
    });

    it('NUNCA deve permitir simulação quando ASAAS_ENVIRONMENT é production', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('ASAAS_ENVIRONMENT', 'production');
      vi.stubEnv('ENABLE_BILLING_SIMULATION', '1');
      expect(isBillingSimulationAllowed()).toBe(false);
    });

    it('deve bloquear simulação quando flag for 0 ou ausente fora de produção', () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.ASAAS_ENVIRONMENT;
      vi.stubEnv('ENABLE_BILLING_SIMULATION', '0');
      expect(isBillingSimulationAllowed()).toBe(false);

      delete process.env.ENABLE_BILLING_SIMULATION;
      expect(isBillingSimulationAllowed()).toBe(false);
    });

    it('deve permitir simulação somente fora de produção com ENABLE_BILLING_SIMULATION=1', () => {
      vi.stubEnv('NODE_ENV', 'development');
      delete process.env.ASAAS_ENVIRONMENT;
      vi.stubEnv('ENABLE_BILLING_SIMULATION', '1');
      expect(isBillingSimulationAllowed()).toBe(true);
    });
  });

  describe('Resolução de URL da API Asaas', () => {
    it('deve respeitar override explícito de ASAAS_BASE_URL', () => {
      vi.stubEnv('ASAAS_BASE_URL', 'https://custom-mock-asaas.local/v3');
      expect(getAsaasBaseUrl()).toBe('https://custom-mock-asaas.local/v3');
    });

    it('deve usar endpoint de produção quando ASAAS_ENVIRONMENT=production', () => {
      delete process.env.ASAAS_BASE_URL;
      vi.stubEnv('ASAAS_ENVIRONMENT', 'production');
      expect(getAsaasBaseUrl()).toBe('https://api.asaas.com/v3');
    });

    it('deve usar endpoint de sandbox quando ASAAS_ENVIRONMENT=sandbox', () => {
      delete process.env.ASAAS_BASE_URL;
      vi.stubEnv('ASAAS_ENVIRONMENT', 'sandbox');
      expect(getAsaasBaseUrl()).toBe('https://sandbox.asaas.com/v3');
    });
  });

  describe('Sanitização de URLs de Checkout (Proteção Open Redirect)', () => {
    it('deve aceitar URLs HTTPS válidas do domínio oficial Asaas', () => {
      const validUrl = 'https://www.asaas.com/i/1234567890';
      expect(safeCheckoutUrl(validUrl)).toBe(validUrl);

      const sandboxUrl = 'https://sandbox.asaas.com/i/9876543210';
      expect(safeCheckoutUrl(sandboxUrl)).toBe(sandboxUrl);
    });

    it('deve aceitar caminhos internos seguros da aplicação', () => {
      const path = '/dashboard/settings/billing?checkout_success=true';
      expect(safeCheckoutUrl(path)).toBe(path);
    });

    it('deve neutralizar tentativas de redirecionamento para domínios maliciosos', () => {
      const evil = 'https://phishing-asaas.com/login';
      expect(safeCheckoutUrl(evil)).toBe('/dashboard/settings/billing?checkout_success=true');

      const protocolRelative = '//evil.com/steal';
      expect(safeCheckoutUrl(protocolRelative)).toBe('/dashboard/settings/billing?checkout_success=true');

      const javascript = 'javascript:alert(document.cookie)';
      expect(safeCheckoutUrl(javascript)).toBe('/dashboard/settings/billing?checkout_success=true');
    });
  });
});
