/**
 * Utilitário para formatação e estruturação profissional de Laudo Técnico e Problema Relatado.
 */

export interface ReportTemplate {
  id: string;
  label: string;
  description: string;
  content: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'geral',
    label: 'Diagnóstico & Reparo Geral',
    description: 'Modelo completo com diagnóstico, serviços, testes e garantia',
    content: `<p><strong>1. DIAGNÓSTICO E CONSTATAÇÃO TÉCNICA:</strong></p>
<p>Equipamento recebido em bancada para análise técnica. Constatada anomalia de funcionamento durante os testes preliminares.</p>
<br>
<p><strong>2. SERVIÇOS EXECUTADOS &amp; COMPONENTES:</strong></p>
<ul>
  <li>Desmontagem técnica completa e inspeção minuciosa dos circuitos</li>
  <li>Reparo/substituição dos componentes avariados</li>
  <li>Limpeza técnica interna preventiva e desoxidação</li>
</ul>
<br>
<p><strong>3. TESTES DE QUALIDADE &amp; ESTRESSE:</strong></p>
<p>Realizados testes funcionais de bancada, validação de estabilidade e verificação de temperatura. Todos os testes aprovados com sucesso.</p>
<br>
<p><strong>4. GARANTIA:</strong></p>
<p>Garantia de 90 dias sobre os serviços executados e componentes aplicados, conforme Código de Defesa do Consumidor.</p>`
  },
  {
    id: 'preventiva',
    label: 'Manutenção Preventiva & Limpeza',
    description: 'Higienização interna, desoxidação e troca de pasta térmica',
    content: `<p><strong>MANUTENÇÃO PREVENTIVA &amp; HIGIENIZAÇÃO TÉCNICA:</strong></p>
<ul>
  <li>Desmontagem completa do equipamento e remoção de resíduos e poeira</li>
  <li>Limpeza e desoxidação química dos conectores e barramentos</li>
  <li>Substituição de pasta térmica por composto de alta condutividade térmica</li>
  <li>Lubrificação e desobstrução das ventoinhas (coolers) de arrefecimento</li>
</ul>
<br>
<p><strong>CONCLUSÃO &amp; TESTES:</strong></p>
<p>Equipamento submetido a teste de carga máxima por 1 hora. Temperaturas operacionais estabilizadas dentro da faixa nominal de fábrica.</p>
<br>
<p><strong>GARANTIA:</strong></p>
<p>Garantia de 90 dias sobre a mão de obra de manutenção preventiva.</p>`
  },
  {
    id: 'hardware',
    label: 'Reparo de Carcaça & Peças',
    description: 'Recuperação de dobradiças, troca de telas ou carcaças',
    content: `<p><strong>REPARO ESTRUTURAL &amp; SUBSTITUIÇÃO DE COMPONENTES:</strong></p>
<ul>
  <li>Reconstrução estrutural das buchas de fixação / insertos metálicos das dobradiças</li>
  <li>Alívio de pressão e regulagem da abertura das hastes para evitar novos rompimentos</li>
  <li>Substituição do componente danificado por peça original / compatível homologada</li>
</ul>
<br>
<p><strong>TESTES REALIZADOS:</strong></p>
<p>Ciclos de abertura e fechamento da carcaça executados sem estresse mecânico. Sinal de vídeo e componentes periféricos 100% operacionais.</p>
<br>
<p><strong>GARANTIA:</strong></p>
<p>Garantia de 90 dias sobre o reparo estrutural e peças substituídas.</p>`
  }
];

const STORAGE_KEY = 'trustcare_custom_report_templates';

export function getStoredTemplates(): ReportTemplate[] {
  if (typeof window === 'undefined') return REPORT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return REPORT_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Erro ao ler templates salvos:', err);
  }
  return REPORT_TEMPLATES;
}

export function saveStoredTemplates(templates: ReportTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Erro ao salvar templates:', err);
  }
}

export function resetStoredTemplates(): ReportTemplate[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return REPORT_TEMPLATES;
}

/**
 * Remove tags HTML e decodifica entidades para trabalhar com texto limpo.
 */
function cleanRawText(htmlOrText: string): string {
  if (!htmlOrText) return '';
  return htmlOrText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Formata um texto livre (ou vindo do Problema Relatado / anotações de orçamento)
 * em um Laudo Técnico HTML profissional e bem estruturado.
 */
export function formatToTechnicalReport(rawContent: string): string {
  const text = cleanRawText(rawContent);
  if (!text) {
    return REPORT_TEMPLATES[0].content;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const items: string[] = [];
  const optionalItems: string[] = [];
  let totalLine = '';
  const generalNotes: string[] = [];
  let isOptionalSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes('opcional') || lower.includes('opcionais')) {
      isOptionalSection = true;
      continue;
    }

    if (lower.startsWith('total:') || lower.startsWith('subtotal:') || lower.startsWith('valor total:')) {
      totalLine = line;
      continue;
    }

    // Identifica linhas que parecem itens / serviços / preços (iniciadas com bullet ou contendo R$)
    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*');
    const hasPrice = /r\$\s*[\d.,]+/i.test(line);

    if (isBullet || hasPrice) {
      const cleanItem = line.replace(/^[•\-\*]\s*/, '').trim();
      if (isOptionalSection) {
        optionalItems.push(cleanItem);
      } else {
        items.push(cleanItem);
      }
    } else {
      generalNotes.push(line);
    }
  }

  // Monta o laudo formatado em HTML
  let html = `<p><strong>LAUDO TÉCNICO &amp; PARECER DO DIAGNÓSTICO</strong></p>`;

  if (generalNotes.length > 0) {
    html += `<p><strong>1. Diagnóstico do Equipamento:</strong></p>`;
    for (const note of generalNotes) {
      html += `<p>${escapeHtml(note)}</p>`;
    }
    html += `<br>`;
  } else {
    html += `<p><strong>1. Diagnóstico do Equipamento:</strong></p>`;
    html += `<p>Equipamento inspecionado e testado em bancada técnica especializada.</p>`;
    html += `<br>`;
  }

  if (items.length > 0) {
    html += `<p><strong>2. Serviços e Peças Detalhadas:</strong></p><ul>`;
    for (const item of items) {
      html += `<li>${escapeHtml(item)}</li>`;
    }
    html += `</ul>`;

    if (totalLine) {
      html += `<p><strong>${escapeHtml(totalLine)}</strong></p>`;
    }
    html += `<br>`;
  }

  if (optionalItems.length > 0) {
    html += `<p><strong>3. Itens Opcionais / Recomendações:</strong></p><ul>`;
    for (const opt of optionalItems) {
      html += `<li>${escapeHtml(opt)}</li>`;
    }
    html += `</ul><br>`;
  }

  html += `<p><strong>${optionalItems.length > 0 ? '4' : '3'}. Testes Realizados &amp; Garantia:</strong></p>`;
  html += `<p>Equipamento testado e aprovado em rotinas operacionais de bancada. Garantia de 90 dias para os serviços e peças executados conforme CDC.</p>`;

  return html;
}

/**
 * Formata o texto simples de problema relatado em tópicos limpos caso o usuário deseje.
 *
 * Texto corrido costuma vir como um único parágrafo ("não liga. faz barulho.
 * esquenta"). Aqui ele é quebrado em sintomas e vira lista — antes a função
 * devolvia o mesmo `<p>` de entrada e o botão "Formatar" parecia não fazer nada.
 */
export function formatReportedProblem(rawContent: string): string {
  const text = cleanRawText(rawContent);
  if (!text) return '';

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const entryPattern = /^([•\-*]|\d+[.)])\s*/;

  // Uma linha só, sem marcadores, é texto corrido: separa por frase.
  // Várias linhas ou marcadores explícitos são intenção do usuário: respeita.
  const entries =
    lines.length === 1 && !entryPattern.test(lines[0])
      ? splitIntoSymptoms(lines[0])
      : lines.map((line) => line.replace(entryPattern, '').trim()).filter(Boolean);

  if (entries.length === 0) return '';

  const html: string[] = [];
  const pendingItems: string[] = [];

  const flushList = () => {
    if (pendingItems.length === 0) return;
    html.push(`<ul>${pendingItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    pendingItems.length = 0;
  };

  for (const entry of entries) {
    const formatted = capitalizeFirst(entry);

    if (/^(sub)?total:/i.test(formatted)) {
      flushList();
      html.push(`<p><strong>${escapeHtml(formatted)}</strong></p>`);
    } else if (entries.length > 1) {
      pendingItems.push(formatted);
    } else {
      html.push(`<p>${escapeHtml(formatted)}</p>`);
    }
  }

  flushList();
  return html.join('');
}

/** Quebra texto corrido em sintomas. Não separa abreviações como "S/N." nem decimais. */
function splitIntoSymptoms(line: string): string[] {
  return line
    .split(/(?<=[.!?;])\s+/)
    .map((part) => part.trim().replace(/[.;]+$/, ''))
    .filter((part) => part.length > 0);
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converte a descrição textual de um serviço em blocos HTML bem formatados.
 */
export function formatServiceDescriptionHtml(serviceName: string, description?: string): string {
  const cleanDesc = description ? description.trim() : '';
  if (!cleanDesc) {
    return `<p><strong>${escapeHtml(serviceName)}:</strong> Serviço realizado conforme especificação técnica.</p>`;
  }

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(cleanDesc);
  let bodyHtml = '';
  if (hasHtml) {
    bodyHtml = cleanDesc;
  } else {
    const lines = cleanDesc.split('\n').map(l => l.trim()).filter(Boolean);
    bodyHtml = lines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
  }

  return `<p><strong>${escapeHtml(serviceName)}:</strong></p>${bodyHtml}`;
}

/**
 * Incorpora o nome e a descrição do serviço no Laudo Técnico sem duplicar caso já esteja presente.
 */
export function appendServiceToTechnicalReport(
  currentReport: string,
  serviceName: string,
  serviceDescription?: string
): { updatedReport: string; added: boolean } {
  const normalizedName = serviceName.trim().toLowerCase();
  const currentLower = (currentReport || '').toLowerCase();

  // Evita duplicar se o serviço já estiver citado no laudo
  if (normalizedName && currentLower.includes(normalizedName)) {
    return { updatedReport: currentReport, added: false };
  }

  const snippet = formatServiceDescriptionHtml(serviceName, serviceDescription);
  const isReportEmpty = !currentReport || currentReport === '<p><br></p>' || currentReport.trim() === '';

  if (isReportEmpty) {
    return { updatedReport: snippet, added: true };
  }

  return { updatedReport: `${currentReport}<br>${snippet}`, added: true };
}
