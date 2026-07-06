'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  Wrench,
  User,
  Tag,
  Calendar,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  Boxes,
  FileText,
  Upload,
  Eye,
  X,
  Film,
  Paperclip,
  Printer,
  ChevronDown,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-32 w-full animate-pulse bg-slate-950 border border-slate-800 rounded-lg" />
});

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean']
  ]
};

const formats = ['bold', 'italic', 'underline', 'list', 'bullet', 'align'];

export const STATUS_CONFIG: Record<string, { label: string; colorClass: string; desc: string }> = {
  'Aguardando Equipamento': { 
    label: 'Aguardando Equipamento', 
    colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20', 
    desc: 'Aparelho ainda não entregue pelo cliente' 
  },
  'Em Análise': { 
    label: 'Em Análise', 
    colorClass: 'bg-blue-500/10 text-blue-450 border-blue-500/20', 
    desc: 'Aparelho recebido para diagnóstico' 
  },
  'Aguardando Aprovação': { 
    label: 'Aguardando Aprovação', 
    colorClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', 
    desc: 'Orçamento gerado, aguardando aprovação' 
  },
  'Aprovado': { 
    label: 'Aprovado', 
    colorClass: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20', 
    desc: 'Orçamento aprovado pelo cliente, aguardando execução' 
  },
  'Aguardando Peças': { 
    label: 'Aguardando Peças', 
    colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20', 
    desc: 'Conserto pausado aguardando peças' 
  },
  'Em Execução': { 
    label: 'Em Execução', 
    colorClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20', 
    desc: 'Técnico trabalhando no reparo' 
  },
  'Em Testes': { 
    label: 'Em Testes', 
    colorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', 
    desc: 'Passando por testes pós-reparo' 
  },
  'Pronto para Retirada': { 
    label: 'Pronto para Retirada', 
    colorClass: 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20', 
    desc: 'Pronto para retirada física' 
  },
  'Finalizado': { 
    label: 'Finalizado', 
    colorClass: 'bg-emerald-600/10 text-emerald-500 border-emerald-600/20', 
    desc: 'Equipamento entregue e finalizado' 
  },
  'Cancelado': { 
    label: 'Cancelado', 
    colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20', 
    desc: 'Ordem de serviço cancelada' 
  }
};

export interface ChecklistItem {
  checked: boolean;
  observation: string;
}

export interface OrderChecklist {
  password_pin: {
    has_password: boolean;
    password_value: string;
  };
  general_notes: string;
  [key: string]: ChecklistItem | any;
}

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  type?: 'boolean';
  required?: boolean;
}

export const DEFAULT_TEMPLATE_ITEMS: ChecklistTemplateItem[] = [
  { id: 'charger', label: 'Carregador' },
  { id: 'battery', label: 'Bateria' },
  { id: 'screen', label: 'Tela / Display' },
  { id: 'keyboard', label: 'Teclado' },
  { id: 'casing', label: 'Carcaça (Arranhões/Amassados)' },
  { id: 'power_on', label: 'Ligar / Dar Vídeo' },
  { id: 'removable_media', label: 'Mídia Removível (PenDrive/SD)' },
  { id: 'missing_screws', label: 'Parafusos Ausentes' }
];

export const defaultChecklist: OrderChecklist = {
  password_pin: { has_password: false, password_value: '' },
  general_notes: ''
};

const ChecklistItemRow = ({ 
  label, 
  field, 
  checklist, 
  setChecklist, 
  disabled = false,
  color = 'emerald'
}: { 
  label: string, 
  field: string, 
  checklist: OrderChecklist, 
  setChecklist: React.Dispatch<React.SetStateAction<OrderChecklist>>,
  disabled?: boolean,
  color?: 'emerald' | 'sky'
}) => {
  const item = (checklist[field] || { checked: false, observation: '' }) as ChecklistItem;

  const activeBg = color === 'emerald' 
    ? 'bg-emerald-950/40 border-emerald-500' 
    : 'bg-sky-950/40 border-sky-500';

  const knobColor = color === 'emerald'
    ? 'bg-emerald-500'
    : 'bg-sky-500';

  return (
    <div className="group border-b border-slate-850/80 pb-3 last:border-0">
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors pr-2 leading-relaxed break-words">
          {label}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setChecklist(prev => ({
            ...prev,
            [field]: { 
              ...(prev[field] || { checked: false, observation: '' }), 
              checked: !(prev[field] || { checked: false, observation: '' }).checked 
            }
          }))}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-none border transition-colors duration-150 p-0.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            item.checked 
              ? activeBg 
              : 'bg-slate-950 border-slate-800 hover:border-slate-750'
          }`}
        >
          <span className={`pointer-events-none inline-block h-full w-4 transform rounded-none transition-transform duration-150 ${
            item.checked 
              ? `translate-x-5 ${knobColor}` 
              : 'translate-x-0 bg-slate-800'
          }`} />
        </button>
      </div>
      {(item.checked || item.observation.trim() !== '') && (
        <div className="mt-2 pl-1">
          <input
            type="text"
            disabled={disabled}
            placeholder={`[Nota: ${label.toLowerCase()}]`}
            value={item.observation}
            onChange={(e) => setChecklist(prev => ({
              ...prev,
              [field]: { 
                ...(prev[field] || { checked: false, observation: '' }), 
                observation: e.target.value 
              }
            }))}
            className="w-full bg-transparent border-b border-slate-850 focus:border-slate-700 px-1 py-0.5 text-xs text-slate-350 placeholder:text-slate-750 focus:outline-none transition-colors font-mono"
          />
        </div>
      )}
    </div>
  );
};

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { company } = useCompany();

  // Estados dos Dados
  const [order, setOrder] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Estados dos Campos Editáveis da OS
  const [status, setStatus] = useState('Novo');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Estados de Finalização Financeira
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string>('');
  const [priority, setPriority] = useState('Média');
  const [technicianId, setTechnicianId] = useState('');
  const [technicalReport, setTechnicalReport] = useState('');
  const [reportedProblem, setReportedProblem] = useState('');
  const [deliveryPrediction, setDeliveryPrediction] = useState('');
  const [serviceValue, setServiceValue] = useState('0'); // Valor da mão de obra
  const [discount, setDiscount] = useState('0');         // Valor do desconto
  const [totalValue, setTotalValue] = useState('0');     // Mão de obra + Peças
  const [pago, setPago] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Estados dos Checklists
  const [entryChecklist, setEntryChecklist] = useState<OrderChecklist>(defaultChecklist);
  const [exitChecklist, setExitChecklist] = useState<OrderChecklist>(defaultChecklist);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistTemplateItems, setChecklistTemplateItems] = useState<ChecklistTemplateItem[]>(DEFAULT_TEMPLATE_ITEMS);
  const [isEntryOpen, setIsEntryOpen] = useState(true);
  const [isExitOpen, setIsExitOpen] = useState(true);

  // Estados dos Serviços do Catálogo
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [currentServiceId, setCurrentServiceId] = useState('');
  const [currentServicePrice, setCurrentServicePrice] = useState('0.00');
  const [currentServiceQty, setCurrentServiceQty] = useState('1');

  // Peças Vinculadas à OS (Estado Atual)
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentProductQty, setCurrentProductQty] = useState('1');

  // Controle de Loading / Feedback
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Carrega dados iniciais da OS, Cliente, Itens e Estoque
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // A. Carrega OS do Supabase
      const { data: osData, error: osErr } = await supabase
        .from('service_orders')
        .select('*, clients(*)')
        .eq('id', id)
        .single();

      if (osErr) throw osErr;

      if (osData) {
        setOrder(osData);
        setClient(osData.clients);
        setStatus(osData.status);
        setPriority(osData.priority);
        setTechnicianId(osData.technician_id || '');
        setTechnicalReport(osData.technical_report || '');
        setReportedProblem(osData.reported_problem || '');
        setServiceValue(Number(osData.service_value || 0).toString());
        setDiscount(Number(osData.discount || 0).toString());
        setTotalValue(Number(osData.total_value || 0).toString());
        setPago(osData.pago || false);
        setMediaFiles(osData.media || []);
        
        if (osData.entry_checklist) setEntryChecklist(osData.entry_checklist);
        if (osData.exit_checklist) setExitChecklist(osData.exit_checklist);

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

        if (osData.delivery_prediction) {
          setDeliveryPrediction(new Date(osData.delivery_prediction).toISOString().split('T')[0]);
        }

        // Busca Peças Vinculadas à OS (Online)
        const { data: itemsData } = await supabase
          .from('service_order_items')
          .select('*, products_inventory(name)')
          .eq('service_order_id', id);

        if (itemsData) {
          const formattedItems = itemsData.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            name: item.products_inventory?.name || 'Produto do Estoque',
            quantity: item.quantity,
            unit_price: item.unit_price,
          }));
          setSelectedProducts(formattedItems);
        }

        // Busca Serviços Vinculados à OS (Online)
        const { data: orderServsData } = await supabase
          .from('order_services')
          .select('*, services(nome)')
          .eq('os_id', id);

        if (orderServsData) {
          const formattedServices = orderServsData.map((item: any) => ({
            id: item.id,
            service_id: item.service_id,
            name: item.services?.nome || 'Serviço do Catálogo',
            quantity: item.quantidade,
            unit_price: item.preco_unitario,
          }));
          setSelectedServices(formattedServices);
        }

        // Busca Estoque de Produtos (Online)
        const { data: invData } = await supabase
          .from('products_inventory')
          .select('*')
          .order('name');
        if (invData) setInventory(invData);

        // Busca Serviços Ativos (Online)
        const { data: servsData } = await supabase
          .from('services')
          .select('*')
          .eq('ativo', true)
          .order('nome');
        if (servsData) setAvailableServices(servsData);

        // Busca Técnicos (Online)
        const { data: techData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'technician');
        if (techData && techData.length > 0) {
          setTechnicians(techData.map(t => ({
            id: t.id,
            name: t.full_name || t.email?.split('@')[0] || 'Técnico'
          })));
        } else {
          loadLocalTechnicians();
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do Supabase, rodando local offline:', err);
      loadLocalData();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = () => {
    // Busca OS localmente
    const localOrders = localStorage.getItem('mock-orders');
    if (localOrders) {
      const parsedOrders = JSON.parse(localOrders);
      const foundOs = parsedOrders.find((o: any) => o.id === id);

      if (foundOs) {
        setOrder(foundOs);

        // Busca Cliente da OS
        const localClients = localStorage.getItem('mock-clients');
        if (localClients) {
          const parsedClients = JSON.parse(localClients);
          const foundClient = parsedClients.find((c: any) => c.id === foundOs.client_id);
          setClient(foundClient || { name: 'Cliente Desconhecido' });
        } else {
          setClient({ name: foundOs.clients?.name || 'Cliente' });
        }

        setStatus(foundOs.status);
        setPriority(foundOs.priority);
        setTechnicianId(foundOs.technician_id || '');
        setTechnicalReport(foundOs.technical_report || '');
        setReportedProblem(foundOs.reported_problem || '');
        setServiceValue(Number(foundOs.service_value || 0).toString());
        setDiscount(Number(foundOs.discount || 0).toString());
        setTotalValue(Number(foundOs.total_value || 0).toString());
        setPago(foundOs.pago || false);
        setMediaFiles(foundOs.media || []);

        if (foundOs.delivery_prediction) {
          setDeliveryPrediction(foundOs.delivery_prediction.split('T')[0]);
        }

        // Busca Peças Vinculadas à OS (Offline)
        const localItems = localStorage.getItem('mock-order-items');
        if (localItems) {
          const filteredItems = JSON.parse(localItems).filter((item: any) => item.service_order_id === id);
          setSelectedProducts(filteredItems);
        }

        // Busca Estoque (Offline)
        const localInv = localStorage.getItem('mock-inventory');
        if (localInv) {
          setInventory(JSON.parse(localInv));
        }

        // Mocks de Serviços (Limpos em Offline por requisito 1)
        setAvailableServices([]);
        setSelectedServices([]);
        loadLocalTechnicians();
      } else {
        setErrorMsg('Ordem de Serviço não encontrada no banco de dados local.');
      }
    } else {
      setErrorMsg('Não há dados locais mockados.');
    }
  };

  const loadLocalTechnicians = () => {
    const localProfiles = localStorage.getItem('mock-profiles');
    if (localProfiles) {
      const parsed = JSON.parse(localProfiles);
      const techs = parsed.filter((p: any) => p.role === 'tecnico' || p.role === 'technician');
      setTechnicians(techs.map((t: any) => ({
        id: t.id,
        name: t.name
      })));
    } else {
      setTechnicians([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // 2. Atualiza o Valor Total somando Mão de Obra + Peças + Serviços do Catálogo e deduzindo o desconto
  useEffect(() => {
    const labor = parseFloat(serviceValue) || 0;
    const partsTotal = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const servicesTotal = selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const subtotal = labor + partsTotal + servicesTotal;
    const disc = parseFloat(discount) || 0;
    setTotalValue(Math.max(0, subtotal - disc).toFixed(2));
  }, [serviceValue, selectedProducts, selectedServices, discount]);

  // Adicionar Peça à OS (em tela, sem persistir de imediato no DB)
  const handleAddProduct = () => {
    if (!currentProductId) return;

    const prod = inventory.find((p) => p.id === currentProductId);
    if (!prod) return;

    const qty = parseInt(currentProductQty) || 1;

    // Precisamos saber se a peça já existe na OS para calcular o saldo disponível real do estoque
    const existingItem = selectedProducts.find((p) => p.product_id === currentProductId);
    const existingQty = existingItem ? existingItem.quantity : 0;
    const stockAvailable = prod.quantity + existingQty; // soma a quantidade já na OS para fins de limite

    if (qty > stockAvailable) {
      alert(`Quantidade indisponível no estoque. Saldo atual + alocado: ${stockAvailable} un`);
      return;
    }

    if (existingItem) {
      const updated = selectedProducts.map((p) => {
        if (p.product_id === currentProductId) {
          return { ...p, quantity: qty }; // Sobrescreve com a nova quantidade selecionada
        }
        return p;
      });
      setSelectedProducts(updated);
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          id: `temp-${Date.now()}`,
          product_id: currentProductId,
          name: prod.name,
          quantity: qty,
          unit_price: prod.sale_price,
        }
      ]);
    }

    setCurrentProductId('');
    setCurrentProductQty('1');
  };

  // Remover Peça da OS (em tela)
  const handleRemoveProduct = (prodId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product_id !== prodId));
  };

  // Selecionar serviço do catálogo (preenche valor padrão)
  const handleServiceSelect = (serviceId: string) => {
    setCurrentServiceId(serviceId);
    const serv = availableServices.find(s => s.id === serviceId);
    if (serv) {
      setCurrentServicePrice(Number(serv.preco_padrao || 0).toFixed(2));
    } else {
      setCurrentServicePrice('0.00');
    }
  };

  // Adicionar serviço do catálogo à O.S. (em tela)
  const handleAddService = () => {
    if (!currentServiceId) return;

    const serv = availableServices.find((s) => s.id === currentServiceId);
    if (!serv) return;

    const qty = parseInt(currentServiceQty) || 1;
    const price = parseFloat(currentServicePrice) || 0;

    const existingItem = selectedServices.find((s) => s.service_id === currentServiceId);
    if (existingItem) {
      const updated = selectedServices.map((s) => {
        if (s.service_id === currentServiceId) {
          return { ...s, quantity: qty, unit_price: price };
        }
        return s;
      });
      setSelectedServices(updated);
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          id: `temp-serv-${Date.now()}`,
          service_id: currentServiceId,
          name: serv.nome,
          quantity: qty,
          unit_price: price,
        }
      ]);
    }

    setCurrentServiceId('');
    setCurrentServicePrice('0.00');
    setCurrentServiceQty('1');
  };

  // Remover serviço do catálogo da O.S. (em tela)
  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.service_id !== serviceId));
  };

  // Upload de Mídias
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMsg('');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      const fileType = file.type;

      try {
        // Se estivermos em modo online, faz upload real
        if (order && order.company_id && !order.id.startsWith('mock-os') && order.id.length === 36) {
          const fileExt = fileName.split('.').pop();
          const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const filePath = `${order.company_id}/${id}/${uniqueName}`;

          const { data, error } = await supabase.storage
            .from('os-media')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('os-media')
            .getPublicUrl(filePath);

          setMediaFiles((prev) => [...prev, { name: fileName, url: publicUrl, type: fileType }]);
        } else {
          // Modo offline: cria URL local para visualização instantânea
          const localUrl = URL.createObjectURL(file);

          // E uma imagem técnica real de fallback para persistência sem expirar
          const persistentUrl = fileType.startsWith('image/')
            ? 'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&auto=format&fit=crop&q=60'
            : fileType.startsWith('video/')
              ? 'https://www.w3schools.com/html/mov_bbb.mp4'
              : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

          setMediaFiles((prev) => [...prev, { name: fileName, url: localUrl, persistentUrl, type: fileType }]);
        }
      } catch (uploadErr: any) {
        console.error('Erro de upload:', uploadErr);
        setErrorMsg(`Falha ao anexar ${fileName}: ${uploadErr.message}`);
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  // Remover Mídia Anexada
  const handleRemoveFile = async (index: number) => {
    const fileToRemove = mediaFiles[index];

    // Tenta remover do Supabase Storage se for online
    if (order && !order.id.startsWith('mock-os') && fileToRemove.url.includes('os-media')) {
      try {
        const urlObj = new URL(fileToRemove.url);
        const pathParts = urlObj.pathname.split('/storage/v1/object/public/os-media/');
        if (pathParts.length > 1) {
          const filePath = decodeURIComponent(pathParts[1]);
          await supabase.storage.from('os-media').remove([filePath]);
        }
      } catch (err) {
        console.warn('Erro ao deletar arquivo físico no storage:', err);
      }
    }

    setMediaFiles(mediaFiles.filter((_, idx) => idx !== index));
  };

  // Salvar Checklists Especificamente
  const handleSaveChecklists = async (type: 'entry' | 'exit') => {
    setSavingChecklist(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const updateData = type === 'entry' 
        ? { entry_checklist: entryChecklist }
        : { exit_checklist: exitChecklist };

      const { error } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      setSuccessMsg(`Checklist de ${type === 'entry' ? 'Entrada' : 'Saída'} salvo com sucesso!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(`Erro ao salvar checklist de ${type}:`, err);
      setErrorMsg(`Falha ao salvar checklist: ${err.message}`);
    } finally {
      setSavingChecklist(false);
    }
  };

  // Salvar Alterações (Online / Offline)
  const handleSaveChanges = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updatedOsData = {
        status,
        priority,
        technician_id: technicianId || null,
        technical_report: technicalReport || null,
        reported_problem: reportedProblem,
        delivery_prediction: deliveryPrediction || null,
        service_value: parseFloat(serviceValue) || 0,
        discount: parseFloat(discount) || 0,
        total_value: parseFloat(totalValue) || 0,
        pago: status === 'Finalizado' ? pago : false,
        media: mediaFiles.map(m => ({
          name: m.name,
          url: m.persistentUrl || m.url,
          type: m.type
        }))
      };

      // Tenta atualizar no Supabase (Online)
      const { data: updatedOs, error: updateErr } = await supabase
        .from('service_orders')
        .update(updatedOsData)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        throw updateErr;
      }

      // --- SUCESSO ONLINE: Sincroniza Peças e Estoque no Banco ---

      // 1. Busca peças anteriores para restaurar estoque antes de aplicar novas
      const { data: oldItems } = await supabase
        .from('service_order_items')
        .select('*')
        .eq('service_order_id', id);

      if (oldItems && oldItems.length > 0) {
        for (const oldItem of oldItems) {
          // Devolve a quantidade ao estoque
          const { data: prod } = await supabase
            .from('products_inventory')
            .select('quantity')
            .eq('id', oldItem.product_id)
            .single();

          if (prod) {
            await supabase
              .from('products_inventory')
              .update({ quantity: prod.quantity + oldItem.quantity })
              .eq('id', oldItem.product_id);
          }
        }
      }

      // 2. Deleta todos os itens antigos da OS
      await supabase
        .from('service_order_items')
        .delete()
        .eq('service_order_id', id);

      // 3. Insere os novos itens e baixa as quantidades do estoque
      for (const item of selectedProducts) {
        // Insere item
        await supabase.from('service_order_items').insert({
          company_id: order.company_id,
          service_order_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });

        // Baixa estoque
        const { data: prod } = await supabase
          .from('products_inventory')
          .select('quantity')
          .eq('id', item.product_id)
          .single();

        if (prod) {
          await supabase
            .from('products_inventory')
            .update({ quantity: Math.max(0, prod.quantity - item.quantity) })
            .eq('id', item.product_id);
        }
      }

      // --- Sincroniza Serviços do Catálogo no Banco ---

      // Deleta serviços antigos
      await supabase
        .from('order_services')
        .delete()
        .eq('os_id', id);

      // Insere os novos serviços da OS
      for (const item of selectedServices) {
        await supabase.from('order_services').insert({
          company_id: order.company_id,
          os_id: id,
          service_id: item.service_id,
          quantidade: item.quantity,
          preco_unitario: item.unit_price,
          subtotal: item.quantity * item.unit_price
        });
      }

      // 4. Dispara o webhook de notificação se o status mudou para um status crítico e houver URL configurada
      const criticalStatuses = ['Aguardando Peças', 'Pronto para Retirada', 'Cancelado'];
      const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
      const statusChanged = order && order.status !== status;

      if (webhookUrl && statusChanged && criticalStatuses.includes(status)) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'order_status_changed',
              order_id: id,
              status: status,
              equipment: order?.equipment_details || 'Equipamento',
              client_name: client?.name || 'Cliente',
              client_phone: client?.phone || '',
              tracking_url: `${window.location.origin}/rastreio?id=${id}`
            }),
            mode: 'cors'
          });
        } catch (webhookErr) {
          console.warn('Falha ao enviar webhook de notificação:', webhookErr);
        }
      }

      setSuccessMsg('Ordem de Serviço atualizada com sucesso no banco de dados!');
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 1200);

    } catch (err: any) {
      console.warn('Erro ao atualizar online, executando fluxo offline local:', err.message);

      // --- FLUXO OFFLINE (LOCALSTORAGE) ---
      const localOrders = localStorage.getItem('mock-orders');
      if (localOrders) {
        const parsedOrders = JSON.parse(localOrders);
        const updatedOrders = parsedOrders.map((o: any) => {
          if (o.id === id) {
            return {
              ...o,
              status,
              priority,
              technician_id: technicianId || null,
              technical_report: technicalReport || null,
              reported_problem: reportedProblem,
              delivery_prediction: deliveryPrediction || null,
              service_value: parseFloat(serviceValue) || 0,
              discount: parseFloat(discount) || 0,
              total_value: parseFloat(totalValue) || 0,
              pago: status === 'Finalizado' ? pago : false,
              media: mediaFiles.map(m => ({
                name: m.name,
                url: m.persistentUrl || m.url,
                type: m.type
              }))
            };
          }
          return o;
        });

        localStorage.setItem('mock-orders', JSON.stringify(updatedOrders));

        // A. Carrega itens e estoque locais atuais
        const localItems = localStorage.getItem('mock-order-items') || '[]';
        const localInv = localStorage.getItem('mock-inventory') || '[]';

        let parsedItems = JSON.parse(localItems);
        let parsedInv = JSON.parse(localInv);

        // B. Identifica os itens anteriores da OS para restaurar estoque
        const oldLocalItems = parsedItems.filter((item: any) => item.service_order_id === id);

        // Devolve quantitativo antigo ao inventário
        oldLocalItems.forEach((oldItem: any) => {
          parsedInv = parsedInv.map((p: any) => {
            if (p.id === oldItem.product_id) {
              return { ...p, quantity: p.quantity + oldItem.quantity };
            }
            return p;
          });
        });

        // C. Limpa itens antigos da OS no array global
        parsedItems = parsedItems.filter((item: any) => item.service_order_id !== id);

        // D. Adiciona os novos itens e decrementa o inventário
        selectedProducts.forEach((item, index) => {
          parsedItems.push({
            id: `mock-item-${Date.now()}-${index}`,
            service_order_id: id,
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          });

          parsedInv = parsedInv.map((p: any) => {
            if (p.id === item.product_id) {
              return { ...p, quantity: Math.max(0, p.quantity - item.quantity) };
            }
            return p;
          });
        });

        // E. Salva as mudanças locais
        localStorage.setItem('mock-order-items', JSON.stringify(parsedItems));
        localStorage.setItem('mock-inventory', JSON.stringify(parsedInv));

        setSuccessMsg('[Offline] Alterações salvas localmente com sucesso!');
        setTimeout(() => {
          router.push('/dashboard/orders');
        }, 1200);
      } else {
        setErrorMsg('Falha ao gravar localmente: os mocks não foram inicializados.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async () => {
    const confirmDelete = window.confirm("Deseja realmente excluir esta Ordem de Serviço? Esta ação retornará as peças alocadas ao estoque e não pode ser desfeita.");
    if (!confirmDelete) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Busca peças anteriores para restaurar estoque online
      const { data: oldItems } = await supabase
        .from('service_order_items')
        .select('*')
        .eq('service_order_id', id);

      if (oldItems && oldItems.length > 0) {
        for (const oldItem of oldItems) {
          const { data: prod } = await supabase
            .from('products_inventory')
            .select('quantity')
            .eq('id', oldItem.product_id)
            .single();

          if (prod) {
            await supabase
              .from('products_inventory')
              .update({ quantity: prod.quantity + oldItem.quantity })
              .eq('id', oldItem.product_id);
          }
        }
      }

      // 2. Deleta os itens da OS online
      await supabase
        .from('service_order_items')
        .delete()
        .eq('service_order_id', id);

      // 3. Deleta a OS online
      const { error: deleteErr } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      setSuccessMsg('Ordem de Serviço excluída com sucesso!');
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 1200);

    } catch (err: any) {
      console.warn('Erro ao excluir online, executando fluxo offline local:', err.message);

      // --- FLUXO OFFLINE (LOCALSTORAGE) ---
      const localOrders = localStorage.getItem('mock-orders');
      if (localOrders) {
        const parsedOrders = JSON.parse(localOrders);

        // A. Carrega itens e estoque locais atuais
        const localItems = localStorage.getItem('mock-order-items') || '[]';
        const localInv = localStorage.getItem('mock-inventory') || '[]';

        let parsedItems = JSON.parse(localItems);
        let parsedInv = JSON.parse(localInv);

        // B. Identifica os itens anteriores da OS para restaurar estoque
        const oldLocalItems = parsedItems.filter((item: any) => item.service_order_id === id);
        oldLocalItems.forEach((oldItem: any) => {
          parsedInv = parsedInv.map((p: any) => {
            if (p.id === oldItem.product_id) {
              return { ...p, quantity: p.quantity + oldItem.quantity };
            }
            return p;
          });
        });

        // C. Limpa itens e OS
        parsedItems = parsedItems.filter((item: any) => item.service_order_id !== id);
        const updatedOrders = parsedOrders.filter((o: any) => o.id !== id);

        // E. Salva as mudanças locais
        localStorage.setItem('mock-orders', JSON.stringify(updatedOrders));
        localStorage.setItem('mock-order-items', JSON.stringify(parsedItems));
        localStorage.setItem('mock-inventory', JSON.stringify(parsedInv));

        setSuccessMsg('[Offline] Ordem de Serviço excluída com sucesso!');
        setTimeout(() => {
          router.push('/dashboard/orders');
        }, 1200);
      } else {
        setErrorMsg('Falha ao gravar localmente: os mocks não foram inicializados.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'Finalizado' || newStatus === 'Entregue') {
      setPendingStatusUpdate(newStatus);
      setIsPaymentModalOpen(true);
      return;
    }

    setStatus(newStatus);
    setUpdatingStatus(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Tenta atualizar no Supabase (Online)
      const { error: updateErr } = await supabase
        .from('service_orders')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Se deu certo, atualiza o cache da OS na tela
      setOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
      setSuccessMsg('Status atualizado em tempo real!');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Dispara o webhook se necessário
      const criticalStatuses = ['Aguardando Peças', 'Pronto para Retirada', 'Cancelado'];
      const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL;
      if (webhookUrl && criticalStatuses.includes(newStatus)) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'order_status_changed',
              order_id: id,
              status: newStatus,
              equipment: order?.equipment_details || 'Equipamento',
              client_name: client?.name || 'Cliente',
              client_phone: client?.phone || '',
              tracking_url: `${window.location.origin}/rastreio?id=${id}`
            }),
            mode: 'cors'
          });
        } catch (webhookErr) {
          console.warn('Falha ao enviar webhook de notificação:', webhookErr);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao atualizar status online, aplicando localmente:', err.message);

      // 2. Fluxo local offline fallback
      const localOrdersStr = localStorage.getItem('mock-orders');
      if (localOrdersStr) {
        const localOrders = JSON.parse(localOrdersStr);
        const updatedLocal = localOrders.map((o: any) => {
          if (o.id === id) {
            return { ...o, status: newStatus };
          }
          return o;
        });
        localStorage.setItem('mock-orders', JSON.stringify(updatedLocal));
        setSuccessMsg('Status atualizado offline!');
      } else {
        setErrorMsg('Falha ao atualizar o status localmente.');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmPaymentAndStatus = async () => {
    setIsPaymentModalOpen(false);
    setStatus(pendingStatusUpdate);
    setUpdatingStatus(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error: updateErr } = await supabase
        .from('service_orders')
        .update({ 
          status: pendingStatusUpdate,
          payment_date: paymentDate,
          payment_method: paymentMethod
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      setOrder((prev: any) => prev ? { ...prev, status: pendingStatusUpdate, payment_date: paymentDate, payment_method: paymentMethod } : null);
      setSuccessMsg('Status e fluxo de caixa atualizados em tempo real!');
    } catch (err) {
      const errObj = err as Error;
      console.warn('Erro ao atualizar status/caixa no Supabase, atualizando localmente:', errObj.message);
      
      const localOrdersStr = localStorage.getItem('mock-orders');
      if (localOrdersStr) {
        const localOrders = JSON.parse(localOrdersStr);
        const updatedLocal = localOrders.map((o: any) => {
          if (o.id === id) {
            return { 
              ...o, 
              status: pendingStatusUpdate,
              payment_date: paymentDate,
              payment_method: paymentMethod
            };
          }
          return o;
        });
        localStorage.setItem('mock-orders', JSON.stringify(updatedLocal));
        setSuccessMsg('Status atualizado offline!');
      } else {
        setErrorMsg('Falha ao atualizar o status localmente.');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_CONFIG[status]?.colorClass || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-xl border border-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Carregando dados da ordem de serviço...</p>
      </div>
    );
  }

  if (errorMsg && !order) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-2xl">
        <AlertTriangle className="w-12 h-12 text-rose-550 mx-auto" />
        <h2 className="text-xl font-bold text-white">Ops, ocorreu um problema</h2>
        <p className="text-sm text-slate-400">{errorMsg}</p>
        <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:underline pt-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Ordens de Serviço
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* 1. LAYOUT PRINCIPAL DO SISTEMA (Oculto na hora de imprimir) */}
      <div className="space-y-8 print:hidden">
        {/* Voltar e Header */}
        <div className="space-y-3">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Ordens de Serviço
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${getStatusColor(status)}`}>
                  {status}
                </span>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Ordem de Serviço #{order.codigo_os || order.id.slice(0, 8)}
                </h1>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Cliente: <strong className="text-slate-200">{client?.name}</strong> • Aberta em {new Date(order.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" /> Imprimir Via do Cliente
              </button>

              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-lg">
                Prioridade: <strong className={priority === 'Alta' ? 'text-rose-400' : priority === 'Média' ? 'text-amber-400' : 'text-slate-400'}>{priority}</strong>
              </span>
            </div>
          </div>
        </div>

      {/* Feedbacks de Operação */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold text-sm">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-450 flex items-center gap-2.5 shadow-lg">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Painel Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Coluna 1: Informações da OS, Status, Laudo Técnico */}
        <div className="lg:col-span-2 space-y-8">

          {/* Ficha Geral */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ClipboardList className="w-5 h-5 text-blue-500" /> Detalhes Físicos do Chamado
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Equipamento</p>
                <p className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                  {order.equipment_details || '—'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente Solicitante</p>
                <p className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  {client?.name} {client?.document ? `(${client.document})` : ''}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-900/80 w-full max-w-full overflow-hidden break-words">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Problema Relatado / Defeito</p>
              <ReactQuill
                theme="snow"
                value={reportedProblem}
                onChange={setReportedProblem}
                modules={modules}
                formats={formats}
                className="bg-slate-950/80 rounded-lg border border-slate-850/80 prose prose-invert text-slate-300 max-w-none text-sm"
              />
            </div>
          </div>

          {/* Gerenciamento de Trabalho */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-indigo-400" /> Status, Técnico e Laudo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-slate-400">Status da OS</label>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        status === 'Aguardando Equipamento' || status === 'Cancelado' ? 'bg-slate-500' :
                        status === 'Aguardando Aprovação' || status === 'Aguardando Peças' ? 'bg-amber-500' :
                        status === 'Em Análise' || status === 'Em Execução' || status === 'Em Testes' ? 'bg-blue-500' :
                        'bg-emerald-500'
                      }`} />
                      <span className="font-semibold text-xs py-0.5 px-1.5 rounded bg-slate-900 border border-slate-850">
                        {status}
                      </span>
                    </div>
                    {updatingStatus ? (
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    ) : (
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {isStatusDropdownOpen && (
                    <>
                      {/* Overlay invisível para fechar ao clicar fora */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsStatusDropdownOpen(false)}
                      />
                      
                      <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl z-25 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 p-1.5 space-y-1">
                        {Object.keys(STATUS_CONFIG).map((statusKey) => {
                          const conf = STATUS_CONFIG[statusKey];
                          const isSelected = status === statusKey;
                          return (
                            <button
                              key={statusKey}
                              type="button"
                              onClick={() => {
                                handleStatusChange(statusKey);
                                setIsStatusDropdownOpen(false);
                              }}
                              className={`w-full text-left py-2 px-3 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected 
                                  ? 'bg-slate-900 text-white font-semibold' 
                                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${conf.colorClass}`}>
                                    {conf.label}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-normal leading-normal">{conf.desc}</p>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Prioridade */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              {/* Previsão de Entrega */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" /> Previsão de Entrega
                </label>
                <input
                  type="date"
                  value={deliveryPrediction}
                  onChange={(e) => setDeliveryPrediction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* Pagamento (Somente se Finalizado) */}
            {status === 'Finalizado' && (
              <div className="flex items-center gap-3 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
                <input
                  type="checkbox"
                  id="pago-checkbox"
                  checked={pago}
                  onChange={(e) => setPago(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer transition-colors"
                />
                <div className="space-y-0.5">
                  <label htmlFor="pago-checkbox" className="text-sm font-bold text-slate-100 cursor-pointer select-none">
                    Ordem de Serviço Paga
                  </label>
                  <p className="text-[10px] text-slate-500 font-medium">Marque esta opção para dar baixa financeira no sistema após a entrega.</p>
                </div>
              </div>
            )}

            {/* Técnico Atribuído */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Técnico Responsável</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="">Nenhum técnico atribuído...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Laudo Técnico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Laudo Técnico / Diagnóstico do Serviço / Serviço Realizado</label>
              <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                <ReactQuill
                  theme="snow"
                  modules={modules}
                  formats={formats}
                  value={technicalReport}
                  onChange={setTechnicalReport}
                  placeholder="Insira as observações técnicas detalhadas, testes executados e solução encontrada..."
                />
              </div>
            </div>

            {/* Seção de Anexo de Mídias */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-500" /> Mídias e Anexos do Serviço
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">Exclusivo para técnicos</span>
              </div>

              {/* Botão de Upload */}
              <div className="flex items-center gap-4">
                <label className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl cursor-pointer text-xs font-bold text-slate-200 transition-all active:scale-95 group">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  )}
                  <span>{uploading ? 'Carregando arquivos...' : 'Anexar Fotos ou Vídeos'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    disabled={uploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-slate-500">Imagens (PNG, JPG) e vídeos suportados.</p>
              </div>

              {/* Lista de Anexos */}
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  {mediaFiles.map((media, idx) => {
                    const isImage = media.type?.startsWith('image/');
                    const isVideo = media.type?.startsWith('video/');

                    return (
                      <div
                        key={idx}
                        className="group relative bg-slate-950 rounded-xl overflow-hidden border border-slate-850 aspect-video flex flex-col justify-between transition-all hover:border-slate-750 hover:shadow-lg shadow-slate-950/50"
                      >
                        {/* Thumbnail */}
                        {isImage ? (
                          <img
                            src={media.url}
                            alt={media.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : isVideo ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                            <Film className="w-8 h-8 text-slate-600 group-hover:text-blue-500 transition-colors" />
                            <span className="absolute bottom-2 left-2 text-[8px] bg-slate-900/80 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">Vídeo</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                            <FileText className="w-8 h-8 text-slate-600" />
                            <span className="absolute bottom-2 left-2 text-[8px] bg-slate-900/80 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase">Arquivo</span>
                          </div>
                        )}

                        {/* Overlay hover actions */}
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
                          {isImage && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(media.url)}
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 hover:text-white transition-all cursor-pointer"
                              title="Visualizar foto"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {isVideo && (
                            <a
                              href={media.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                              title="Reproduzir vídeo"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="p-1.5 bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-900/50 rounded-lg text-slate-405 hover:text-rose-400 transition-all cursor-pointer"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Badges / File Name info */}
                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950 to-slate-950/0 pointer-events-none">
                          <p className="text-[9px] text-slate-350 truncate font-semibold">{media.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Coluna 2: Seção de Peças e Mão de Obra */}
        <div className="space-y-8">

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Boxes className="w-5 h-5 text-emerald-500" /> Peças e Mão de Obra
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Mão de Obra */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Mão de Obra (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={serviceValue}
                  onChange={(e) => setServiceValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                />
              </div>

              {/* Desconto */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-rose-500" /> Desconto (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                />
              </div>
            </div>

            {/* Adicionar Peça do Estoque */}
            <div className="space-y-3 pt-3 border-t border-slate-850">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adicionar Peças do Estoque</p>

              <div className="space-y-2">
                <select
                  value={currentProductId}
                  onChange={(e) => setCurrentProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-150 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="">Buscar peça no estoque...</option>
                  {inventory.map((prod) => (
                    <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
                      {prod.name} (SKU: {prod.sku} • Saldo: {prod.quantity} un • R$ {prod.sale_price})
                    </option>
                  ))}
                </select>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="w-24 shrink-0">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={currentProductQty}
                        onChange={(e) => setCurrentProductQty(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      disabled={(() => {
                        if (!currentProductId) return true;
                        const prod = inventory.find(p => p.id === currentProductId);
                        if (!prod) return true;
                        const existingItem = selectedProducts.find(p => p.product_id === currentProductId);
                        const existingQty = existingItem ? existingItem.quantity : 0;
                        const stockAvailable = prod.quantity + existingQty;
                        return (parseInt(currentProductQty) || 0) > stockAvailable;
                      })()}
                      className={`flex-1 font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                        (() => {
                          if (!currentProductId) return 'bg-slate-800 text-slate-500 cursor-not-allowed';
                          const prod = inventory.find(p => p.id === currentProductId);
                          if (!prod) return 'bg-slate-800 text-slate-500 cursor-not-allowed';
                          const existingItem = selectedProducts.find(p => p.product_id === currentProductId);
                          const existingQty = existingItem ? existingItem.quantity : 0;
                          const stockAvailable = prod.quantity + existingQty;
                          if ((parseInt(currentProductQty) || 0) > stockAvailable) {
                            return 'bg-rose-950/20 text-rose-550 border border-rose-900/50 cursor-not-allowed';
                          }
                          return 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/10 cursor-pointer';
                        })()
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Peça
                    </button>
                  </div>
                  {(() => {
                    const prod = inventory.find(p => p.id === currentProductId);
                    if (prod) {
                      const existingItem = selectedProducts.find(p => p.product_id === currentProductId);
                      const existingQty = existingItem ? existingItem.quantity : 0;
                      const stockAvailable = prod.quantity + existingQty;
                      const qty = parseInt(currentProductQty) || 0;
                      const over = qty > stockAvailable;
                      return (
                        <span className={`text-[10px] font-semibold ${over ? 'text-rose-500 animate-pulse' : 'text-slate-550'}`}>
                          Saldo disponível (Estoque + Alocado): {stockAvailable} un (Estoque atual: {prod.quantity} un)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* Listagem de Peças na OS */}
            <div className="pt-3 border-t border-slate-850">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Peças Alocadas nesta OS</p>

              {selectedProducts.length === 0 ? (
                <div className="text-center py-6 text-slate-550 text-xs font-medium bg-slate-950/30 rounded-xl border border-slate-950">
                  Nenhuma peça vinculada a este serviço.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {selectedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex justify-between items-center text-xs group"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <p className="font-semibold text-slate-200 truncate">{prod.name}</p>
                        <p className="text-slate-500">
                          {prod.quantity} un • R$ {Number(prod.unit_price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-slate-300">
                          R$ {(prod.quantity * prod.unit_price).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(prod.product_id)}
                          className="text-slate-600 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar Serviços do Catálogo */}
            <div className="space-y-3 pt-3 border-t border-slate-850">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adicionar Serviços Realizados</p>

              <div className="space-y-2">
                <select
                  value={currentServiceId}
                  onChange={(e) => handleServiceSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-150 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="">Buscar serviço do catálogo...</option>
                  {availableServices.map((serv) => (
                    <option key={serv.id} value={serv.id}>
                      {serv.nome} (Preço Padrão: R$ {Number(serv.preco_padrao).toFixed(2)})
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <div className="w-16 shrink-0">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      value={currentServiceQty}
                      onChange={(e) => setCurrentServiceQty(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors text-center font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Valor Unitário (R$)"
                      value={currentServicePrice}
                      onChange={(e) => setCurrentServicePrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddService}
                    disabled={!currentServiceId}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Listagem de Serviços do Catálogo na OS */}
            <div className="pt-3 border-t border-slate-850">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Serviços Vinculados nesta OS</p>

              {selectedServices.length === 0 ? (
                <div className="text-center py-6 text-slate-550 text-xs font-medium bg-slate-950/30 rounded-xl border border-slate-950">
                  Nenhum serviço do catálogo vinculado.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {selectedServices.map((serv) => (
                    <div
                      key={serv.id}
                      className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex justify-between items-center text-xs group"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <p className="font-semibold text-slate-200 truncate">{serv.name}</p>
                        <p className="text-slate-500">
                          {serv.quantity} un • R$ {Number(serv.unit_price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-slate-300">
                          R$ {(serv.quantity * serv.unit_price).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveService(serv.service_id)}
                          className="text-slate-600 hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo Financeiro */}
            <div className="pt-4 border-t border-slate-850 space-y-2.5 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Mão de Obra Geral:</span>
                <span className="font-semibold text-slate-200">R$ {parseFloat(serviceValue).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Serviços do Catálogo:</span>
                <span className="font-semibold text-slate-200">
                  R$ {selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Peças Utilizadas:</span>
                <span className="font-semibold text-slate-200">
                  R$ {selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-slate-850 my-1" />
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-250">
                  R$ {(
                    parseFloat(serviceValue) +
                    selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) +
                    selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
                  ).toFixed(2)}
                </span>
              </div>
              {parseFloat(discount) > 0 && (
                <div className="flex justify-between items-center text-xs text-rose-455 font-bold">
                  <span>Desconto Aplicado:</span>
                  <span>- R$ {parseFloat(discount).toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-slate-850 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">VALOR TOTAL DO SERVIÇO:</span>
                <span className="text-base font-extrabold text-emerald-450 flex items-center">
                  R$ {parseFloat(totalValue).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={saving}
                className="bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 disabled:bg-slate-800 disabled:border-transparent text-rose-400 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Excluir OS
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/15 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Salvar Alterações da OS
              </button>
            </div>
          </div>

        </div>
        
        {/* Nova Seção: Checklist de Entrada e Saída (Swiss Technical Minimalism) */}
        <div className="mt-8 space-y-4 lg:col-span-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Checklist e Condições
          </h2>
          <div className={`grid grid-cols-1 ${status === 'Finalizado' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-8`}>
            
            {/* Bloco de Entrada (Recebimento) */}
            <div className="bg-zinc-950 border-2 border-zinc-900 rounded-none p-6 shadow-2xl flex flex-col h-fit">
              <div 
                onClick={() => setIsEntryOpen(!isEntryOpen)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900 mb-6 cursor-pointer select-none group/header"
              >
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">Fase de Recebimento</span>
                  <h3 className="text-sm font-bold font-mono text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" /> Entrada
                  </h3>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-1 uppercase tracking-wider rounded-none">
                    Preenchimento Inicial
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover/header:text-zinc-300 transition-transform duration-150 ${isEntryOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {isEntryOpen && (
                <>
                  <div className="flex-1 space-y-4">
                    {checklistTemplateItems.map((item) => (
                      <ChecklistItemRow 
                        key={item.id} 
                        label={item.label} 
                        field={item.id} 
                        checklist={entryChecklist} 
                        setChecklist={setEntryChecklist} 
                      />
                    ))}
                    
                    {/* Senha */}
                    <div className="pt-4 border-t border-zinc-900">
                      <div className="grid grid-cols-[1fr_auto] gap-4 items-center mb-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Possui Senha / PIN?</span>
                        <button
                          type="button"
                          onClick={() => setEntryChecklist(prev => ({
                            ...prev,
                            password_pin: { ...prev.password_pin, has_password: !prev.password_pin.has_password }
                          }))}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-none border transition-colors duration-150 p-0.5 focus:outline-none ${entryChecklist.password_pin.has_password ? 'bg-emerald-950 border-emerald-500' : 'bg-zinc-950 border-zinc-800'}`}
                        >
                          <span className={`pointer-events-none inline-block h-full w-4 transform rounded-none transition-transform duration-150 ${entryChecklist.password_pin.has_password ? 'translate-x-5 bg-emerald-500' : 'translate-x-0 bg-zinc-800'}`} />
                        </button>
                      </div>
                      {entryChecklist.password_pin.has_password && (
                        <input
                          type="text"
                          placeholder="[Senha do Equipamento]"
                          value={entryChecklist.password_pin.password_value}
                          onChange={(e) => setEntryChecklist(prev => ({
                            ...prev,
                            password_pin: { ...prev.password_pin, password_value: e.target.value }
                          }))}
                          className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-650 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none transition-colors font-mono"
                        />
                      )}
                    </div>
     
                    {/* Observações Gerais */}
                    <div className="pt-4 border-t border-zinc-900">
                      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">Observações Gerais (Entrada)</span>
                      <textarea
                        rows={2}
                        placeholder="[Observações adicionais de recebimento]"
                        value={entryChecklist.general_notes}
                        onChange={(e) => setEntryChecklist(prev => ({ ...prev, general_notes: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-none px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors resize-none font-mono"
                      />
                    </div>
                  </div>
     
                  <div className="mt-6 pt-6 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => handleSaveChecklists('entry')}
                      disabled={savingChecklist}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-900 text-black font-bold uppercase tracking-wider text-xs py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-none border-b-4 border-emerald-800 hover:border-emerald-500 active:border-b-0 active:translate-y-[2px]"
                    >
                      {savingChecklist ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                      <span>Salvar Checklist de Entrada</span>
                    </button>
                  </div>
                </>
              )}
            </div>
 
            {/* Bloco de Saída (Entrega) - Apenas visível sob status 'Finalizado' */}
            {status === 'Finalizado' && (
              <div className="border-2 p-6 shadow-2xl flex flex-col h-fit rounded-none bg-zinc-950 border-zinc-900">
                <div 
                  onClick={() => setIsExitOpen(!isExitOpen)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900 mb-6 cursor-pointer select-none group/header"
                >
                  <div>
                    <span className="text-[9px] font-mono text-zinc-650 uppercase tracking-widest block mb-0.5">Fase de Entrega</span>
                    <h3 className="text-sm font-bold font-mono text-sky-500 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-sky-500 animate-pulse" /> Saída
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // evitar colapsar ao clicar no botão
                        setExitChecklist(JSON.parse(JSON.stringify(entryChecklist)));
                      }}
                      className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1 uppercase tracking-wider cursor-pointer transition-colors rounded-none"
                      title="Copiar as condições registradas na Entrada"
                    >
                      Copiar da Entrada
                    </button>
                    <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-1 uppercase tracking-wider rounded-none">
                      Revisão Final
                    </span>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover/header:text-zinc-300 transition-transform duration-150 ${isExitOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                
                {isExitOpen && (
                  <>
                    <div className="flex-1 space-y-4">
                      {checklistTemplateItems.map((item) => (
                        <ChecklistItemRow 
                          key={item.id} 
                          label={item.label} 
                          field={item.id} 
                          checklist={exitChecklist} 
                          setChecklist={setExitChecklist} 
                          disabled={false} 
                          color="sky" 
                        />
                      ))}
                      
                      {/* Observações Gerais */}
                      <div className="pt-4 border-t border-zinc-900">
                        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">Observações Gerais (Saída)</span>
                        <textarea
                          rows={2}
                          placeholder="[Observações adicionais de entrega]"
                          value={exitChecklist.general_notes}
                          onChange={(e) => setExitChecklist(prev => ({ ...prev, general_notes: e.target.value }))}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-none px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors resize-none font-mono"
                        />
                      </div>
                    </div>
       
                    <div className="mt-6 pt-6 border-t border-zinc-900">
                      <button
                        type="button"
                        onClick={() => handleSaveChecklists('exit')}
                        disabled={savingChecklist}
                        className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-900 text-black font-bold uppercase tracking-wider text-xs py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-none border-b-4 border-sky-800 hover:border-sky-500 active:border-b-0 active:translate-y-[2px]"
                      >
                        {savingChecklist ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                        <span>Salvar Checklist de Saída</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
 
          </div>
          </div>
        </div>

      </div>

      {/* Lightbox Modal para Visualização de Imagem */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl relative bg-slate-900">
            <img
              src={previewImage}
              alt="Preview do anexo"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}



      {/* 2. LAYOUT EXCLUSIVO DE IMPRESSÃO DA VIA DO CLIENTE (Visível apenas na impressora) */}
      <div className="hidden print:block bg-white text-black min-h-screen p-6 font-sans text-sm">
        <PrintDocumentContent
          order={order}
          client={client}
          company={company}
          selectedProducts={selectedProducts}
          selectedServices={selectedServices}
          subtotalValue={
            (parseFloat(serviceValue) || 0) +
            selectedServices.reduce((sum: number, s: any) => sum + (s.quantity * s.unit_price), 0) +
            selectedProducts.reduce((sum: number, p: any) => sum + (p.quantity * p.unit_price), 0)
          }
          discountValue={parseFloat(discount) || 0}
          laborValue={parseFloat(serviceValue) || 0}
        />
      </div>

      {/* MODAL DE FINALIZAÇÃO FINANCEIRA */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-850">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Finalização e Caixa
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Ao alterar o status para <strong>{pendingStatusUpdate}</strong>, registre as informações de pagamento para alimentar o Fluxo de Caixa.
              </p>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-850 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPaymentAndStatus}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Subcomponente com a estrutura estrita da folha A4 em estilo brutalista
function PrintDocumentContent({
  order,
  client,
  company,
  selectedProducts,
  selectedServices,
  subtotalValue,
  discountValue,
  laborValue
}: any) {
  const currentDate = new Date().toLocaleDateString('pt-BR');

  const parseEquipmentDetails = (details: string = '') => {
    const snRegex = /\s*\(S\/N:\s*([^)]+)\)/i;
    const match = details.match(snRegex);
    
    let serialNumber = '';
    let specs = details;
    
    if (match) {
      serialNumber = match[1].trim();
      specs = details.replace(snRegex, '').trim();
    }
    
    const isInvalidSN = !serialNumber || 
                        serialNumber === '—' || 
                        serialNumber.toLowerCase() === 'n/a' || 
                        serialNumber.toLowerCase() === 'não informado' || 
                        serialNumber.toLowerCase() === 'nao informado';
                        
    return {
      specs: specs || '—',
      serialNumber: isInvalidSN ? '' : serialNumber
    };
  };

  const { specs, serialNumber } = parseEquipmentDetails(order.equipment_details);

  const getTechnicalReportTitle = (status: string) => {
    const finalStatuses = ['Pronto para Retirada', 'Finalizado'];
    const initialStatuses = ['Aguardando Equipamento', 'Em Análise', 'Aguardando Aprovação', 'Aprovado', 'Aguardando Peças', 'Em Execução', 'Em Testes'];
    
    if (finalStatuses.includes(status)) {
      return 'LAUDO TÉCNICO & SERVIÇOS EXECUTADOS';
    } else if (initialStatuses.includes(status)) {
      return 'LAUDO TÉCNICO & SERVIÇOS A EXECUTAR';
    } else {
      return 'LAUDO TÉCNICO & RELATÓRIO DE SERVIÇOS';
    }
  };

  return (
    <div className="space-y-4 print:space-y-2 flex flex-col justify-between h-full bg-white text-black p-1">
      <div className="space-y-4 print:space-y-2">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 print:pb-1.5">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="w-14 h-14 print:w-11 print:h-11 object-contain" 
              />
            ) : (
              <div className="w-14 h-14 print:w-11 print:h-11 bg-black text-white font-extrabold flex items-center justify-center text-xl rounded-none">
                TC
              </div>
            )}
            <div>
              <h2 className="text-lg print:text-sm font-black tracking-tight uppercase">{company.name}</h2>
              <p className="text-xs print:text-[10px] text-slate-700 font-semibold">{company.email}</p>
              <p className="text-xs print:text-[10px] text-slate-700 font-semibold">{company.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] print:text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Ordem de Serviço</span>
            <span className="text-xl print:text-sm font-black font-mono text-black block mt-0.5">
              #{order.codigo_os || `OS-${order.id.slice(0, 8).toUpperCase()}`}
            </span>
            <span className="text-[10px] print:text-[8px] font-medium text-slate-600 block mt-1 print:mt-0.5">
              Data de Abertura: {new Date(order.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* BLOCO 1: CLIENTE */}
        <div className="border border-black p-4 print:p-2">
          <h3 className="text-xs print:text-[9px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block mb-3 print:mb-1">
            Identificação do Cliente
          </h3>
          <div className="grid grid-cols-3 gap-4 print:gap-2 text-xs print:text-[10px]">
            <div>
              <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase block">Nome</span>
              <span className="font-bold text-black text-sm print:text-xs">{client?.name || 'Membro da Equipe'}</span>
            </div>
            <div>
              <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase block">Telefone</span>
              <span className="font-semibold text-black font-mono">{client?.phone || '—'}</span>
            </div>
            <div>
              <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase block">E-mail</span>
              {client?.email && client.email.trim() !== '' ? (
                <span className="font-semibold text-black font-mono">{client.email}</span>
              ) : (
                <span className="text-slate-400 italic font-normal">Não informado</span>
              )}
            </div>
          </div>
        </div>

        {/* BLOCO 2: EQUIPAMENTO & DIAGNÓSTICO */}
        <div className="border border-black p-4 print:p-2">
          <h3 className="text-xs print:text-[9px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block mb-3 print:mb-1">
            Equipamento & Problema Reportado
          </h3>
          <div className="grid grid-cols-2 gap-4 print:gap-2 text-xs print:text-[10px]">
            <div>
              <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase block">Especificação do Equipamento</span>
              <span className="font-bold text-black text-xs print:text-[10px]">{specs}</span>
            </div>
            <div>
              <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase block">Número de Série (S/N)</span>
              {serialNumber ? (
                <span className="font-semibold text-black font-mono">{serialNumber}</span>
              ) : (
                <span className="text-slate-400 italic font-normal">Não informado</span>
              )}
            </div>
          </div>
          <div className="space-y-3 print:space-y-1 mt-3 print:mt-1.5">
            <div className="border-t border-slate-200 pt-2 print:pt-1">
              <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase block">Defeito Relatado pelo Cliente</span>
              <div 
                className="text-xs print:text-[10px] text-black prose max-w-none print:prose-sm mt-0.5 print:text-black font-medium"
                dangerouslySetInnerHTML={{ __html: order.reported_problem }}
              />
            </div>
            {order.technical_report && (
              <div className="border-t border-slate-200 pt-2 print:pt-1">
                <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase block">
                  {getTechnicalReportTitle(order.status)}
                </span>
                <div 
                  className="text-xs print:text-[10px] text-black prose max-w-none print:prose-sm mt-0.5 print:text-black font-medium"
                  dangerouslySetInnerHTML={{ __html: order.technical_report }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WRAPPER ÚNICO E INDISSOCIÁVEL COM INLINE STYLING PARA IMPEDIR QUEBRAS ENTRE TABELA, FINANCEIRO E ASSINATURA */}
      <div 
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} 
        className="break-inside-avoid print:break-inside-avoid space-y-4 print:space-y-2"
      >
        {/* BLOCO 3: SERVIÇOS E PEÇAS */}
        <div className="border border-black p-4 print:p-2">
          <h3 className="text-xs print:text-[9px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block mb-3 print:mb-1">
            Itens Adicionados & Serviços Prestados
          </h3>
          
          {selectedProducts.length === 0 && selectedServices.length === 0 && laborValue === 0 ? (
            <p className="text-xs print:text-[10px] text-slate-500 italic py-2">Nenhum serviço ou peça vinculados.</p>
          ) : (
            <table className="w-full text-left text-xs print:text-[10px] border-collapse mt-2 print:mt-1">
              <thead>
                <tr className="border-b border-black text-black font-black text-[10px] print:text-[8px] uppercase tracking-wider bg-slate-100">
                  <th className="py-2 px-2 print:py-1">Descrição do Serviço / Peça</th>
                  <th className="py-2 px-2 print:py-1 text-center w-24 print:w-20">Valor Unitário</th>
                  <th className="py-2 px-2 print:py-1 text-center w-16 print:w-12">Qtd.</th>
                  <th className="py-2 px-2 print:py-1 text-right w-24 print:w-20">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {laborValue > 0 && (
                  <tr className="font-semibold text-black">
                    <td className="py-2.5 px-2 print:py-1 font-bold">Mão de Obra Técnica (Serviço Geral)</td>
                    <td className="py-2.5 px-2 print:py-1 text-center font-mono">R$ {laborValue.toFixed(2)}</td>
                    <td className="py-2.5 px-2 print:py-1 text-center">1</td>
                    <td className="py-2.5 px-2 print:py-1 text-right font-mono">R$ {laborValue.toFixed(2)}</td>
                  </tr>
                )}
                
                {selectedServices.map((item: any, idx: number) => (
                  <tr key={`serv-${idx}`} className="text-slate-800">
                    <td className="py-2 px-2 print:py-1 font-medium">{item.name} <span className="text-[10px] print:text-[8px] font-bold text-slate-500 border border-slate-300 px-1 py-0.2 ml-1 rounded-none uppercase">Serviço</span></td>
                    <td className="py-2 px-2 print:py-1 text-center font-mono">R$ {Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 px-2 print:py-1 text-center font-bold">{item.quantity}</td>
                    <td className="py-2 px-2 print:py-1 text-right font-mono font-bold text-black">R$ {(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}

                {selectedProducts.map((item: any, idx: number) => (
                  <tr key={`prod-${idx}`} className="text-slate-800">
                    <td className="py-2 px-2 print:py-1 font-medium">{item.name} <span className="text-[10px] print:text-[8px] font-bold text-slate-500 border border-slate-300 px-1 py-0.2 ml-1 rounded-none uppercase">Peça</span></td>
                    <td className="py-2 px-2 print:py-1 text-center font-mono">R$ {Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 px-2 print:py-1 text-center font-bold">{item.quantity}</td>
                    <td className="py-2 px-2 print:py-1 text-right font-mono font-bold text-black">R$ {(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BLOCO 4: RESUMO FINANCEIRO */}
        <div className="flex justify-between items-stretch gap-6 print:gap-3">
          <div className="flex-1 border border-black p-4 print:p-2 min-h-[100px] print:min-h-[60px] flex flex-col justify-between">
            <span className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Observações do Recebimento / Garantia</span>
            <p className="text-[10px] print:text-[9px] text-slate-700 leading-relaxed mt-1">
              Garantia de 90 dias referente aos serviços executados e peças trocadas. O equipamento retirado deve ser conferido no ato da entrega.
            </p>
          </div>
          
          <div className="w-80 print:w-64 border border-black p-4 print:p-2 space-y-2.5 print:space-y-1 bg-slate-50">
            <div className="flex justify-between text-xs print:text-[10px] text-slate-700 font-semibold">
              <span>Subtotal dos Itens:</span>
              <span className="font-mono">R$ {subtotalValue.toFixed(2)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-xs print:text-[10px] text-rose-650 font-bold">
                <span>Desconto Aplicado:</span>
                <span className="font-mono">- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-black" />
            <div className="flex justify-between items-center">
              <span className="text-xs print:text-[10px] font-black uppercase text-black">Total da O.S.:</span>
              <div className="flex items-center gap-2">
                {order.pago && (
                  <span className="px-1.5 py-0.5 border-2 border-emerald-600 text-emerald-600 text-[9px] print:text-[8px] font-black uppercase tracking-wider">
                    RECEBIDO
                  </span>
                )}
                <span className="text-lg print:text-sm font-black font-mono text-black">
                  R$ {Math.max(0, subtotalValue - discountValue).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ E ASSINATURA */}
        <div className="pt-6 print:pt-2 border-t border-black grid grid-cols-2 gap-8 print:gap-4 mt-6 print:mt-2">
          <div>
            <p className="text-[10px] print:text-[8px] font-bold text-slate-500 uppercase">Local e Data</p>
            <p className="text-xs print:text-[10px] font-bold text-black mt-2 print:mt-1 font-mono">{company.name}, {currentDate}</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black w-full h-8 print:h-6" />
            <p className="text-[9px] print:text-[8px] font-bold text-slate-500 uppercase mt-1.5 print:mt-1">Assinatura do Cliente (Retirada)</p>
            <p className="text-[9px] print:text-[7px] text-slate-500 font-medium">Declaro ter recebido o equipamento testado e em perfeito estado.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
