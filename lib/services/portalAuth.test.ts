import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signPortalToken, verifyPortalToken } from '@/lib/utils/portalSession';
import { POST as requestOtpPost } from '@/app/api/portal/request-otp/route';
import { POST as verifyOtpPost } from '@/app/api/portal/verify-otp/route';
import { GET as portalDataGet } from '@/app/api/portal/data/route';
import { POST as portalLogoutPost } from '@/app/api/portal/logout/route';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Portal do Cliente - Autenticação Segura (F-20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PORTAL_SESSION_SECRET', 'test-portal-secret-with-enough-entropy');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('portalSession sem segredo configurado (fail-closed)', () => {
    beforeEach(() => {
      vi.stubEnv('PORTAL_SESSION_SECRET', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    });

    it('deve recusar assinar token sem segredo', () => {
      expect(() => signPortalToken('cliente@exemplo.com')).toThrow(/PORTAL_SESSION_SECRET/);
    });

    it('deve rejeitar token forjado com o antigo segredo estático', async () => {
      const { createHmac } = await import('crypto');
      const payload = Buffer.from(
        JSON.stringify({ email: 'vitima@exemplo.com', exp: Date.now() + 60_000 })
      ).toString('base64url');
      const sig = createHmac('sha256', 'trustcare-portal-session-internal-secret-key-32chars-min')
        .update(payload)
        .digest('base64url');

      expect(verifyPortalToken(`${payload}.${sig}`)).toBeNull();
    });
  });

  describe('portalSession (HMAC-SHA256)', () => {
    it('deve assinar e verificar um token válido com sucesso', () => {
      const email = 'cliente@exemplo.com';
      const token = signPortalToken(email);

      expect(token).toBeDefined();
      expect(token).toContain('.');

      const session = verifyPortalToken(token);
      expect(session).not.toBeNull();
      expect(session?.email).toBe(email);
    });

    it('deve rejeitar token adulterado na assinatura', () => {
      const email = 'cliente@exemplo.com';
      const token = signPortalToken(email);
      const [payload] = token.split('.');
      const fakeToken = `${payload}.invalidSignatureValue123`;

      const session = verifyPortalToken(fakeToken);
      expect(session).toBeNull();
    });

    it('deve rejeitar token nulo, vazio ou inválido', () => {
      expect(verifyPortalToken('')).toBeNull();
      expect(verifyPortalToken(null)).toBeNull();
      expect(verifyPortalToken('not-a-token')).toBeNull();
    });
  });

  describe('POST /api/portal/request-otp', () => {
    it('deve rejeitar e-mail inválido', async () => {
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });

      const req = new Request('http://localhost:3000/api/portal/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'email-sem-arroba' }),
      });

      const res = await requestOtpPost(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain('e-mail válido');
    });

    it('deve aplicar fail-closed no rate limit', async () => {
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: false, error: null });

      const req = new Request('http://localhost:3000/api/portal/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'cliente@exemplo.com' }),
      });

      const res = await requestOtpPost(req);
      const json = await res.json();
      expect(res.status).toBe(429);
      expect(json.error).toContain('Muitas tentativas');
    });

    const mockClientLookup = (clients: any[]) => {
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });
      (supabaseAdmin.from as any).mockReturnValue({
        select: () => ({ ilike: () => ({ limit: () => Promise.resolve({ data: clients, error: null }) }) }),
      });
    };

    const postOtp = (body: object) =>
      requestOtpPost(
        new Request('http://localhost:3000/api/portal/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      );

    it('não deve revelar se o e-mail existe (anti-enumeração)', async () => {
      mockClientLookup([]);

      const res = await postOtp({ email: 'inexistente@exemplo.com' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.maskedEmail).toBe('in***te@exemplo.com');
      expect(json.tempTokenId).toMatch(/^[0-9a-f-]{36}$/);
      expect(json.error).toBeUndefined();
    });

    it('não deve revelar divergência de documento (anti-enumeração)', async () => {
      mockClientLookup([{ id: '1', name: 'Cliente', email: 'cliente@exemplo.com', document: '11111111111' }]);

      const res = await postOtp({ email: 'cliente@exemplo.com', document: '222.222.222-22' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.tempTokenId).toBeDefined();
    });
  });

  describe('POST /api/portal/verify-otp', () => {
    it('deve rejeitar código de acesso que não contenha 6 dígitos', async () => {
      (supabaseAdmin.rpc as any).mockResolvedValue({ data: true, error: null });

      const req = new Request('http://localhost:3000/api/portal/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempTokenId: '123e4567-e89b-12d3-a456-426614174000',
          code: '123',
        }),
      });

      const res = await verifyOtpPost(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain('inválidos');
    });

    it('deve emitir cookie portal-session assinado ao validar com sucesso', async () => {
      (supabaseAdmin.rpc as any).mockImplementation((func: string) => {
        if (func === 'check_and_clean_rate_limit') {
          return Promise.resolve({ data: true, error: null });
        }
        if (func === 'verify_portal_otp') {
          return Promise.resolve({
            data: { valid: true, email: 'cliente@exemplo.com' },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const req = new Request('http://localhost:3000/api/portal/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempTokenId: '123e4567-e89b-12d3-a456-426614174000',
          code: '123456',
        }),
      });

      const res = await verifyOtpPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('portal-session=');
      expect(setCookie).toContain('HttpOnly');
    });
  });

  describe('GET /api/portal/data', () => {
    it('deve retornar 401 se o cookie de sessão não for fornecido', async () => {
      const req = new Request('http://localhost:3000/api/portal/data', {
        method: 'GET',
      });

      const res = await portalDataGet(req);
      expect(res.status).toBe(401);
    });

    it('deve retornar 401 se o cookie de sessão estiver corrompido', async () => {
      const req = new Request('http://localhost:3000/api/portal/data', {
        method: 'GET',
        headers: {
          cookie: 'portal-session=fake.signature',
        },
      });

      const res = await portalDataGet(req);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/portal/logout', () => {
    it('deve zerar o cookie portal-session', async () => {
      const res = await portalLogoutPost();
      expect(res.status).toBe(200);

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('portal-session=');
      expect(setCookie).toContain('Max-Age=0');
    });
  });
});
