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
});
