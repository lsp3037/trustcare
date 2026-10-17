import { describe, it, expect } from 'vitest';
import { safeNextPath } from './safeRedirect';

describe('Safe Redirect Utility (F-30: Open Redirect)', () => {
  it('deve aceitar caminhos relativos válidos', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/dashboard/orders/123')).toBe('/dashboard/orders/123');
    expect(safeNextPath('/portal/dashboard?status=active')).toBe('/portal/dashboard?status=active');
    expect(safeNextPath('/dashboard/settings#security')).toBe('/dashboard/settings#security');
  });

  it('deve rejeitar URLs absolutas externas', () => {
    expect(safeNextPath('https://evil.com')).toBe('/dashboard');
    expect(safeNextPath('http://attacker.org/phishing')).toBe('/dashboard');
    expect(safeNextPath('ftp://files.evil.com')).toBe('/dashboard');
  });

  it('deve rejeitar URLs protocol-relative (//evil.com)', () => {
    expect(safeNextPath('//evil.com')).toBe('/dashboard');
    expect(safeNextPath('///evil.com/path')).toBe('/dashboard');
    expect(safeNextPath('////evil.com')).toBe('/dashboard');
  });

  it('deve rejeitar bypasses com barra invertida (\\)', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/dashboard');
    expect(safeNextPath('\\evil.com')).toBe('/dashboard');
    expect(safeNextPath('/path\\to\\sub')).toBe('/dashboard');
  });

  it('deve rejeitar manipulação de userinfo (@evil.com)', () => {
    expect(safeNextPath('@evil.com')).toBe('/dashboard');
    expect(safeNextPath('.evil.com')).toBe('/dashboard');
  });

  it('deve rejeitar esquemas de URI perigosos (javascript:, data:)', () => {
    expect(safeNextPath('javascript:alert(1)')).toBe('/dashboard');
    expect(safeNextPath('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('/dashboard');
    expect(safeNextPath('vbscript:msgbox(1)')).toBe('/dashboard');
  });

  it('deve rejeitar caracteres de controle e tentativas de CRLF injection', () => {
    expect(safeNextPath('/dashboard\r\nSet-Cookie: hacked=true')).toBe('/dashboard');
    expect(safeNextPath('/dashboard\nLocation: https://evil.com')).toBe('/dashboard');
    expect(safeNextPath('/dashboard\x00evil')).toBe('/dashboard');
  });

  it('deve usar fallback customizado quando fornecido', () => {
    expect(safeNextPath('https://evil.com', '/login')).toBe('/login');
    expect(safeNextPath(null, '/custom')).toBe('/custom');
    expect(safeNextPath(undefined, '/fallback')).toBe('/fallback');
    expect(safeNextPath('', '/login')).toBe('/login');
  });
});
