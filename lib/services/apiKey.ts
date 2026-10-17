import crypto from 'crypto';

export interface GeneratedApiKey {
  rawKey: string;
  keyHash: string;
  prefix: string;
}

export const API_KEY_PREFIX = 'tc_live_';

/**
 * Gera uma nova chave de API criptograficamente segura.
 * Retorna a chave em texto puro (para ser exibida uma única vez ao usuário),
 * o hash SHA-256 (para ser armazenado no banco) e o prefixo identificador.
 */
export function generateApiKey(): GeneratedApiKey {
  const entropy = crypto.randomBytes(24).toString('hex'); // 48 caracteres hex
  const rawKey = `${API_KEY_PREFIX}${entropy}`;
  const keyHash = hashApiKey(rawKey);
  const prefix = `${API_KEY_PREFIX}${entropy.substring(0, 6)}...`;

  return {
    rawKey,
    keyHash,
    prefix,
  };
}

/**
 * Calcula o hash SHA-256 em hexadecimal da chave fornecida.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

/**
 * Validação segura de formato de API key.
 * Aceita o formato moderno (tc_live_...) ou formato legado (32 caracteres hex).
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  // Formato moderno: tc_live_[48 hex chars]
  if (/^tc_live_[a-f0-9]{32,64}$/i.test(trimmed)) return true;
  // Formato legado: 32 hex chars
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return true;
  return false;
}
