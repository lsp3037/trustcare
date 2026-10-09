import { describe, it, expect, vi } from 'vitest';
import { sendTransactionalEmail } from '@/lib/services/email';

describe('Transactional Email Service (Resend)', () => {
  it('deve simular envio com sucesso quando RESEND_API_KEY não está presente', async () => {
    delete process.env.RESEND_API_KEY;

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

  it('deve escapar HTML e neutralizar URLs perigosas no template', async () => {
    process.env.RESEND_API_KEY = 're_test';
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

    delete process.env.RESEND_API_KEY;
    vi.doUnmock('resend');
  });
});
