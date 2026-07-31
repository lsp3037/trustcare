/**
 * Catálogo de planos — fonte da verdade dos preços.
 *
 * O valor cobrado NUNCA vem do cliente: a rota de checkout resolve o preço
 * daqui a partir do `planId`. A tabela `public.plans` no Postgres guarda as
 * cotas operacionais (técnicos/armazenamento) usadas pela RLS; este arquivo
 * guarda o que o Asaas precisa para faturar.
 */

export const PLAN_IDS = ['starter', 'pro', 'premium'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanConfig {
  id: PlanId;
  name: string;
  /** Em reais. O Asaas recebe `value` como número decimal. */
  price: number;
  description: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29.9,
    description: 'Trust Care Starter — assinatura mensal',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 69.9,
    description: 'Trust Care Pro — assinatura mensal',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 149.9,
    description: 'Trust Care Premium — assinatura mensal',
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}

export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId];
}
