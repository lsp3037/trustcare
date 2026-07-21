import { describe, it, expect, vi } from 'vitest';
import { generateOrderPdf } from '@/lib/utils/pdfGenerator';

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any) {
      this.setFillColor = vi.fn();
      this.rect = vi.fn();
      this.setTextColor = vi.fn();
      this.setFontSize = vi.fn();
      this.setFont = vi.fn();
      this.text = vi.fn();
      this.splitTextToSize = vi.fn().mockImplementation((text: string) => [text]);
      this.setDrawColor = vi.fn();
      this.line = vi.fn();
      this.addImage = vi.fn();
      this.save = vi.fn();
    }),
  };
});

describe('Official OS PDF Generator', () => {
  it('deve montar e salvar o documento PDF oficial da Ordem de Serviço', () => {
    const orderData = {
      order: {
        codigo_os: 'TC-2026-0001',
        status: 'Em Análise',
        priority: 'Alta',
        service_value: 150,
        discount: 20,
        total_value: 280,
        created_at: '2026-07-21T10:00:00Z',
        equipment_details: 'Notebook Dell Inspiron 15',
        reported_problem: 'Tela quebrada e não liga',
        technical_report: 'Necessária troca de display e limpeza preventiva',
      },
      company: { name: 'Trust Care' },
      client: { name: 'Maria Souza', document: '123.456.789-00', phone: '(11) 98888-7777' },
      items: [{ products_inventory: { nome: 'Display LED 15.6' }, quantity: 1, unit_price: 150 }],
      services: [{ services: { nome: 'Troca de Tela' }, quantidade: 1, preco_unitario: 150 }],
    };

    expect(() => generateOrderPdf(orderData)).not.toThrow();
  });
});
