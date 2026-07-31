import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AsaasError,
  createCustomer,
  createSubscription,
  getBaseUrl,
  getCustomer,
  getFirstInvoiceUrl,
  isAsaasConfigured,
  todayInSaoPaulo,
} from '@/lib/services/asaas';
import { PLANS, isPlanId, getPlan } from '@/lib/config/plans';

const PROD_KEY = '$aact_prod_000000000000';
const SANDBOX_KEY = '$aact_hmlg_000000000000';

function mockFetch(responses: Array<{ status?: number; body: unknown }>) {
  const fn = vi.fn();
  responses.forEach(({ status = 200, body }) => {
    fn.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    });
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('catálogo de planos', () => {
  it('só aceita os ids conhecidos', () => {
    expect(isPlanId('pro')).toBe(true);
    expect(isPlanId('premium')).toBe(true);
    expect(isPlanId('basico')).toBe(false); // plano legado, removido do banco
    expect(isPlanId('gratis')).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });

  it('mantém os preços fora do alcance do cliente', () => {
    // Guarda contra alteração acidental de preço — o valor cobrado sai daqui.
    expect(getPlan('starter').price).toBe(29.9);
    expect(getPlan('pro').price).toBe(69.9);
    expect(getPlan('premium').price).toBe(149.9);
  });

  it('não tem plano com preço zero ou negativo', () => {
    Object.values(PLANS).forEach((plan) => {
      expect(plan.price).toBeGreaterThan(0);
    });
  });
});

describe('seleção de ambiente', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ASAAS_API_KEY;
    delete process.env.ASAAS_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('aponta para produção com chave de produção', () => {
    process.env.ASAAS_API_KEY = PROD_KEY;
    expect(getBaseUrl()).toBe('https://api.asaas.com/v3');
  });

  it('aponta para sandbox com chave de homologação', () => {
    process.env.ASAAS_API_KEY = SANDBOX_KEY;
    expect(getBaseUrl()).toBe('https://api-sandbox.asaas.com/v3');
  });

  it('ASAAS_ENV tem precedência sobre o prefixo da chave', () => {
    process.env.ASAAS_API_KEY = PROD_KEY;
    process.env.ASAAS_ENV = 'sandbox';
    expect(getBaseUrl()).toBe('https://api-sandbox.asaas.com/v3');
  });

  it('reporta ausência de configuração em vez de assumir um padrão', () => {
    expect(isAsaasConfigured()).toBe(false);
    process.env.ASAAS_API_KEY = SANDBOX_KEY;
    expect(isAsaasConfigured()).toBe(true);
  });
});

describe('chamadas à API', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ASAAS_API_KEY = SANDBOX_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('envia a API key no header access_token', async () => {
    const fetchMock = mockFetch([{ body: { id: 'cus_1', name: 'ACME', cpfCnpj: '123' } }]);

    await createCustomer({
      name: 'ACME',
      cpfCnpj: '12345678909',
      externalReference: 'company-uuid',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api-sandbox.asaas.com/v3/customers');
    expect(init.method).toBe('POST');
    expect(init.headers.access_token).toBe(SANDBOX_KEY);
  });

  it('traduz o erro do Asaas para AsaasError com a descrição original', async () => {
    mockFetch([
      {
        status: 400,
        body: { errors: [{ code: 'invalid_cpfCnpj', description: 'CPF ou CNPJ inválido' }] },
      },
    ]);

    await expect(
      createCustomer({ name: 'ACME', cpfCnpj: '111', externalReference: 'c' })
    ).rejects.toMatchObject({
      name: 'AsaasError',
      status: 400,
      code: 'invalid_cpfCnpj',
      message: 'CPF ou CNPJ inválido',
    });
  });

  it('trata cliente inexistente como null em vez de estourar', async () => {
    mockFetch([{ status: 404, body: { errors: [{ description: 'não encontrado' }] } }]);
    await expect(getCustomer('cus_inexistente')).resolves.toBeNull();
  });

  it('propaga erros que não são "não encontrado"', async () => {
    mockFetch([{ status: 500, body: { errors: [{ description: 'boom' }] } }]);
    await expect(getCustomer('cus_1')).rejects.toBeInstanceOf(AsaasError);
  });

  it('manda externalReference no formato que o webhook espera', async () => {
    const fetchMock = mockFetch([{ body: { id: 'sub_1' } }]);

    await createSubscription({
      customer: 'cus_1',
      billingType: 'UNDEFINED',
      value: 69.9,
      nextDueDate: '2026-07-31',
      cycle: 'MONTHLY',
      externalReference: 'company-uuid:pro',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.externalReference).toBe('company-uuid:pro');
    expect(body.value).toBe(69.9);
    expect(body.cycle).toBe('MONTHLY');
  });

  it('reconsulta a fatura enquanto o Asaas ainda não gerou a cobrança', async () => {
    mockFetch([
      { body: { data: [], totalCount: 0 } },
      { body: { data: [{ id: 'pay_1', invoiceUrl: 'https://asaas.com/i/abc' }], totalCount: 1 } },
    ]);

    const url = await getFirstInvoiceUrl('sub_1', 3, 0);
    expect(url).toBe('https://asaas.com/i/abc');
  });

  it('devolve null quando a fatura não aparece dentro das tentativas', async () => {
    mockFetch([
      { body: { data: [], totalCount: 0 } },
      { body: { data: [], totalCount: 0 } },
    ]);

    const url = await getFirstInvoiceUrl('sub_1', 2, 0);
    expect(url).toBeNull();
  });
});

describe('todayInSaoPaulo', () => {
  it('devolve YYYY-MM-DD, formato aceito por nextDueDate', () => {
    expect(todayInSaoPaulo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('usa o fuso de São Paulo, não UTC', () => {
    // 01/08/2026 00:30 UTC ainda é 31/07 em São Paulo (UTC-3).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T00:30:00Z'));
    expect(todayInSaoPaulo()).toBe('2026-07-31');
    vi.useRealTimers();
  });
});
