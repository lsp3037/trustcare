/**
 * Cliente da API do Asaas (v3).
 *
 * Docs: https://docs.asaas.com/docs/authentication-2
 * Autenticação: header `access_token` com a API key.
 * O ambiente é inferido do prefixo da própria chave — chaves de produção
 * começam com `$aact_prod_` e as de sandbox com `$aact_hmlg_` — para evitar
 * o erro clássico de apontar chave de homologação para a URL de produção.
 *
 * Este módulo é server-only: ASAAS_API_KEY não tem prefixo NEXT_PUBLIC_, então
 * importá-lo de um componente de cliente quebraria em runtime — o que é o
 * comportamento desejado.
 */

const PRODUCTION_BASE_URL = 'https://api.asaas.com/v3';
const SANDBOX_BASE_URL = 'https://api-sandbox.asaas.com/v3';

export class AsaasError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AsaasError';
    this.status = status;
    this.code = code;
  }
}

export function isAsaasConfigured(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) {
    throw new AsaasError('ASAAS_API_KEY não configurada no ambiente.', 500);
  }
  return key;
}

export function getBaseUrl(): string {
  const key = getApiKey();

  // ASAAS_ENV permite forçar o ambiente; caso contrário deduz pelo prefixo.
  const forced = process.env.ASAAS_ENV;
  if (forced === 'production') return PRODUCTION_BASE_URL;
  if (forced === 'sandbox') return SANDBOX_BASE_URL;

  return key.includes('_prod_') ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

interface AsaasErrorBody {
  errors?: Array<{ code?: string; description?: string }>;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: getApiKey(),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Resposta não-JSON (ex: HTML de erro de gateway)
    }
  }

  if (!res.ok) {
    const errBody = body as AsaasErrorBody | null;
    const first = errBody?.errors?.[0];
    throw new AsaasError(
      first?.description || `Asaas respondeu ${res.status} em ${path}.`,
      res.status,
      first?.code
    );
  }

  return body as T;
}

// ── Clientes ────────────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  externalReference?: string;
}

export interface CreateCustomerInput {
  name: string;
  /** Somente dígitos. Campo obrigatório no Asaas. */
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  /** Usamos o company_id para reencontrar o cliente depois. */
  externalReference: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<AsaasCustomer> {
  return request<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCustomer(customerId: string): Promise<AsaasCustomer | null> {
  try {
    return await request<AsaasCustomer>(`/customers/${customerId}`);
  } catch (err) {
    if (err instanceof AsaasError && (err.status === 404 || err.status === 400)) {
      return null;
    }
    throw err;
  }
}

export async function updateCustomer(
  customerId: string,
  input: Partial<CreateCustomerInput>
): Promise<AsaasCustomer> {
  return request<AsaasCustomer>(`/customers/${customerId}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Assinaturas ─────────────────────────────────────────────────────────────

export type AsaasBillingType = 'UNDEFINED' | 'BOLETO' | 'CREDIT_CARD' | 'PIX';
export type AsaasCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: AsaasCycle;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  nextDueDate: string;
  externalReference?: string;
}

export interface CreateSubscriptionInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  /** Formato YYYY-MM-DD. */
  nextDueDate: string;
  cycle: AsaasCycle;
  description?: string;
  /** `${companyId}:${planId}` — o webhook depende deste formato. */
  externalReference: string;
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<AsaasSubscription> {
  return request<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await request(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
}

// ── Cobranças ───────────────────────────────────────────────────────────────

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  /** Página de fatura do Asaas — é para cá que mandamos o assinante. */
  invoiceUrl?: string;
  bankSlipUrl?: string;
}

interface AsaasList<T> {
  data: T[];
  totalCount: number;
}

export async function listSubscriptionPayments(
  subscriptionId: string
): Promise<AsaasPayment[]> {
  const res = await request<AsaasList<AsaasPayment>>(
    `/subscriptions/${subscriptionId}/payments`
  );
  return res.data || [];
}

/**
 * Devolve a URL da fatura da primeira cobrança da assinatura.
 *
 * O Asaas gera a cobrança de forma assíncrona logo após a criação da
 * assinatura, então a lista pode vir vazia por alguns instantes — daí as
 * tentativas com espera curta.
 */
export async function getFirstInvoiceUrl(
  subscriptionId: string,
  attempts = 4,
  delayMs = 700
): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const payments = await listSubscriptionPayments(subscriptionId);
    const withUrl = payments.find((p) => p.invoiceUrl);
    if (withUrl?.invoiceUrl) return withUrl.invoiceUrl;

    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

/** Data de hoje em YYYY-MM-DD, no fuso de São Paulo. */
export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
