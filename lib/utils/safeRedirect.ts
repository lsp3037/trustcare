/**
 * Sanitiza e valida parâmetros de redirecionamento interno (F-30: Proteção contra Open Redirect).
 * Garante que apenas caminhos relativos ao domínio atual sejam aceitos,
 * prevenindo ataques de manipulação de host como:
 * - @evil.com -> https://app.com@evil.com
 * - //evil.com -> protocol-relative redirect
 * - /\\evil.com -> backslash bypass
 * - javascript: / data: URI
 * - CRLF injection (\r, \n)
 */
export function safeNextPath(raw: string | null | undefined, defaultFallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') {
    return defaultFallback;
  }

  const trimmed = raw.trim();

  // Rejeita strings vazias ou que não comecem com '/'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return defaultFallback;
  }

  // Rejeita caracteres de controle que possam causar header injection ou interpretação ambígua
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return defaultFallback;
  }

  try {
    const dummyOrigin = 'https://internal.trustcare.local';
    const parsed = new URL(trimmed, dummyOrigin);

    // Garante que o origin não sofreu mutação
    if (parsed.origin !== dummyOrigin) {
      return defaultFallback;
    }

    // Retorna estritamente pathname + search + hash sanitizados
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultFallback;
  }
}
