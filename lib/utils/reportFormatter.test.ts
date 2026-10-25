import { describe, it, expect } from 'vitest';
import {
  formatToTechnicalReport,
  formatReportedProblem,
  REPORT_TEMPLATES,
  getStoredTemplates,
  saveStoredTemplates,
  resetStoredTemplates,
  appendServiceToTechnicalReport,
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

  it('deve salvar e carregar templates do localStorage', () => {
    const custom = [{ id: 'teste', label: 'Teste', description: 'Desc', content: '<p>Teste</p>' }];
    saveStoredTemplates(custom);
    expect(getStoredTemplates()).toEqual(custom);

    resetStoredTemplates();
    expect(getStoredTemplates()).toEqual(REPORT_TEMPLATES);
  });

  it('deve incorporar a descrição de um serviço ao laudo técnico', () => {
    const serviceName = 'Limpeza e Troca de Pasta Térmica';
    const description = 'O serviço inclui:\n✅ Limpeza Técnica Completa\n✅ Troca de pasta térmica de prata';

    const result = appendServiceToTechnicalReport('', serviceName, description);
    expect(result.added).toBe(true);
    expect(result.updatedReport).toContain('Limpeza e Troca de Pasta Térmica');
    expect(result.updatedReport).toContain('Limpeza Técnica Completa');
    expect(result.updatedReport).toContain('Troca de pasta térmica de prata');

    // Não deve duplicar se o serviço já estiver no laudo
    const duplicate = appendServiceToTechnicalReport(result.updatedReport, serviceName, description);
    expect(duplicate.added).toBe(false);
    expect(duplicate.updatedReport).toBe(result.updatedReport);
  });
});

describe('formatReportedProblem', () => {
  it('quebra texto corrido em uma lista de sintomas', () => {
    const result = formatReportedProblem(
      '<p>notebook não liga. faz barulho na ventoinha. esquenta muito</p>',
    );

    expect(result).toBe(
      '<ul><li>Notebook não liga</li><li>Faz barulho na ventoinha</li><li>Esquenta muito</li></ul>',
    );
  });

  it('respeita tópicos que o usuário já escreveu', () => {
    const result = formatReportedProblem('<p>- tela quebrada</p><p>- teclado falhando</p>');

    expect(result).toBe('<ul><li>Tela quebrada</li><li>Teclado falhando</li></ul>');
  });

  it('mantém bullets já existentes', () => {
    const result = formatReportedProblem('• Tela piscando\n• Conector solto');

    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Tela piscando</li>');
    expect(result).toContain('<li>Conector solto</li>');
  });

  it('mantém um sintoma único como parágrafo', () => {
    expect(formatReportedProblem('Tela quebrada')).toBe('<p>Tela quebrada</p>');
  });

  it('destaca a linha de total', () => {
    const result = formatReportedProblem('tela quebrada\ntotal: 250,00');

    expect(result).toContain('<li>Tela quebrada</li>');
    expect(result).toContain('<strong>Total: 250,00</strong>');
  });

  it('não quebra valores decimais ao separar frases', () => {
    const result = formatReportedProblem('Orçamento 180.50 aprovado. Cliente autorizou');

    expect(result).toContain('<li>Orçamento 180.50 aprovado</li>');
    expect(result).toContain('<li>Cliente autorizou</li>');
  });

  it('escapa HTML para não injetar marcação', () => {
    const result = formatReportedProblem('5 < 10. tela piscando');

    expect(result).toContain('5 &lt; 10');
    expect(result).not.toContain('<li>5 < 10');
  });

  it('devolve vazio para conteúdo vazio', () => {
    expect(formatReportedProblem('<p><br></p>')).toBe('');
  });
});
