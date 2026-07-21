/**
 * Utilitário de exportação de dados para planilhas CSV compatíveis com Excel (UTF-8 BOM + ;)
 */

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(cell: string | number | boolean | null | undefined): string {
  if (cell === null || cell === undefined) return '';
  const str = String(cell);
  if (str.includes(';') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(
  filenameOrData: string | Record<string, any>[],
  headersOrFilename?: string[] | string,
  rowsData?: (string | number | boolean | null | undefined)[][]
) {
  if (Array.isArray(filenameOrData)) {
    const data = filenameOrData;
    const rawFilename = typeof headersOrFilename === 'string' ? headersOrFilename : 'Relatorio';
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => item[h]));
    return exportToCsv(rawFilename, headers, rows);
  }

  const filename = filenameOrData as string;
  const headers = (headersOrFilename as string[]) || [];
  const rows = rowsData || [];

  const headerLine = headers.map(escapeCsvCell).join(';');
  const rowLines = rows.map(row => row.map(escapeCsvCell).join(';'));
  const csvContent = [headerLine, ...rowLines].join('\r\n');
  downloadCsv(filename, csvContent);
}

// ── Exporte especializado de Ordens de Serviço ─────────────────────────
export function exportOrdersToCsv(orders: any[]) {
  const headers = ['Código OS', 'Cliente', 'Equipamento', 'Status', 'Prioridade', 'Valor Serviço', 'Desconto', 'Valor Total', 'Data Abertura'];
  
  const rows = orders.map(os => {
    const code = os.codigo_os || (os.id ? os.id.slice(0, 8) : '—');
    const clientName = os.clients?.name || '—';
    const equipment = os.equipment_details || os.client_equipments?.name || '—';
    const status = os.status || '—';
    const priority = os.priority || '—';
    const serviceVal = os.service_value ? Number(os.service_value).toFixed(2) : '0.00';
    const discount = os.discount ? Number(os.discount).toFixed(2) : '0.00';
    const totalVal = os.total_value ? Number(os.total_value).toFixed(2) : '0.00';
    const createdDate = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '—';

    return [code, clientName, equipment, status, priority, serviceVal, discount, totalVal, createdDate];
  });

  const filename = `Relatorio_OS_TrustCare_${new Date().toISOString().slice(0, 10)}.csv`;
  exportToCsv(filename, headers, rows);
}

// ── Exporte especializado de Financeiro ─────────────────────────────
export function exportFinancialToCsv(transactions: any[]) {
  const headers = ['Data', 'Tipo', 'Descrição / Categoria', 'Valor (R$)', 'Status / Recorrência'];

  const rows = transactions.map(item => {
    const date = item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '—';
    const type = item.type === 'income' ? 'Receita' : 'Despesa';
    const description = item.description || item.category || '—';
    const amount = Number(item.amount || 0).toFixed(2);
    const status = item.status || item.recurrence || 'Único';

    return [date, type, description, amount, status];
  });

  const filename = `Relatorio_Financeiro_TrustCare_${new Date().toISOString().slice(0, 10)}.csv`;
  exportToCsv(filename, headers, rows);
}

// ── Exporte especializado de Estoque / Inventário ───────────────────
export function exportInventoryToCsv(products: any[]) {
  const headers = ['SKU', 'Descrição / Nome', 'Categoria', 'Marca', 'Estoque Qtd', 'Alerta Mínimo', 'Preço Custo (R$)', 'Preço Venda (R$)', 'Total em Estoque (R$)'];

  const rows = products.map(prod => {
    const sku = prod.sku || '—';
    const name = prod.name || prod.nome || '—';
    const category = prod.category || prod.categoria || 'Geral';
    const brand = prod.brand || prod.marca || '—';
    const qty = prod.quantity ?? 0;
    const minAlert = prod.min_stock_alert ?? 0;
    const costPrice = Number(prod.cost_price || 0).toFixed(2);
    const salePrice = Number(prod.sale_price || 0).toFixed(2);
    const totalInventoryValue = (qty * (Number(prod.sale_price) || 0)).toFixed(2);

    return [sku, name, category, brand, qty, minAlert, costPrice, salePrice, totalInventoryValue];
  });

  const filename = `Posicao_Estoque_TrustCare_${new Date().toISOString().slice(0, 10)}.csv`;
  exportToCsv(filename, headers, rows);
}
