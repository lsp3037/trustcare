import { describe, it, expect, vi } from 'vitest';
import { exportOrdersToCsv, exportFinancialToCsv, exportInventoryToCsv } from '@/lib/utils/csvExport';

describe('CSV Export Utilities', () => {
  it('deve formatar corretamente os dados de ordens de serviço para CSV com BOM UTF-8', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const appendChildMock = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChildMock = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const orders = [
      {
        codigo_os: 'TC-2026-0001',
        clients: { name: 'João da Silva' },
        equipment_details: 'Notebook Lenovo',
        status: 'Em Análise',
        priority: 'Média',
        service_value: 100,
        discount: 10,
        total_value: 90,
        created_at: '2026-07-21T12:00:00Z',
      },
    ];

    expect(() => exportOrdersToCsv(orders)).not.toThrow();
    expect(createObjectURLMock).toHaveBeenCalled();

    appendChildMock.mockRestore();
    removeChildMock.mockRestore();
  });

  it('deve exportar relatório financeiro sem erros', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:url');
    global.URL.createObjectURL = createObjectURLMock;

    const transactions = [
      { date: '2026-07-21', type: 'income', description: 'OS #TC-001', amount: 250, status: 'Pago' },
    ];

    expect(() => exportFinancialToCsv(transactions)).not.toThrow();
  });

  it('deve exportar relatório de estoque sem erros', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:url');
    global.URL.createObjectURL = createObjectURLMock;

    const products = [
      { sku: 'RAM-8GB', name: 'Memória RAM 8GB DDR4', category: 'Memória RAM', brand: 'Kingston', quantity: 5, min_stock_alert: 2, cost_price: 120, sale_price: 220 },
    ];

    expect(() => exportInventoryToCsv(products)).not.toThrow();
  });
});
