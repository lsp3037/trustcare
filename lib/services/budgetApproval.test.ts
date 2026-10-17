import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as approveBudgetPost } from '@/app/api/orcamento/[id]/approve/route';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Aprovação Segura de Orçamento (F-19)', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve rejeitar UUID inválido no parâmetro de rota', async () => {
    const req = new Request('http://localhost:3000/api/orcamento/invalid-id/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Maria Silva', signature_base64: validSignature }),
    });

    const res = await approveBudgetPost(req, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Identificador de orçamento inválido');
  });

  it('deve rejeitar nome incompleto ou vazio', async () => {
    (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });

    const req = new Request(`http://localhost:3000/api/orcamento/${validUuid}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: ' ', signature_base64: validSignature }),
    });

    const res = await approveBudgetPost(req, {
      params: Promise.resolve({ id: validUuid }),
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('nome completo');
  });

  it('deve rejeitar assinatura sem formato data:image/png;base64', async () => {
    (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });

    const req = new Request(`http://localhost:3000/api/orcamento/${validUuid}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Maria Silva', signature_base64: 'image/jpeg;base64,xxx' }),
    });

    const res = await approveBudgetPost(req, {
      params: Promise.resolve({ id: validUuid }),
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Formato de assinatura inválido');
  });

  it('deve rejeitar assinatura que exceda 200 KB', async () => {
    (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });

    const oversizedSignature = 'data:image/png;base64,' + 'A'.repeat(285000);
    const req = new Request(`http://localhost:3000/api/orcamento/${validUuid}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Maria Silva', signature_base64: oversizedSignature }),
    });

    const res = await approveBudgetPost(req, {
      params: Promise.resolve({ id: validUuid }),
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('200 KB');
  });

  it('deve aplicar fail-closed no rate limit', async () => {
    (supabaseAdmin.rpc as any).mockResolvedValue({ data: false, error: null });

    const req = new Request(`http://localhost:3000/api/orcamento/${validUuid}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Maria Silva', signature_base64: validSignature }),
    });

    const res = await approveBudgetPost(req, {
      params: Promise.resolve({ id: validUuid }),
    });
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.error).toContain('Muitas tentativas');
  });

  it('deve capturar IP do servidor e registrar aprovação com hash e snapshot com sucesso', async () => {
    (supabaseAdmin.rpc as any).mockImplementation((funcName: string, args: any) => {
      if (funcName === 'check_and_clean_rate_limit') {
        return Promise.resolve({ data: true, error: null });
      }
      if (funcName === 'approve_budget_by_client') {
        return Promise.resolve({
          data: {
            success: true,
            approved_total: 580.0,
            approval_hash: 'abc123hash',
            client_ip: args.p_client_ip,
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const req = new Request(`http://localhost:3000/api/orcamento/${validUuid}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-ip': '189.45.67.89',
        'user-agent': 'Mozilla/5.0 TestBrowser',
      },
      body: JSON.stringify({ client_name: 'Maria Silva', signature_base64: validSignature }),
    });

    const res = await approveBudgetPost(req, {
      params: Promise.resolve({ id: validUuid }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.clientIp).toBe('189.45.67.89');
    expect(json.approvedTotal).toBe(580.0);
    expect(json.approvalHash).toBe('abc123hash');

    // Verificar se os argumentos foram passados corretamente para o Postgres
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'approve_budget_by_client',
      expect.objectContaining({
        p_order_id: validUuid,
        p_client_name: 'Maria Silva',
        p_client_ip: '189.45.67.89',
        p_user_agent: 'Mozilla/5.0 TestBrowser',
      })
    );
  });
});
