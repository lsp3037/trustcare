import crypto from 'crypto';
import { safeNextPath } from '@/lib/utils/safeRedirect';

/**
 * Validação em tempo constante do token de webhook do Asaas (F-31).
 * Compara os buffers usando crypto.timingSafeEqual prevenindo timing attacks.
 */
export function verifyWebhookToken(
  headerToken: string | null,
  secret: string | undefined = process.env.ASAAS_WEBHOOK_TOKEN
): boolean {
  if (!secret || !headerToken) return false;

  const secretBuffer = Buffer.from(secret);
  const headerBuffer = Buffer.from(headerToken);

  if (secretBuffer.length !== headerBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, headerBuffer);
}

/**
 * Parsing seguro de datas evitando RangeError em formatos inválidos ou corrompidos.
 */
export function parseSafeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Extrai companyId e targetPlan do externalReference estruturado do Asaas.
 * Formato padrão: `companyId:planId` ou fallback `companyId`.
 */
export function parseExternalReference(extRef: string | null | undefined): {
  companyId: string;
  targetPlan: string;
} {
  if (!extRef || typeof extRef !== 'string') return { companyId: '', targetPlan: '' };
  if (extRef.includes(':')) {
    const [companyId, targetPlan] = extRef.split(':');
    return { companyId, targetPlan };
  }
  return { companyId: extRef, targetPlan: '' };
}

/**
 * Determina se a simulação de faturamento é permitida.
 * REQUISITO DE SEGURANÇA (F-03):
 * NUNCA permitida em produção (NODE_ENV=production ou ASAAS_ENVIRONMENT=production).
 * Fora de produção, exige ENABLE_BILLING_SIMULATION='1' explicitamente.
 */
export function isBillingSimulationAllowed(): boolean {
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.ASAAS_ENVIRONMENT === 'production';
  return !isProduction && process.env.ENABLE_BILLING_SIMULATION === '1';
}

/**
 * Retorna a URL base da API do Asaas de acordo com as variáveis de ambiente.
 */
export function getAsaasBaseUrl(): string {
  if (process.env.ASAAS_BASE_URL) {
    return process.env.ASAAS_BASE_URL;
  }

  const isProductionEnv =
    process.env.ASAAS_ENVIRONMENT === 'production' ||
    (process.env.NODE_ENV === 'production' && process.env.ASAAS_ENVIRONMENT !== 'sandbox');

  return isProductionEnv ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/v3';
}

/**
 * Sanitiza URL de redirecionamento do checkout para evitar ataques de Open Redirect.
 * Permite apenas URLs legítimas do gateway Asaas (https://*.asaas.com) ou caminhos relativos internos.
 */
export function safeCheckoutUrl(raw: unknown): string {
  const fallback = '/dashboard/settings/billing?checkout_success=true';
  if (!raw || typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();

  // Caminho relativo interno (ex: redirecionamento de sucesso)
  if (trimmed.startsWith('/')) {
    return safeNextPath(trimmed, fallback);
  }

  // URL absoluta externa: só aceita HTTPS oficial do Asaas
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'asaas.com' || parsed.hostname.endsWith('.asaas.com'))
    ) {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}
