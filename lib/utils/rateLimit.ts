/**
 * Verifica o rate limit para uma rota pública.
 * Retorna true se a requisição for permitida, false se o IP estiver bloqueado.
 *
 * Falha de forma silenciosa (fail-open) se a chamada de rede falhar,
 * para não prejudicar a UX em caso de erro de infraestrutura.
 */
export async function checkRateLimit(path: string): Promise<boolean> {
  try {
    const res = await fetch('/api/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (res.status === 429) return false;
    return true;
  } catch {
    // Fail-open
    return true;
  }
}
