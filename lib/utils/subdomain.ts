/**
 * Utilitário para extração de subdomínios de forma resiliente tanto no cliente quanto no servidor.
 * Em ambiente de desenvolvimento (localhost/127.0.0.1), permite simular subdomínios via query param (?subdomain=coyote).
 */
export function getSubdomain(hostname: string, searchParams?: URLSearchParams): string | null {
  if (!hostname) return null;

  // Em localhost ou 127.0.0.1, extrai o subdomínio do parâmetro de busca para testes locais rápidos
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    if (searchParams) {
      return searchParams.get('subdomain');
    }
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('subdomain');
    }
    return null;
  }

  const parts = hostname.split('.');

  // Exemplo: tenant.trustcare-one.vercel.app -> parts = ['tenant', 'trustcare-one', 'vercel', 'app']
  if (hostname.endsWith('.vercel.app')) {
    if (parts.length > 3) {
      return parts[0];
    }
    return null;
  }

  // Exemplo: tenant.trustcare.com.br -> parts = ['tenant', 'trustcare', 'com', 'br']
  if (parts.length > 3) {
    return parts[0];
  }

  // Exemplo: tenant.trustcare.com -> parts = ['tenant', 'trustcare', 'com']
  if (parts.length > 2) {
    return parts[0];
  }

  return null;
}
