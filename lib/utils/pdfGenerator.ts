import jsPDF from 'jspdf';

export interface OrderPdfData {
  order: any;
  company: any;
  client: any;
  items?: any[];
  services?: any[];
}

export function generateOrderPdf({ order, company, client, items = [], services = [] }: OrderPdfData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const osCode = order.codigo_os || (order.id ? order.id.slice(0, 8) : 'OS-1');
  const companyName = company?.name || 'TRUST CARE';

  let y = 15;

  // ── CABEÇALHO ──────────────────────────────────────────────────────────
  doc.setFillColor(9, 9, 11); // #09090b
  doc.rect(10, 10, 190, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 15, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(161, 161, 170);
  doc.text('ASSISTÊNCIA TÉCNICA ESPECIALIZADA EM TI', 15, y + 11);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`ORDEM DE SERVIÇO #${osCode}`, 195, y + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(161, 161, 170);
  const createdDate = order.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  doc.text(`Emissão: ${createdDate}`, 195, y + 11, { align: 'right' });

  y = 42;

  // ── PROPRIETÁRIO & EQUIPAMENTO ──────────────────────────────────────────
  doc.setFillColor(244, 244, 245);
  doc.rect(10, y, 190, 26, 'F');
  doc.setDrawColor(228, 228, 231);
  doc.rect(10, y, 190, 26, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 39, 42);
  doc.text('DADOS DO CLIENTE', 14, y + 6);
  doc.text('DADOS DO EQUIPAMENTO', 105, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  
  const clientName = client?.name || 'Cliente';
  const clientDoc = client?.document || '—';
  const clientPhone = client?.phone || '—';
  doc.text(`Nome: ${clientName}`, 14, y + 13);
  doc.text(`CPF/CNPJ: ${clientDoc} | Tel: ${clientPhone}`, 14, y + 19);

  const equipSpecs = order.equipment_details || 'Equipamento em análise';
  doc.text(`Aparelho: ${equipSpecs}`, 105, y + 13);
  doc.text(`Status: ${order.status || 'Em Análise'} | Prioridade: ${order.priority || 'Média'}`, 105, y + 19);

  y += 32;

  // ── DIAGNÓSTICO TÉCNICO & PROBLEMA ─────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text('PROBLEMA RELATADO & DIAGNÓSTICO TÉCNICO', 10, y);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  // Limpa tags HTML do problema se houver
  const problemClean = (order.reported_problem || 'Problema relatado pelo cliente.').replace(/<[^>]*>?/gm, '');
  const problemLines = doc.splitTextToSize(problemClean, 190);
  doc.text(problemLines, 10, y + 6);
  y += 6 + (problemLines.length * 4);

  if (order.technical_report) {
    doc.setFont('helvetica', 'bold');
    doc.text('Parecer Técnico:', 10, y + 2);
    doc.setFont('helvetica', 'normal');
    const reportLines = doc.splitTextToSize(order.technical_report, 190);
    doc.text(reportLines, 10, y + 7);
    y += 8 + (reportLines.length * 4);
  }

  y += 4;

  // ── PEÇAS E SERVIÇOS DETALHADOS ─────────────────────────────────────────
  doc.setFillColor(9, 9, 11);
  doc.rect(10, y, 190, 7, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIÇÃO DOS SERVIÇOS E PEÇAS APLICADAS', 14, y + 5);
  doc.text('QTD', 140, y + 5, { align: 'center' });
  doc.text('UNITÁRIO', 165, y + 5, { align: 'right' });
  doc.text('SUBTOTAL', 195, y + 5, { align: 'right' });

  y += 7;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  let hasItems = false;

  if (Number(order.service_value) > 0) {
    hasItems = true;
    doc.text('Mão de obra e serviços técnicos gerais', 14, y + 5);
    doc.text('1', 140, y + 5, { align: 'center' });
    doc.text(`R$ ${Number(order.service_value).toFixed(2)}`, 165, y + 5, { align: 'right' });
    doc.text(`R$ ${Number(order.service_value).toFixed(2)}`, 195, y + 5, { align: 'right' });
    y += 7;
  }

  services.forEach((serv) => {
    hasItems = true;
    const name = serv.services?.nome || serv.name || 'Serviço do catálogo';
    const qty = serv.quantidade || serv.quantity || 1;
    const price = Number(serv.preco_unitario || serv.unit_price || 0);
    const subtotal = qty * price;

    doc.text(name, 14, y + 5);
    doc.text(String(qty), 140, y + 5, { align: 'center' });
    doc.text(`R$ ${price.toFixed(2)}`, 165, y + 5, { align: 'right' });
    doc.text(`R$ ${subtotal.toFixed(2)}`, 195, y + 5, { align: 'right' });
    y += 7;
  });

  items.forEach((item) => {
    hasItems = true;
    const name = item.products_inventory?.nome || item.name || 'Peça em estoque';
    const qty = item.quantity || 1;
    const price = Number(item.unit_price || 0);
    const subtotal = qty * price;

    doc.text(name, 14, y + 5);
    doc.text(String(qty), 140, y + 5, { align: 'center' });
    doc.text(`R$ ${price.toFixed(2)}`, 165, y + 5, { align: 'right' });
    doc.text(`R$ ${subtotal.toFixed(2)}`, 195, y + 5, { align: 'right' });
    y += 7;
  });

  if (!hasItems) {
    doc.text('Nenhum item ou serviço discriminado até o momento.', 14, y + 5);
    y += 7;
  }

  y += 4;

  // ── RESUMO FINANCEIRO ──────────────────────────────────────────────────
  doc.setFillColor(244, 244, 245);
  doc.rect(120, y, 80, 20, 'F');
  doc.setDrawColor(228, 228, 231);
  doc.rect(120, y, 80, 20, 'S');

  const subtotal = Number(order.subtotal_value || order.total_value || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total_value || 0);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Subtotal: R$ ${subtotal.toFixed(2)}`, 195, y + 5, { align: 'right' });
  if (discount > 0) {
    doc.text(`Desconto: - R$ ${discount.toFixed(2)}`, 195, y + 10, { align: 'right' });
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`VALOR TOTAL: R$ ${total.toFixed(2)}`, 195, y + 16, { align: 'right' });

  y += 26;

  // ── TERMOS DE GARANTIA E ASSINATURA ────────────────────────────────────
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TERMO DE GARANTIA E CONDIÇÕES DE SERVIÇO (LEI Nº 8.078/90 - CDC)', 10, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const termsText = '1. Os serviços prestados e peças substituídas contam com garantia de 90 (noventa) dias a partir da data de retirada/conclusão.\n2. A garantia perde a validade em caso de selo violado, quedas, contato com líquidos ou intervenção por técnicos não autorizados.\n3. Aparelhos não retirados em até 90 dias após notificação estarão sujeitos a cobrança de taxa diária de permanência.';
  doc.text(doc.splitTextToSize(termsText, 190), 10, y + 4);

  y += 22;

  // Assinatura
  if (order.client_signature) {
    try {
      doc.addImage(order.client_signature, 'PNG', 120, y - 10, 60, 18);
    } catch (_) {}
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(39, 39, 42);
    doc.text(`Assinado por: ${order.client_signature_name || clientName}`, 150, y + 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Aceite Digital em ${order.client_signature_at ? new Date(order.client_signature_at).toLocaleString('pt-BR') : '—'}`, 150, y + 14, { align: 'center' });
  } else {
    doc.setDrawColor(161, 161, 170);
    doc.line(30, y + 10, 90, y + 10);
    doc.line(120, y + 10, 180, y + 10);

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Assinatura do Técnico Responsável', 60, y + 14, { align: 'center' });
    doc.text('Assinatura do Cliente / Proprietário', 150, y + 14, { align: 'center' });
  }

  const filename = `Ordem_de_Servico_#OS-${osCode}.pdf`;
  doc.save(filename);
}
