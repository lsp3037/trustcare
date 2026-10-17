import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey, isValidApiKeyFormat, API_KEY_PREFIX } from './apiKey';

describe('API Key Service (F-27, F-38)', () => {
  it('deve gerar chave de API com prefixo e hash SHA-256 corretos', () => {
    const key = generateApiKey();

    expect(key.rawKey.startsWith(API_KEY_PREFIX)).toBe(true);
    // tc_live_ (8 chars) + 48 hex chars = 56 chars
    expect(key.rawKey.length).toBe(56);

    expect(key.prefix.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(key.prefix.endsWith('...')).toBe(true);

    // Hash deve ser SHA-256 com 64 caracteres hexadecimais
    expect(key.keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(key.keyHash).toBe(hashApiKey(key.rawKey));
  });

  it('deve gerar chaves distintas com entropia criptográfica a cada invocação', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1.rawKey).not.toBe(key2.rawKey);
    expect(key1.keyHash).not.toBe(key2.keyHash);
    expect(key1.prefix).not.toBe(key2.prefix);
  });

  it('deve calcular hash SHA-256 determinístico para a mesma chave', () => {
    const raw = 'tc_live_0123456789abcdef0123456789abcdef0123456789abcdef';
    const hash1 = hashApiKey(raw);
    const hash2 = hashApiKey(raw);
    const hashTrimmed = hashApiKey(`  ${raw}  `);

    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hashTrimmed);
    expect(hash1.length).toBe(64);
  });

  it('deve validar formatos de chave de API corretamente', () => {
    const modernKey = generateApiKey().rawKey;
    expect(isValidApiKeyFormat(modernKey)).toBe(true);

    // Chave legada de 32 hex chars
    expect(isValidApiKeyFormat('0123456789abcdef0123456789abcdef')).toBe(true);

    // Formatos inválidos
    expect(isValidApiKeyFormat('')).toBe(false);
    expect(isValidApiKeyFormat('null')).toBe(false);
    expect(isValidApiKeyFormat('tc_live_curta')).toBe(false);
    expect(isValidApiKeyFormat('tc_test_0123456789abcdef0123456789abcdef0123456789abcdef')).toBe(false);
    expect(isValidApiKeyFormat('invalid_chars!@#$%^&*()')).toBe(false);
    expect(isValidApiKeyFormat(null as any)).toBe(false);
    expect(isValidApiKeyFormat(undefined as any)).toBe(false);
  });
});
