/**
 * Espelha `public.is_company_read_only` (supabase/migrations/*_real_trial_lifecycle.sql).
 * Se divergir, a tela libera ações que a RLS recusa — ou bloqueia o que o banco permite.
 */
const GRACE_MS = 5 * 24 * 60 * 60 * 1000; // 5 dias de carência (past_due e active)

export interface SubscriptionState {
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  trial_ends_at?: string | null;
}

export function isSubscriptionReadOnly(
  { subscription_status: status, subscription_expires_at: expires, trial_ends_at: trialEnds }: SubscriptionState,
  now: Date = new Date(),
): boolean {
  if (!status) return false;
  const expiresAt = expires ? new Date(expires) : null;
  const trialEndsAt = trialEnds ? new Date(trialEnds) : expiresAt;
  const pastGrace = (d: Date) => now.getTime() > d.getTime() + GRACE_MS;

  switch (status) {
    case 'canceled':
      return true;
    case 'past_due':
      return !expiresAt || pastGrace(expiresAt);
    case 'trialing':
      // Trial sem data é tratado como vencido (não existe trial infinito).
      return !trialEndsAt || now.getTime() > trialEndsAt.getTime();
    case 'active':
      // Sem vencimento = conta manual/contrato fora do app: nunca vence por data.
      return !!expiresAt && pastGrace(expiresAt);
    default:
      return false;
  }
}

/**
 * Retorna os dias restantes de trial.
 * Retorna número positivo se ainda em período de avaliação, 0 ou negativo se vencido.
 * Retorna null se a conta não estiver em status 'trialing'.
 */
export function getTrialDaysRemaining(
  { subscription_status: status, subscription_expires_at: expires, trial_ends_at: trialEnds }: SubscriptionState,
  now: Date = new Date(),
): number | null {
  if (status !== 'trialing') return null;
  const targetDate = trialEnds ? new Date(trialEnds) : (expires ? new Date(expires) : null);
  if (!targetDate) return 0;
  const diffMs = targetDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}
