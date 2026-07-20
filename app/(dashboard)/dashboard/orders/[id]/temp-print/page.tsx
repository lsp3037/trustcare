'use client';
import { AlertTriangle, Building, Printer, FileText } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ChecklistTemplateItem {
  id: string;
  label: string;
}

const DEFAULT_TEMPLATE_ITEMS: ChecklistTemplateItem[] = [
  { id: 'charger', label: 'Carregador' },
  { id: 'battery', label: 'Bateria' },
  { id: 'screen', label: 'Tela / Display' },
  { id: 'keyboard', label: 'Teclado' },
  { id: 'casing', label: 'Carcaça' },
  { id: 'power_on', label: 'Ligar / Dar Vídeo' },
  { id: 'removable_media', label: 'Mídia Removível' },
  { id: 'missing_screws', label: 'Parafusos Ausentes' }
];

export default function TempPrintPreviewPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [order, setOrder] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [company, setCompany] = useState<any>({
    name: 'Trust Care T.I.',
    phone: '(66) 99999-9999',
    email: 'contato@trustcare.com.br',
    logo_url: ''
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [checklistTemplateItems, setChecklistTemplateItems] = useState<ChecklistTemplateItem[]>(DEFAULT_TEMPLATE_ITEMS);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // 1. Busca O.S. e dados do cliente no Supabase
        const { data: osData, error: osErr } = await supabase
          .from('service_orders')
          .select('*, clients(*)')
          .eq('id', id)
          .single();

        if (osErr) throw osErr;

        if (osData) {
          setOrder(osData);
          setClient(osData.clients);

          // Busca template de checklist com base na categoria do equipamento
          if (osData.equipment_id) {
            try {
              const { data: eqData } = await supabase
                .from('client_equipments')
                .select('category_id')
                .eq('id', osData.equipment_id)
                .single();
              
              if (eqData && eqData.category_id) {
                const { data: templateData } = await supabase
                  .from('checklist_templates')
                  .select('schema')
                  .eq('category_id', eqData.category_id)
                  .maybeSingle();
                
                if (templateData && templateData.schema && Array.isArray(templateData.schema.items)) {
                  setChecklistTemplateItems(templateData.schema.items);
                } else {
                  // Tenta mock local
                  const mockTemplatesStr = localStorage.getItem('mock-checklist-templates');
                  const mockTemplates = mockTemplatesStr ? JSON.parse(mockTemplatesStr) : {};
                  if (mockTemplates[eqData.category_id] && Array.isArray(mockTemplates[eqData.category_id].items)) {
                    setChecklistTemplateItems(mockTemplates[eqData.category_id].items);
                  } else {
                    setChecklistTemplateItems(DEFAULT_TEMPLATE_ITEMS);
                  }
                }
              } else {
                setChecklistTemplateItems(DEFAULT_TEMPLATE_ITEMS);
              }
            } catch (err) {
              console.warn('Erro ao carregar template do checklist, usando padrão:', err);
              setChecklistTemplateItems(DEFAULT_TEMPLATE_ITEMS);
            }
          } else {
            setChecklistTemplateItems(DEFAULT_TEMPLATE_ITEMS);
          }

          // 2. Busca Peças alocadas à O.S.
          const { data: itemsData } = await supabase
            .from('service_order_items')
            .select('*, products_inventory(name)')
            .eq('service_order_id', id);

          if (itemsData) {
            setSelectedProducts(itemsData.map((item: any) => ({
              name: item.products_inventory?.name || 'Peça do Estoque',
              quantity: item.quantity,
              unit_price: item.unit_price,
            })));
          }

          // 3. Busca Serviços vinculados
          const { data: servicesData } = await supabase
            .from('order_services')
            .select('*, services(nome)')
            .eq('os_id', id);

          if (servicesData) {
            setSelectedServices(servicesData.map((item: any) => ({
              name: item.services?.nome || 'Serviço do Catálogo',
              quantity: item.quantidade,
              unit_price: item.preco_unitario,
            })));
          }

          // 4. Busca dados da empresa
          if (osData.company_id) {
            const { data: compData } = await supabase
              .from('companies')
              .select('*')
              .eq('id', osData.company_id)
              .single();

            if (compData) {
              setCompany({
                name: compData.name || 'Trust Care T.I.',
                phone: compData.phone || '(66) 99999-9999',
                email: compData.email || 'contato@trustcare.com.br',
                logo_url: compData.logo_url || ''
              });
            }
          }
        }
      } catch (err) {
        console.warn('Erro Supabase, carregando mock local:', err);
        loadLocalMockData();
      } finally {
        setLoading(false);
      }
    };

    const loadLocalMockData = () => {
      let localOrders = localStorage.getItem('mock-orders');
      let localClients = localStorage.getItem('mock-clients');
      let localItems = localStorage.getItem('mock-order-items');
      const localCompany = localStorage.getItem('mock-company-settings');

      if (!localOrders) {
        const initialOrders = [
          { id: '1', client_id: 'c1', clients: { name: 'Tech Solutions Ltda' }, equipment_details: 'Notebook Dell Latitude 3420', reported_problem: 'Tela azul intermitente e desligamento automático', technical_report: 'Realizado limpeza interna e troca de pasta térmica. Testado sistema por 12 horas.', status: 'Em Análise', total_value: 450.00, created_at: new Date(Date.now() - 3600000 * 2).toISOString(), codigo_os: 'TC-2026-0001', pago: false },
          { id: '2', client_id: 'c2', clients: { name: 'Carlos Henrique Souza' }, equipment_details: 'Desktop Gamer Custom', reported_problem: 'Placa de vídeo liga mas não dá vídeo', technical_report: null, status: 'Aguardando Peças', total_value: 1250.00, created_at: new Date(Date.now() - 3600000 * 8).toISOString(), codigo_os: 'TC-2026-0002', pago: false },
          { id: '3', client_id: 'c3', clients: { name: 'Clínica Sorriso Perfeito' }, equipment_details: 'Servidor de Arquivos HP ProLiant', reported_problem: 'Backup automático falhando e HD 3 piscando vermelho', technical_report: 'Substituição de HD em RAID por sobressalente. Reconfiguração do script bash de backup.', status: 'Pronto para Retirada', total_value: 2800.00, created_at: new Date(Date.now() - 3600000 * 24).toISOString(), codigo_os: 'TC-2026-0003', pago: false },
          { id: '4', client_id: 'c4', clients: { name: 'Juliana Mendes' }, equipment_details: 'MacBook Air M1', reported_problem: 'Teclado com teclas travadas (A, S, D)', technical_report: null, status: 'Em Análise', total_value: 350.00, created_at: new Date(Date.now() - 3600000 * 28).toISOString(), codigo_os: 'TC-2026-0004', pago: false },
        ];
        localStorage.setItem('mock-orders', JSON.stringify(initialOrders));
        localOrders = JSON.stringify(initialOrders);
      }

      if (!localClients) {
        const initialClients = [
          { id: 'c1', name: 'Tech Solutions Ltda', email: 'contato@techsolutions.com.br', phone: '(11) 98765-4321' },
          { id: 'c2', name: 'Carlos Henrique Souza', email: 'carlos.souza@gmail.com', phone: '(21) 99887-7665' },
          { id: 'c3', name: 'Clínica Sorriso Perfeito', email: 'clinica@sorrisoperfeito.com.br', phone: '(19) 3254-7654' },
          { id: 'c4', name: 'Juliana Mendes', email: 'ju.mendes@outlook.com', phone: '(31) 98888-2233' },
        ];
        localStorage.setItem('mock-clients', JSON.stringify(initialClients));
        localClients = JSON.stringify(initialClients);
      }

      if (!localItems) {
        const initialItems = [
          { id: 'mi-1', service_order_id: '1', product_id: 'p1', name: 'Pasta Térmica Grizzly', quantity: 1, unit_price: 90.00 },
          { id: 'mi-2', service_order_id: '2', product_id: 'p2', name: 'SSD NVMe 1TB Kingston', quantity: 1, unit_price: 450.00 },
        ];
        localStorage.setItem('mock-order-items', JSON.stringify(initialItems));
        localItems = JSON.stringify(initialItems);
      }

      const parsedOrders = JSON.parse(localOrders);
      const found = parsedOrders.find((o: any) => o.id === id);

      if (found) {
        setOrder(found);
        if (localClients) {
          const parsedClients = JSON.parse(localClients);
          const foundClient = parsedClients.find((c: any) => c.id === found.client_id);
          setClient(foundClient || { name: found.clients?.name || 'Cliente Mock' });
        }
        if (localItems) {
          const parsedItems = JSON.parse(localItems);
          const filteredItems = parsedItems.filter((item: any) => item.service_order_id === id);
          setSelectedProducts(filteredItems.map((item: any) => ({
            name: item.name || 'Item do Estoque',
            quantity: item.quantity,
            unit_price: item.unit_price,
          })));
        }
      } else {
        setErrorMsg('Ordem de Serviço não encontrada nos registros locais.');
      }

      if (localCompany) {
        setCompany(JSON.parse(localCompany));
      }
    };

    fetchAllData();
  }, [id]);

  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('print-sheet');
    if (!element) return;

    setDownloadingPDF(true);
    try {
      // Pequeno scroll para o topo para garantir captura perfeita
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`OS_${order?.codigo_os || id}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    if (!loading && order) {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('download') === 'true') {
        const timer = setTimeout(() => {
          handleDownloadPDF();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, order]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen bg-slate-950 text-slate-400">
        <LoadingSpinner className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm">Carregando visualização de impressão temporária...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen bg-slate-950 text-slate-400 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-white">Erro ao carregar dados</h2>
        <p className="text-sm text-slate-500">{errorMsg || 'OS não encontrada.'}</p>
        <button onClick={() => router.back()} className="text-blue-500 hover:underline text-sm">
          Voltar
        </button>
      </div>
    );
  }

  // Cálculos financeiros
  const laborValue = parseFloat(order.service_value) || 0;
  const discountValue = parseFloat(order.discount) || 0;
  const partsSubtotal = selectedProducts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  const servicesSubtotal = selectedServices.reduce((sum, s) => sum + (s.quantity * s.unit_price), 0);
  const subtotalValue = laborValue + partsSubtotal + servicesSubtotal;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 antialiased font-inter">
      
      {/* HUD DE AVISO TEMPORÁRIO (Oculto na Impressão) */}
      <div className="print:hidden max-w-4xl mx-auto p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-none">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Visualização de Impressão Temporária</h4>
            <p className="text-xs text-slate-450">Use esta página para testar. O botão dispara o `window.print()` do seu navegador.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-none text-xs font-semibold transition-all cursor-pointer"
          >
            Voltar para OS
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-500 disabled:bg-indigo-950/40 disabled:text-slate-500 text-white rounded-none text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-650/10 cursor-pointer transition-all active:scale-95"
          >
            {downloadingPDF ? <LoadingSpinner className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Baixar PDF
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" /> Simular Impressão (Ctrl + P)
          </button>
        </div>
      </div>

      {/* CONTAINER VISÍVEL NA TELA PARA TESTE (Oculto na Impressão, exibe como folha centralizada) */}
      <div className="print:hidden max-w-4xl mx-auto p-8 bg-slate-900 border border-t-0 border-slate-800 rounded-b-xl shadow-2xl mb-12">
        <p className="text-xs text-slate-500 mb-6 text-center italic">Abaixo está a folha no formato exato que será enviado para a impressora:</p>
        
        {/* Folha A4 simulada em tela */}
        <div id="print-sheet" className="bg-white text-black p-8 rounded-none shadow-lg border border-slate-205 max-w-[21cm] mx-auto min-h-[29.7cm] flex flex-col justify-between">
          <PrintDocumentContent
            order={order}
            client={client}
            company={company}
            selectedProducts={selectedProducts}
            selectedServices={selectedServices}
            subtotalValue={subtotalValue}
            discountValue={discountValue}
            laborValue={laborValue}
            checklistTemplateItems={checklistTemplateItems}
          />
        </div>
      </div>

      {/* CONTAINER EXCLUSIVO DE IMPRESSÃO (Oculto na tela normal, visível na impressora) */}
      <div className="hidden print:block bg-white text-black min-h-screen p-10 font-inter text-sm">
        <PrintDocumentContent
          order={order}
          client={client}
          company={company}
          selectedProducts={selectedProducts}
          selectedServices={selectedServices}
          subtotalValue={subtotalValue}
          discountValue={discountValue}
          laborValue={laborValue}
          checklistTemplateItems={checklistTemplateItems}
        />
      </div>

    </div>
  );
}

// Subcomponente com a estrutura estrita da folha A4 em Technical Brutalism (Monocromático, Bordas 0px, Sem firulas)
function PrintDocumentContent({
  order,
  client,
  company,
  selectedProducts,
  selectedServices,
  subtotalValue,
  discountValue,
  laborValue,
  checklistTemplateItems = DEFAULT_TEMPLATE_ITEMS
}: any) {
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="space-y-6 flex flex-col justify-between h-full bg-white text-black p-1 font-inter">
      <div className="space-y-6">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="w-14 h-14 object-contain" 
              />
            ) : (
              <div className="w-14 h-14 bg-black text-white font-extrabold flex items-center justify-center text-xl rounded-none">
                TC
              </div>
            )}
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">{company.name}</h2>
              <p className="text-xs text-slate-700 font-semibold">{company.email}</p>
              <p className="text-xs text-slate-700 font-semibold">{company.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Ordem de Serviço</span>
            <span className="text-xl font-black font-jetbrains text-black block mt-0.5">
              #{order.codigo_os || `OS-${order.id.slice(0, 8).toUpperCase()}`}
            </span>
            <span className="text-[10px] font-medium text-slate-600 block mt-1">
              Data de Abertura: {new Date(order.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* BLOCO 1: CLIENTE */}
        <div className="border border-black p-4">
          <h3 className="text-xs font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block mb-3">
            Identificação do Cliente
          </h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Nome</span>
              <span className="font-bold text-black text-sm">{client?.name || 'Membro da Equipe'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Telefone</span>
              <span className="font-semibold text-black font-jetbrains">{client?.phone || '—'}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">E-mail</span>
              <span className="font-semibold text-black font-jetbrains">{client?.email || '—'}</span>
            </div>
          </div>
        </div>

        {/* BLOCO 2: EQUIPAMENTO & DIAGNÓSTICO */}
        <div className="border border-black p-4">
          <h3 className="text-xs font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block mb-3">
            Equipamento & Problema Reportado
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Especificação do Equipamento</span>
              <span className="font-bold text-black text-xs">{order.equipment_details || '—'}</span>
            </div>
            <div className="border-t border-slate-205 pt-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Defeito Relatado pelo Cliente</span>
              <p className="text-xs text-black italic mt-0.5">&quot;{order.reported_problem}&quot;</p>
            </div>
            {order.technical_report && (
              <div className="border-t border-slate-205 pt-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Parecer / Laudo Técnico do Serviço</span>
                <p className="text-xs text-black font-medium mt-0.5 whitespace-pre-wrap">{order.technical_report}</p>
              </div>
            )}
          </div>
        </div>

        {/* BLOCO 2.5: CONDIÇÕES DE RECEBIMENTO (CHECKLIST DE ENTRADA) */}
        {order.entry_checklist && (
          <div className="border border-black p-4">
            <h3 className="text-xs font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block mb-3">
              Condições de Recebimento (Checklist)
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {checklistTemplateItems.map((item: any) => {
                const checkData = order.entry_checklist[item.id];
                if (!checkData?.checked && !checkData?.observation?.trim()) return null;
                return (
                  <div key={item.id} className="flex gap-2 text-xs">
                    <span className="font-bold text-black min-w-[120px] flex-shrink-0">
                      {checkData.checked ? '☑' : '☐'} {item.label}:
                    </span>
                    <span className="text-black italic break-words line-clamp-2">
                      {checkData.observation || (checkData.checked ? 'Presente / OK' : '')}
                    </span>
                  </div>
                );
              })}
              
              {order.entry_checklist.password_pin?.has_password && (
                <div className="flex gap-2 text-xs col-span-2 mt-2 pt-2 border-t border-slate-205">
                  <span className="font-bold text-black flex-shrink-0">☑ Senha / PIN:</span>
                  <span className="text-black font-jetbrains">{order.entry_checklist.password_pin.password_value || 'Registrado'}</span>
                </div>
              )}
              
              {order.entry_checklist.general_notes?.trim() && (
                <div className="col-span-2 mt-2 pt-2 border-t border-slate-205 text-xs">
                  <span className="font-bold text-black block mb-1">Observações Gerais (Entrada):</span>
                  <p className="text-black italic whitespace-pre-wrap">{order.entry_checklist.general_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BLOCO 3: SERVIÇOS E PEÇAS */}
        <div className="border border-black p-4">
          <h3 className="text-xs font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block mb-3">
            Itens Adicionados & Serviços Prestados
          </h3>
          
          {selectedProducts.length === 0 && selectedServices.length === 0 && laborValue === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">Nenhum serviço ou peça vinculados.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse mt-2">
              <thead>
                <tr className="border-b border-black text-black font-black text-[10px] uppercase tracking-wider bg-slate-105">
                  <th className="py-2 px-2">Descrição do Serviço / Peça</th>
                  <th className="py-2 px-2 text-center w-24">Valor Unitário</th>
                  <th className="py-2 px-2 text-center w-16">Qtd.</th>
                  <th className="py-2 px-2 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-205">
                {/* Linha da Mão de Obra Geral */}
                {laborValue > 0 && (
                  <tr className="font-semibold text-black">
                    <td className="py-2.5 px-2">Mão de Obra Técnica (Serviço Geral)</td>
                    <td className="py-2.5 px-2 text-center font-jetbrains">R$ {laborValue.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-center">1</td>
                    <td className="py-2.5 px-2 text-right font-jetbrains">R$ {laborValue.toFixed(2)}</td>
                  </tr>
                )}
                
                {/* Serviços do Catálogo */}
                {selectedServices.map((item: any, idx: number) => (
                  <tr key={`serv-${idx}`} className="text-slate-800">
                    <td className="py-2 px-2 font-medium">{item.name} <span className="text-[10px] font-bold text-slate-550 border border-slate-300 px-1 py-0.2 ml-1 rounded-none uppercase">Serviço</span></td>
                    <td className="py-2 px-2 text-center font-jetbrains">R$ {Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 px-2 text-center font-bold">{item.quantity}</td>
                    <td className="py-2 px-2 text-right font-jetbrains font-bold text-black">R$ {(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}

                {/* Peças do Estoque */}
                {selectedProducts.map((item: any, idx: number) => (
                  <tr key={`prod-${idx}`} className="text-slate-800">
                    <td className="py-2 px-2 font-medium">{item.name} <span className="text-[10px] font-bold text-slate-550 border border-slate-300 px-1 py-0.2 ml-1 rounded-none uppercase">Peça</span></td>
                    <td className="py-2 px-2 text-center font-jetbrains">R$ {Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 px-2 text-center font-bold">{item.quantity}</td>
                    <td className="py-2 px-2 text-right font-jetbrains font-bold text-black">R$ {(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BLOCO 4: RESUMO FINANCEIRO (COM IMPEDIMENTO DE ORFANATO CSS) */}
        <div className="flex justify-between items-end gap-6 break-inside-avoid print:break-inside-avoid">
          <div className="flex-1 border border-black p-4 min-h-[100px] flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider block">Observações do Recebimento / Garantia</span>
            <p className="text-[10px] text-slate-700 leading-relaxed mt-1">
              Garantia de 90 dias referente aos serviços executados e peças trocadas. O equipamento retirado deve ser conferido no ato da entrega.
            </p>
          </div>
          
          <div className="w-80 border border-black p-4 space-y-2.5 bg-slate-50">
            <div className="flex justify-between text-xs text-slate-700 font-semibold">
              <span>Subtotal dos Itens:</span>
              <span className="font-jetbrains">R$ {subtotalValue.toFixed(2)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-xs text-rose-650 font-bold">
                <span>Desconto Aplicado:</span>
                <span className="font-jetbrains">- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-black" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-black">Total da O.S.:</span>
              <div className="flex items-center gap-2">
                {order.pago && (
                  <span className="px-1.5 py-0.5 border-2 border-emerald-600 text-emerald-600 text-[9px] font-black uppercase tracking-wider">
                    RECEBIDO
                  </span>
                )}
                <span className="text-lg font-black font-jetbrains text-black">
                  R$ {Math.max(0, subtotalValue - discountValue).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RODAPÉ E ASSINATURA (COM IMPEDIMENTO DE ORFANATO CSS) */}
      <div className="mt-12 pt-6 border-t border-black grid grid-cols-2 gap-8 break-inside-avoid print:break-inside-avoid">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase">Local e Data</p>
          <p className="text-xs font-bold text-black mt-2 font-jetbrains">{company.name}, {currentDate}</p>
        </div>
        <div className="text-center">
          <div className="border-b border-black w-full h-8" />
          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1.5">Assinatura do Cliente (Retirada)</p>
          <p className="text-[9px] text-slate-500 font-medium">Declaro ter recebido o equipamento testado e em perfeito estado.</p>
        </div>
      </div>

    </div>
  );
}
