import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as expireTrialsGet } from '@/app/api/cron/expire-trials/route';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Cron Expire Trials (F-08 / Security Audit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'test-cron-secret-12345');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deve rejeitar requisição sem cabeçalho Authorization', async () => {
    const req = new Request('http://localhost:3000/api/cron/expire-trials', {
      method: 'GET',
    });

    const res = await expireTrialsGet(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('deve rejeitar requisição com token incorreto', async () => {
    const req = new Request('http://localhost:3000/api/cron/expire-trials', {
      method: 'GET',
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    });

    const res = await expireTrialsGet(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('deve aplicar fail-closed se CRON_SECRET não estiver configurada no ambiente', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const req = new Request('http://localhost:3000/api/cron/expire-trials', {
      method: 'GET',
      headers: {
        authorization: 'Bearer any-token',
      },
    });

    const res = await expireTrialsGet(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('deve executar RPC com sucesso quando o Bearer token for válido', async () => {
    (supabaseAdmin.rpc as any).mockResolvedValue({ data: 3, error: null });

    const req = new Request('http://localhost:3000/api/cron/expire-trials', {
      method: 'GET',
      headers: {
        authorization: 'Bearer test-cron-secret-12345',
      },
    });

    const res = await expireTrialsGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.expired).toBe(3);
    expect(json.timestamp).toBeDefined();
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('expire_overdue_trials');
  });
});
