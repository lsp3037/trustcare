import { test, expect, type Page } from '@playwright/test';
import { budgetFixture, mockSupabaseRpc, mockClientIp } from './fixtures';

const BUDGET_URL = `/orcamento/${budgetFixture.order.id}`;

/** Desenha um traço no canvas de assinatura, disparando o `onSave`. */
async function drawSignature(page: Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  // `boundingBox()` não rola a página — sem isso o canvas fica abaixo da
  // dobra e os eventos de mouse miram coordenadas fora da área visível.
  await canvas.scrollIntoViewIfNeeded();

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas de assinatura sem dimensões.');

  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.6, { steps: 8 });
  await page.mouse.up();
}

test.describe('Fluxo Público de Aprovação de Orçamento (/orcamento/[id])', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseRpc(page, 'get_public_budget_details', budgetFixture);
    await mockClientIp(page);
  });

  test('deve carregar a tela de orçamento com resumo de valores e laudo técnico', async ({ page }) => {
    await page.goto(BUDGET_URL);

    // Cabeçalho do chamado
    await expect(page.getByText(/Orçamento & Diagnóstico Técnico/i)).toBeVisible();
    await expect(page.getByText(`#OS-${budgetFixture.order.codigo_os}`)).toBeVisible();

    // Laudo técnico
    await expect(page.getByText(/Laudo Técnico & Parecer do Diagnóstico/i)).toBeVisible();
    await expect(page.getByText(budgetFixture.order.technical_report)).toBeVisible();

    // Demonstrativo de valores — itens, serviços, desconto e total
    await expect(page.getByText(/Demonstrativo de Valores/i)).toBeVisible();
    await expect(page.getByText('Pasta Térmica Grizzly')).toBeVisible();
    await expect(page.getByText('Limpeza Interna Completa')).toBeVisible();
    await expect(page.getByText(/Desconto: - R\$ 20\.00/)).toBeVisible();
    await expect(page.getByText('Valor total', { exact: true })).toBeVisible();
    await expect(page.getByText('R$ 580.00')).toBeVisible();

    // Seção de assinatura eletrônica
    await expect(page.getByText(/Assinatura Eletrônica do Cliente/i)).toBeVisible();
  });

  test('deve bloquear aprovação se o nome ou a assinatura no canvas não forem informados', async ({ page }) => {
    await page.goto(BUDGET_URL);

    const approveBtn = page.getByRole('button', { name: /Aprovar Orçamento e Iniciar Serviço/i });
    await expect(approveBtn).toBeVisible();

    // A validação é inline, no próprio campo — não mais por `window.alert`.
    let approvalAttempted = false;
    await page.route('**/rest/v1/rpc/approve_budget_by_client*', (route) => {
      approvalAttempted = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
    });

    // Nenhum diálogo nativo deve aparecer em nenhum momento.
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    // 1. Sem nome e sem assinatura — os dois erros aparecem de uma vez
    await approveBtn.click();
    await expect(page.getByText(/Informe seu nome por extenso/i)).toBeVisible();
    await expect(page.getByText(/Assine no painel abaixo/i)).toBeVisible();

    // 2. Com nome, o erro do nome some e sobra o da assinatura
    await page.getByLabel(/Nome completo do signatário/i).fill('Maria Oliveira');
    await approveBtn.click();
    await expect(page.getByText(/Informe seu nome por extenso/i)).toHaveCount(0);
    await expect(page.getByText(/Assine no painel abaixo/i)).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(approvalAttempted).toBe(false);
    // Segue na tela de aprovação, sem confirmação de sucesso.
    await expect(page.getByText(/Orçamento Aprovado/i)).toHaveCount(0);
  });

  test('deve permitir desenhar no canvas de assinatura, preencher nome e aprovar com sucesso', async ({ page }) => {
    await mockSupabaseRpc(page, 'approve_budget_by_client', true);
    await page.goto(BUDGET_URL);

    await page.getByLabel(/Nome completo do signatário/i).fill('Maria Oliveira');
    await drawSignature(page);

    await page.getByRole('button', { name: /Aprovar Orçamento e Iniciar Serviço/i }).click();

    // Tela de confirmação com os dados de auditoria
    await expect(page.getByText(/Orçamento Aprovado/i)).toBeVisible();
    await expect(page.getByText(/Assinatura e Auditoria Registradas/i)).toBeVisible();
    await expect(page.getByText('Maria Oliveira')).toBeVisible();
    await expect(page.getByText('203.0.113.10')).toBeVisible();
    await expect(page.getByAltText(/Assinatura digital/i)).toBeVisible();
  });
});
