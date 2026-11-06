import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendTransactionalEmail } from '@/lib/services/email';

describe('Transactional Email Service (Resend)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deve simular envio com sucesso quando RESEND_API_KEY não está presente fora de produção', async () => {
    delete process.env.RESEND_API_KEY;
    vi.stubEnv('NODE_ENV', 'test');

    const result = await sendTransactionalEmail({
      to: 'cliente@exemplo.com',
      subject: 'Teste de Orçamento',
      type: 'budget_ready',
      clientName: 'João da Silva',
      orderCode: 'TC-2026-0001',
      equipment: 'Notebook Dell Inspiron',
      budgetUrl: 'http://localhost:3000/orcamento/123',
      trackingUrl: 'http://localhost:3000/rastreio?id=123',
      totalValue: '350.00',
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
  });

  it('deve falhar de forma controlada quando RESEND_API_KEY não está presente em produção', async () => {
    delete process.env.RESEND_API_KEY;
    vi.stubEnv('NODE_ENV', 'production');

    const result = await sendTransactionalEmail({
      to: 'cliente@exemplo.com',
      subject: 'Teste de Produção',
      type: 'new_order',
      clientName: 'Maria Santos',
      orderCode: 'TC-2026-0002',
      equipment: 'MacBook Air M2',
      trackingUrl: 'https://app.trustcare.com.br/rastreio?id=456',
    });

    expect(result.success).toBe(false);
    expect(result.simulated).toBeUndefined();
    expect(result.error).toContain('não configurado');
  });

  it('deve escapar HTML e neutralizar URLs perigosas no template', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const send = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null });
    vi.resetModules();
    vi.doMock('resend', () => ({ Resend: class { emails = { send }; } }));
    const { sendTransactionalEmail: sendFresh } = await import('@/lib/services/email');

    await sendFresh({
      to: 'cliente@exemplo.com',
      subject: 'Assunto',
      type: 'budget_ready',
      clientName: '<img src=x onerror=alert(1)>',
      orderCode: 'TC-2026-0001',
      equipment: '<script>x</script>',
      budgetUrl: 'javascript:alert(1)',
      trackingUrl: 'https://app.exemplo.com/rastreio?id=1',
    });

    const html: string = send.mock.calls[0][0].html;
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('&lt;img');

    vi.doUnmock('resend');
  });
});
