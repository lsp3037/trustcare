import type { BrowserContext, Page } from '@playwright/test';

/**
 * Utilitários compartilhados pelas specs de e2e.
 *
 * As telas do app leem tudo do Supabase. Sem um banco semeado, os testes
 * batem em RLS/RPC e caem na tela de erro — foi por isso que a suíte
 * estava vermelha. Aqui interceptamos as chamadas HTTP do supabase-js
 * (`/rest/v1/...`) e devolvemos fixtures, para que os testes verifiquem
 * o comportamento da UI sem depender de infraestrutura externa.
 */

/** Fixture da RPC `get_public_budget_details` (orçamento público). */
export const budgetFixture = {
  order: {
    id: '11111111-2222-3333-4444-555555555555',
    codigo_os: 'TC-2026-0001',
    // A tela só mostra o corpo do orçamento neste status.
    status: 'Aguardando Aprovação',
    equipment_details: 'Notebook Dell Latitude 3420 (S/N: PE091728)',
    technical_report: 'Diagnóstico: dissipador obstruído e pasta térmica degradada.',
    service_value: '150.00',
    discount: '20.00',
    total_value: '580.00',
    client_signature: null,
    client_signature_name: null,
    client_signature_ip: null,
    client_signature_at: null,
  },
  company: {
    name: 'Trust Care T.I.',
    logo_url: '',
    subdomain: '',
  },
  client: {
    name: 'Tech Solutions Ltda',
  },
  items: [
    { product_name: 'Pasta Térmica Grizzly', quantity: 1, unit_price: 90 },
  ],
  services: [
    { service_name: 'Limpeza Interna Completa', quantidade: 1, subtotal: '360.00' },
  ],
};

/** Intercepta uma RPC do Supabase e responde com `payload`. */
export async function mockSupabaseRpc(page: Page, fnName: string, payload: unknown) {
  await page.route(`**/rest/v1/rpc/${fnName}*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    }),
  );
}

/** Impede que a busca de IP externa (ipify) faça o teste depender da internet. */
export async function mockClientIp(page: Page, ip = '203.0.113.10') {
  await page.route('**/api.ipify.org**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ip }),
    }),
  );
}

/**
 * Prepara uma sessão autenticada de dashboard.
 *
 * Além do cookie que o middleware exige, semeia a empresa no localStorage.
 * Sem isso o `OnboardingModal` abre — ele aparece sempre que a empresa
 * está com os valores padrão do mock — e o overlay `fixed inset-0`
 * intercepta todo clique na página.
 */
export async function seedDashboardSession(context: BrowserContext) {
  await context.addCookies([
    { name: 'os-session-mock', value: 'true', domain: 'localhost', path: '/' },
  ]);

  await context.addInitScript(() => {
    localStorage.setItem('company-onboarded', 'true');
    localStorage.setItem(
      'mock-company-settings',
      JSON.stringify({
        id: 'e2e-company',
        name: 'Assistência E2E',
        phone: '(11) 4000-0000',
        email: 'e2e@trustcare.test',
        // Precisa ser não-vazio: `isDefaultCompany` exige logo vazia para
        // reabrir o onboarding, mesmo com `company-onboarded=true`.
        logo_url: '/logo.png',
        whatsapp: '(11) 4000-0000',
        subscription_plan: 'pro',
        subscription_status: 'active',
      }),
    );
    localStorage.setItem('os-theme', 'dark');
  });
}
