import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isPlatformAdmin } from './platformAdmin';

describe('Platform Admin Verification (F-32)', () => {
  const originalEnv = process.env.PLATFORM_ADMIN_EMAILS;

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = 'superadmin@trustcare.com.br,owner@trustcare.com.br';
  });

  afterEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = originalEnv;
  });

  it('deve rejeitar usuário nulo ou sem e-mail', () => {
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
    expect(isPlatformAdmin({ id: '123' })).toBe(false);
  });

  it('deve exigir email_confirmed_at para conceder acesso de super-admin', () => {
    const unconfirmedUser = {
      id: '1',
      email: 'superadmin@trustcare.com.br',
      email_confirmed_at: null,
      app_metadata: { role: 'platform_admin' },
    };

    expect(isPlatformAdmin(unconfirmedUser)).toBe(false);
  });

  it('deve aprovar super-admin via app_metadata.role = platform_admin com e-mail confirmado', () => {
    const adminUser = {
      id: '1',
      email: 'qualquer@dominio.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { role: 'platform_admin' },
    };

    expect(isPlatformAdmin(adminUser)).toBe(true);
  });

  it('deve aprovar super-admin listado na variável de ambiente PLATFORM_ADMIN_EMAILS', () => {
    const envAdminUser = {
      id: '2',
      email: 'owner@trustcare.com.br',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: {},
    };

    expect(isPlatformAdmin(envAdminUser)).toBe(true);
  });

  it('deve rejeitar usuário comum mesmo com email confirmado', () => {
    const normalUser = {
      id: '3',
      email: 'tecnico@empresa.com.br',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      app_metadata: { role: 'technician' },
    };

    expect(isPlatformAdmin(normalUser)).toBe(false);
  });
});
