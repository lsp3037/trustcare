import { test, expect } from '@playwright/test';
import { seedDashboardSession } from './fixtures';

test.describe('Fluxo de Ordem de Serviço (NewOrderForm)', () => {
  test.beforeEach(async ({ context }) => {
    await seedDashboardSession(context);
  });

  test('deve carregar a tela de criação de OS e permitir interação com os campos', async ({ page }) => {
    await page.goto('/dashboard/orders');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ordens de Serviço');

    // Abre o formulário de criação
    await page.getByRole('button', { name: /nova ordem de serviço/i }).click();

    // O painel de criação assume o lugar da listagem
    await expect(page.getByRole('heading', { name: 'Nova Ordem de Serviço' })).toBeVisible();
    await expect(page.getByText(/Cadastre um novo chamado técnico/i)).toBeVisible();

    // Blocos do formulário
    await expect(page.getByRole('heading', { name: /Informações Iniciais/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Status & Prioridade/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Atribuição e Prazo/i })).toBeVisible();
  });

  test('deve permitir preencher os campos de status, prioridade e valores', async ({ page }) => {
    await page.goto('/dashboard/orders?new=true');

    // Status e prioridade saem da fonte única `OS_STATUS_FLOW`
    const statusSelect = page.getByLabel('Status', { exact: true });
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption('Em Análise');
    await expect(statusSelect).toHaveValue('Em Análise');

    const prioritySelect = page.getByLabel('Prioridade', { exact: true });
    await prioritySelect.selectOption('Alta');
    await expect(prioritySelect).toHaveValue('Alta');

    // Mão de obra alimenta o total exibido no rodapé
    await page.getByLabel(/Mão de Obra \(R\$\)/i).fill('250');
    await expect(page.getByText(/Valor Total da O\.S\./i)).toBeVisible();
    await expect(page.getByText('R$ 250,00')).toBeVisible();

    // Desconto aparece como linha própria quando maior que zero
    await page.getByLabel(/Desconto \(R\$\)/i).fill('50');
    await expect(page.getByText(/Desconto:/i)).toBeVisible();
    await expect(page.getByText('R$ 200,00')).toBeVisible();
  });

  test('deve exigir a seleção de um cliente antes de salvar', async ({ page }) => {
    await page.goto('/dashboard/orders?new=true');

    const clientSelect = page.getByLabel('Cliente', { exact: true });
    await expect(clientSelect).toBeVisible();
    await expect(clientSelect).toHaveValue('');

    // O campo é obrigatório, então o submit não navega nem confirma sucesso
    await page.getByRole('button', { name: /Salvar Ordem de Serviço/i }).click();
    await expect(page.getByText(/aberta com sucesso/i)).toHaveCount(0);
    await expect(clientSelect).toHaveValue('');
  });
});
