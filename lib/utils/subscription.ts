/**
 * Espelha `public.is_company_read_only` (supabase/migrations/*_active_subscription_expiry.sql).
 * Se divergir, a tela libera ações que a RLS recusa — ou bloqueia o que o banco permite.
 */
const GRACE_MS = 5 * 24 * 60 * 60 * 1000; // 5 dias de carência (past_due e active)

export interface SubscriptionState {
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
}

export function isSubscriptionReadOnly(
  { subscription_status: status, subscription_expires_at: expires }: SubscriptionState,
  now: Date = new Date(),
): boolean {
  if (!status) return false;
  const expiresAt = expires ? new Date(expires) : null;
  const pastGrace = (d: Date) => now.getTime() > d.getTime() + GRACE_MS;

  switch (status) {
    case 'canceled':
      return true;
    case 'past_due':
      return !expiresAt || pastGrace(expiresAt);
    case 'trialing':
      // Trial sem data é tratado como vencido (não existe trial infinito).
      return !expiresAt || now.getTime() > expiresAt.getTime();
    case 'active':
      // Sem vencimento = conta manual/contrato fora do app: nunca vence por data.
      return !!expiresAt && pastGrace(expiresAt);
    default:
      return false;
  }
}
