/**
 * Verifica o rate limit para uma rota no servidor.
 * Retorna true se a requisição for permitida, false se o limite foi atingido
 * ou se houve falha de verificação (fail-closed para segurança - F-33).
 */
export async function checkRateLimit(path: string): Promise<boolean> {
  try {
    const res = await fetch('/api/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (res.status === 429) return false;
    if (!res.ok) return false;

    const data = await res.json().catch(() => ({ allowed: false }));
    return data.allowed === true;
  } catch {
    // Fail-closed: se a infraestrutura falhar ou rede cair, bloqueia
    return false;
  }
}
