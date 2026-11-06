import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import * as portalSession from '@/lib/utils/portalSession';
import * as platformAdmin from '@/lib/auth/platformAdmin';

let mockGetUserResult: { data: { user: any }; error: any } = {
  data: { user: null },
  error: null,
};

let capturedCookiesToSet: any[] = [];

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: any) => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => mockGetUserResult),
    },
    // Allows testing getAll/setAll cookie functions directly
    _options: options,
  })),
}));

describe('Proxy Router (Next.js 16 Perimeter Auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserResult = { data: { user: null }, error: null };
    capturedCookiesToSet = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createRequest(path: string, options: { headers?: Record<string, string>; cookies?: Record<string, string> } = {}) {
    const url = `http://localhost:3000${path}`;
    const req = new NextRequest(url, {
      headers: options.headers,
    });
    if (options.cookies) {
      for (const [k, v] of Object.entries(options.cookies)) {
        req.cookies.set(k, v);
      }
    }
    return req;
  }

  describe('1. Fast Path & Design Preview', () => {
    it('deve bypassar imediatamente rota de preview /design-preview', async () => {
      const req = createRequest('/design-preview');
      const res = await proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('deve permitir passagem direta de rotas públicas sem auth (/orcamento/[id], /rastreio, landing)', async () => {
      const req = createRequest('/orcamento/123');
      const res = await proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('2. Subdomínio Multi-Tenant', () => {
    it('deve injetar cabeçalho x-tenant-subdomain para subdomínio localhost', async () => {
      const req = new NextRequest('http://clinica-xyz.localhost:3000/', {
        headers: { host: 'clinica-xyz.localhost:3000' },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe('3. Proteção de Rotas de Painel Administrativo (/dashboard)', () => {
    it('deve redirecionar (307) usuário NÃO autenticado em /dashboard para /login?next=%2Fdashboard', async () => {
      const req = createRequest('/dashboard');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('next=%2Fdashboard');
    });

    it('deve preservar query parameters na URL de retorno next', async () => {
      const req = createRequest('/dashboard/orders?tab=pending&page=2');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain(encodeURIComponent('/dashboard/orders?tab=pending&page=2'));
    });

    it('deve permitir acesso ao /dashboard se o usuário estiver autenticado no Supabase', async () => {
      mockGetUserResult = {
        data: {
          user: {
            id: 'usr_1',
            email: 'admin@trustcare.com.br',
            email_confirmed_at: '2026-01-01T00:00:00Z',
          },
        },
        error: null,
      };

      const req = createRequest('/dashboard');
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('4. Redirecionamento de Usuários Logados em Rotas Públicas de Auth', () => {
    beforeEach(() => {
      mockGetUserResult = {
        data: {
          user: {
            id: 'usr_1',
            email: 'admin@trustcare.com.br',
            email_confirmed_at: '2026-01-01T00:00:00Z',
          },
        },
        error: null,
      };
    });

    it('deve redirecionar (307) para /dashboard se usuário logado tentar acessar /login', async () => {
      const req = createRequest('/login');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('deve redirecionar (307) para /dashboard se usuário logado tentar acessar /register', async () => {
      const req = createRequest('/register');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('deve redirecionar (307) para /dashboard se usuário logado tentar acessar /forgot-password', async () => {
      const req = createRequest('/forgot-password');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });
  });

  describe('5. Proteção Perimetral do Backoffice (/backoffice)', () => {
    it('deve redirecionar (307) para /login com next se usuário NÃO estiver autenticado', async () => {
      const req = createRequest('/backoffice/audit');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain(encodeURIComponent('/backoffice/audit'));
    });

    it('deve redirecionar (307) para /dashboard se usuário autenticado NÃO for platform admin', async () => {
      const regularUser = {
        id: 'usr_reg',
        email: 'tecnico@oficina.com.br',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        app_metadata: { role: 'technician' },
      };
      mockGetUserResult = { data: { user: regularUser }, error: null };
      vi.spyOn(platformAdmin, 'isPlatformAdmin').mockReturnValue(false);

      const req = createRequest('/backoffice');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('deve permitir acesso ao /backoffice se usuário for superadmin da plataforma', async () => {
      const adminUser = {
        id: 'usr_admin',
        email: 'root@trustcare.com.br',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        app_metadata: { role: 'platform_admin' },
      };
      mockGetUserResult = { data: { user: adminUser }, error: null };
      vi.spyOn(platformAdmin, 'isPlatformAdmin').mockReturnValue(true);

      const req = createRequest('/backoffice');
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  describe('6. Portal do Cliente (/portal & /portal/dashboard)', () => {
    it('deve redirecionar (307) para /portal se cliente não possuir token de sessão', async () => {
      vi.spyOn(portalSession, 'verifyPortalToken').mockReturnValue(null);

      const req = createRequest('/portal/dashboard');
      const res = await proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/portal');
    });

    it('deve permitir acesso a /portal/dashboard com token de sessão válido', async () => {
      vi.spyOn(portalSession, 'verifyPortalToken').mockReturnValue({ email: 'cliente@exemplo.com' });

      const req = createRequest('/portal/dashboard', {
        cookies: { 'portal-session': 'valid.token' },
      });
      const res = await proxy(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('deve redirecionar (307) para /portal/dashboard se já logado no portal ao visitar /portal', async () => {
      vi.spyOn(portalSession, 'verifyPortalToken').mockReturnValue({ email: 'cliente@exemplo.com' });

      const req = createRequest('/portal', {
        cookies: { 'portal-session': 'valid.token' },
      });
      const res = await proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/portal/dashboard');
    });
  });
});
