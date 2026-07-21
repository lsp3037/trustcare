import { test, expect } from '@playwright/test';

test.describe('Fluxo de Ordem de Serviço (NewOrderForm)', () => {
  test.beforeEach(async ({ page, context }) => {
    // Adiciona o cookie de autenticação mock para que o proxy.ts permita o acesso ao dashboard
    await context.addCookies([
      {
        name: 'os-session-mock',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('deve carregar a tela de criação de OS e permitir interação com os campos', async ({ page }) => {
    await page.goto('/dashboard/orders');

    // Verifica se estamos no dashboard de ordens de serviço
    await expect(page.locator('h1')).toContainText('Ordens de Serviço');

    // Clica no botão de criar nova OS (se presente na página)
    const newOrderBtn = page.getByRole('button', { name: /nova ordem/i });
    if (await newOrderBtn.isVisible()) {
      await newOrderBtn.click();
    }

    // Garante que o formulário foi exibido
    const formHeading = page.getByText(/Abrir Nova Ordem de Serviço|Dados da Ordem de Serviço/i);
    await expect(formHeading.first()).toBeVisible();
  });
});
