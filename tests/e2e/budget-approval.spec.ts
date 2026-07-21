import { test, expect } from '@playwright/test';

test.describe('Fluxo Público de Aprovação de Orçamento (/orcamento/[id])', () => {

  test('deve carregar a tela de orçamento com resumo de valores e laudo técnico', async ({ page }) => {
    // Acessa a rota pública de orçamento com id de teste/mock
    await page.goto('/orcamento/mock-os-1');

    // Valida se o cabeçalho do chamado e marca são exibidos
    await expect(page.getByText(/Orçamento & Diagnóstico Técnico/i)).toBeVisible();

    // Valida demonstrativo de valores
    await expect(page.getByText(/Demonstrativo de Valores/i)).toBeVisible();
    await expect(page.getByText(/Valor Total/i)).toBeVisible();

    // Valida seção de assinatura eletrônica
    await expect(page.getByText(/Assinatura Eletrônica do Cliente/i)).toBeVisible();
  });

  test('deve bloquear aprovação se o nome ou a assinatura no canvas não forem informados', async ({ page }) => {
    await page.goto('/orcamento/mock-os-1');

    // Tenta clicar no botão de aprovação sem preencher nome ou desenhar assinatura
    const approveBtn = page.getByRole('button', { name: /Aprovar Orçamento e Iniciar Serviço/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Deve exibir mensagem de erro amigável na tela
    const errorAlert = page.getByText(/digite seu nome completo e faça a assinatura/i);
    await expect(errorAlert).toBeVisible();
  });

  test('deve permitir desenhar no canvas de assinatura, preencher nome e aprovar com sucesso', async ({ page }) => {
    await page.goto('/orcamento/mock-os-1');

    // 1. Preenche o nome do cliente signatário
    const nameInput = page.getByPlaceholder('[Digite seu nome por extenso]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Carlos Alberto da Silva');

    // 2. Simula o traço vetorial de assinatura dentro do canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (box) {
      // Simula arrastar o cursor dentro do canvas para gerar o desenho base64
      await page.mouse.move(box.x + 20, box.y + 30);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 50);
      await page.mouse.move(box.x + 150, box.y + 30);
      await page.mouse.up();
    }

    // 3. Clica no botão de aprovação
    const approveBtn = page.getByRole('button', { name: /Aprovar Orçamento e Iniciar Serviço/i });
    await approveBtn.click();

    // 4. Valida se a tela exibe o recibo de confirmação de aprovação com sucesso
    await expect(page.getByText(/Orçamento Aprovado/i).first()).toBeVisible();
    await expect(page.getByText(/Carlos Alberto da Silva/i)).toBeVisible();
  });

});
