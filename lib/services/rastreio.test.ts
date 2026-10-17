import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as requestTokenPost } from '@/app/api/rastreio/request-token/route';
import { POST as verifyTokenPost } from '@/app/api/rastreio/verify-token/route';

// Mock do supabaseAdmin
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Rastreio Seguro - Rotas de Token (F-21, F-28)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/rastreio/request-token', () => {
    it('deve rejeitar busca com caracteres inválidos / injeção de filtro', async () => {
      // Mock do rate limit permitindo
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });

      const maliciousPayloads = [
        'TC-2026-0001,id.neq.00000000-0000-0000-0000-000000000000',
        '12345', // muito curto
        'SELECT * FROM orders',
        '<script>alert(1)</script>',
        'uuid-prefix-8'
      ];

      for (const searchId of maliciousPayloads) {
        const req = new Request('http://localhost:3000/api/rastreio/request-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchId }),
        });

        const res = await requestTokenPost(req);
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.error).toContain('Código de OS inválido');
      }
    });

    it('deve aplicar fail-closed se o rate limit falhar ou for bloqueado', async () => {
      // Rate limit retornando erro ou false
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: false, error: null });

      const req = new Request('http://localhost:3000/api/rastreio/request-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId: 'TC-2026-0001' }),
      });

      const res = await requestTokenPost(req);
      const json = await res.json();
      expect(res.status).toBe(429);
      expect(json.error).toContain('Muitas tentativas');
    });

    it('deve aplicar fail-closed se a RPC de rate limit disparar erro', async () => {
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: null, error: new Error('DB connection failed') });

      const req = new Request('http://localhost:3000/api/rastreio/request-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId: 'TC-2026-0001' }),
      });

      const res = await requestTokenPost(req);
      const json = await res.json();
      expect(res.status).toBe(429);
    });
  });

  describe('POST /api/rastreio/verify-token', () => {
    it('deve rejeitar tempTokenId inválido ou código que não seja 6 dígitos', async () => {
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });

      const invalidPayloads = [
        { tempTokenId: 'not-a-uuid', code: '123456' },
        { tempTokenId: '123e4567-e89b-12d3-a456-426614174000', code: '123' },
        { tempTokenId: '123e4567-e89b-12d3-a456-426614174000', code: 'abcdef' },
        { tempTokenId: '123e4567-e89b-12d3-a456-426614174000', code: '1234567' },
      ];

      for (const payload of invalidPayloads) {
        const req = new Request('http://localhost:3000/api/rastreio/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const res = await verifyTokenPost(req);
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.error).toBe('Parâmetros inválidos.');
      }
    });

    it('deve acionar bloqueio 429 quando limite de tentativas for excedido na RPC', async () => {
      // 1. Rate limit permitindo
      (supabaseAdmin.rpc as any).mockImplementation((funcName: string) => {
        if (funcName === 'check_and_clean_rate_limit') {
          return Promise.resolve({ data: true, error: null });
        }
        if (funcName === 'verify_tracking_otp') {
          return Promise.resolve({
            data: { valid: false, reason: 'MAX_ATTEMPTS_EXCEEDED' },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const req = new Request('http://localhost:3000/api/rastreio/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempTokenId: '123e4567-e89b-12d3-a456-426614174000',
          code: '123456',
        }),
      });

      const res = await verifyTokenPost(req);
      const json = await res.json();
      expect(res.status).toBe(429);
      expect(json.error).toContain('Número máximo de tentativas excedido');
    });

    it('deve informar tentativas restantes quando código estiver incorreto', async () => {
      (supabaseAdmin.rpc as any).mockImplementation((funcName: string) => {
        if (funcName === 'check_and_clean_rate_limit') {
          return Promise.resolve({ data: true, error: null });
        }
        if (funcName === 'verify_tracking_otp') {
          return Promise.resolve({
            data: { valid: false, reason: 'INVALID_CODE', remaining_attempts: 3 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const req = new Request('http://localhost:3000/api/rastreio/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempTokenId: '123e4567-e89b-12d3-a456-426614174000',
          code: '999999',
        }),
      });

      const res = await verifyTokenPost(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain('Tentativas restantes: 3');
    });
  });
});
