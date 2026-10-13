import { describe, it, expect } from 'vitest';
import {
  formatToTechnicalReport,
  formatReportedProblem,
  REPORT_TEMPLATES,
  getStoredTemplates,
  saveStoredTemplates,
  resetStoredTemplates,
} from './reportFormatter';

describe('reportFormatter', () => {
  it('deve retornar o modelo padrão se o conteúdo for vazio', () => {
    const result = formatToTechnicalReport('');
    expect(result).toBe(REPORT_TEMPLATES[0].content);
  });

  it('deve estruturar itens e totais em um laudo técnico formatado', () => {
    const raw = `
      • Inserto roscado de latão (material e mão de obra): R$ 200,00
      • Tela nova Full HD 15,6" compatível com o G3-572: R$ 370,00
      Total: R$ 570,00
      Itens opcionais:
      • Bateria nova Acer: R$ 280,00
    `;
    const result = formatToTechnicalReport(raw);

    expect(result).toContain('LAUDO TÉCNICO &amp; PARECER DO DIAGNÓSTICO');
    expect(result).toContain('Inserto roscado de latão');
    expect(result).toContain('Total: R$ 570,00');
    expect(result).toContain('Itens Opcionais');
    expect(result).toContain('Bateria nova Acer');
    expect(result).toContain('Garantia de 90 dias');
  });

  it('deve formatar o problema relatado com bullets', () => {
    const raw = `
      • Tela piscando
      • Conector solto
    `;
    const result = formatReportedProblem(raw);
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Tela piscando</li>');
    expect(result).toContain('<li>Conector solto</li>');
  });

  it('deve salvar e carregar templates do localStorage', () => {
    const custom = [{ id: 'teste', label: 'Teste', description: 'Desc', content: '<p>Teste</p>' }];
    saveStoredTemplates(custom);
    expect(getStoredTemplates()).toEqual(custom);

    resetStoredTemplates();
    expect(getStoredTemplates()).toEqual(REPORT_TEMPLATES);
  });
});
