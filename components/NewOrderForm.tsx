'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Wrench, 
  Tag, 
  Calendar, 
  User, 
  Boxes,
  DollarSign,
  X
} from 'lucide-react';
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


interface Client {
  id: string;
  name: string;
  type: string;
}

interface NewOrderFormProps {
  clients: Client[];
  onSuccess: () => void;
}

export default function NewOrderForm({ clients, onSuccess }: NewOrderFormProps) {
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get('clientId') || searchParams.get('client_id') || '';
  const queryEquipmentId = searchParams.get('equipmentId') || searchParams.get('equipment_id') || '';
  const queryEquipmentName = searchParams.get('equipment') || searchParams.get('equipment_details') || '';

  // Estados dos Campos Principais
  const [clientId, setClientId] = useState(queryClientId);
  const [equipmentId, setEquipmentId] = useState(queryEquipmentId || (queryEquipmentName ? 'manual' : ''));
  const [equipmentDetails, setEquipmentDetails] = useState(queryEquipmentName || '');
  const [reportedProblem, setReportedProblem] = useState('');
  const [status, setStatus] = useState('Em Análise');
  const [priority, setPriority] = useState('Média');
  const [technicianId, setTechnicianId] = useState('');
  const [deliveryPrediction, setDeliveryPrediction] = useState('');
  
  // Estado Financeiro / Mão de Obra
  const [serviceValue, setServiceValue] = useState('0'); // Valor da mão de obra
  const [discount, setDiscount] = useState('0');         // Valor do desconto
  const [subtotalValue, setSubtotalValue] = useState('0'); // Valor subtotal
  const [totalValue, setTotalValue] = useState('0');     // Valor total (Mão de Obra + Peças)

  // Listagem de Equipamentos e Inventário
  const [equipments, setEquipments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isManualEquipment, setIsManualEquipment] = useState(false);

  // Estados de Controle / Dados de Criação Inline
  const [companyId, setCompanyId] = useState('mock-tenant-id');
  const [clientsList, setClientsList] = useState<Client[]>(clients);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  // Formulário Novo Cliente + Equipamento
  const [clientModalStep, setClientModalStep] = useState(1); // 1 = Dados do Cliente, 2 = Dados do Equipamento
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState('PF'); // 'PF' | 'PJ'
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const [newEqName, setNewEqName] = useState('');
  const [newEqBrand, setNewEqBrand] = useState('');
  const [newEqModel, setNewEqModel] = useState('');
  const [newEqSerial, setNewEqSerial] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState('');

  // Formulário Nova Peça/Produto
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdCapacity, setNewProdCapacity] = useState('');
  const [newProdQty, setNewProdQty] = useState('10');
  const [newProdSalePrice, setNewProdSalePrice] = useState('');
  
  // SSD especificações
  const [newProdSsdTech, setNewProdSsdTech] = useState('');
  const [newProdSsdGb, setNewProdSsdGb] = useState('');

  // Memória RAM especificações
  const [newProdRamApp, setNewProdRamApp] = useState('');
  const [newProdRamTech, setNewProdRamTech] = useState('');
  const [newProdRamSpeed, setNewProdRamSpeed] = useState('');
  const [newProdRamGb, setNewProdRamGb] = useState('');

  const [savingProduct, setSavingProduct] = useState(false);
  const [productModalError, setProductModalError] = useState('');

  // Sincroniza a prop 'clients' com a listagem interna 'clientsList'
  useEffect(() => {
    setClientsList(clients);
  }, [clients]);

  // Efeito para sincronizar nome e capacidade da peça criada inline baseada nos campos selecionados
  useEffect(() => {
    if (newProdCategory === 'Memória RAM') {
      if (newProdRamGb && newProdRamTech && newProdRamApp) {
        const computedCap = `${newProdRamGb} ${newProdRamTech}${newProdRamSpeed ? ` ${newProdRamSpeed}` : ''} (${newProdRamApp})`;
        if (newProdCapacity !== computedCap) setNewProdCapacity(computedCap);
        
        const speedPart = newProdRamSpeed ? ` ${newProdRamSpeed}` : '';
        const brandPart = newProdBrand ? ` ${newProdBrand}` : '';
        const computedName = `Memória RAM ${newProdRamTech} ${newProdRamGb}${speedPart}${brandPart}`;
        if (newProdName !== computedName) setNewProdName(computedName);
      }
    } else if (newProdCategory === 'SSD') {
      if (newProdSsdGb && newProdSsdTech) {
        const computedCap = `${newProdSsdGb} ${newProdSsdTech}`;
        if (newProdCapacity !== computedCap) setNewProdCapacity(computedCap);
        
        const brandPart = newProdBrand ? ` ${newProdBrand}` : '';
        const computedName = `SSD ${newProdSsdGb}${brandPart} ${newProdSsdTech}`;
        if (newProdName !== computedName) setNewProdName(computedName);
      }
    }
  }, [newProdCategory, newProdBrand, newProdRamApp, newProdRamTech, newProdRamSpeed, newProdRamGb, newProdSsdTech, newProdSsdGb, newProdCapacity, newProdName]);

  // Carrega o company_id associado ao perfil logado no mount
  useEffect(() => {
    const getCompany = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

          if (profile?.company_id) {
            setCompanyId(profile.company_id);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar company_id:', err);
      }
    };
    getCompany();
  }, []);

  // Peças Selecionadas
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentProductQty, setCurrentProductQty] = useState('1');

  // Serviços Selecionados do Catálogo
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [currentServiceId, setCurrentServiceId] = useState('');
  const [currentServiceQty, setCurrentServiceQty] = useState('1');
  const [currentServicePrice, setCurrentServicePrice] = useState('0.00');

  // Estados de Controle / Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Lista de Técnicos carregada dinamicamente
  const [technicians, setTechnicians] = useState<any[]>([]);

  // 1. Carrega o estoque de produtos, serviços e técnicos apenas uma vez na montagem
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const { data: invData } = await supabase
          .from('products_inventory')
          .select('*')
          .order('name');

        if (invData && invData.length > 0) {
          setInventory(invData);
        } else {
          // Fallback Local
          const localInv = localStorage.getItem('mock-inventory');
          if (localInv) {
            setInventory(JSON.parse(localInv));
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar inventário, rodando local:', err);
        const localInv = localStorage.getItem('mock-inventory');
        if (localInv) {
          setInventory(JSON.parse(localInv));
        }
      }
    };
    fetchInventory();

    const fetchServices = async () => {
      try {
        const { data: servsData } = await supabase
          .from('services')
          .select('*')
          .eq('ativo', true)
          .order('nome');
        if (servsData && servsData.length > 0) {
          setAvailableServices(servsData);
        }
      } catch (err) {
        console.warn('Erro ao carregar serviços:', err);
      }
    };
    fetchServices();

    const fetchTechnicians = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'technician');

        if (data && data.length > 0) {
          setTechnicians(data.map(t => ({
            id: t.id,
            name: t.full_name || t.email?.split('@')[0] || 'Técnico'
          })));
        } else {
          loadLocalTechnicians();
        }
      } catch (err) {
        console.warn('Erro ao carregar técnicos, tentando local:', err);
        loadLocalTechnicians();
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

    fetchTechnicians();
  }, []);

  // 2. Carrega equipamentos do cliente selecionado (com carregamento instantâneo via cache local)
  useEffect(() => {
    if (!clientId) {
      setEquipments([]);
      setEquipmentId('');
      return;
    }

    // Carrega instantaneamente do cache local para resposta imediata
    const localEqs = localStorage.getItem('mock-equipments');
    let localFiltered: any[] = [];
    if (localEqs) {
      localFiltered = JSON.parse(localEqs).filter((e: any) => e.client_id === clientId);
      setEquipments(localFiltered);
      if (localFiltered.length > 0) {
        const hasQueryEq = queryEquipmentId && localFiltered.some((e: any) => e.id === queryEquipmentId);
        setEquipmentId(hasQueryEq ? queryEquipmentId : (queryEquipmentName ? 'manual' : localFiltered[0].id));
        setIsManualEquipment(hasQueryEq ? false : (queryEquipmentName ? true : false));
      } else {
        setEquipmentId('manual');
        setIsManualEquipment(true);
      }
    } else {
      setEquipmentId('manual');
      setIsManualEquipment(true);
    }

    // Dispara busca assíncrona do Supabase para atualizar
    const fetchOnlineEquipments = async () => {
      try {
        const { data: eqsData, error } = await supabase
          .from('client_equipments')
          .select('*')
          .eq('client_id', clientId);

        if (!error && eqsData && eqsData.length > 0) {
          setEquipments(eqsData);
          const hasQueryEq = queryEquipmentId && eqsData.some((e: any) => e.id === queryEquipmentId);
          setEquipmentId(hasQueryEq ? queryEquipmentId : (queryEquipmentName ? 'manual' : eqsData[0].id));
          setIsManualEquipment(hasQueryEq ? false : (queryEquipmentName ? true : false));
        }
      } catch (err) {
        console.warn('Erro ao carregar equipamentos do Supabase:', err);
      }
    };

    fetchOnlineEquipments();
  }, [clientId, queryEquipmentId, queryEquipmentName]);

  // 2. Controla o preenchimento automático das especificações se selecionar um equipamento pronto
  useEffect(() => {
    if (equipmentId === 'manual' || !equipmentId) {
      setIsManualEquipment(true);
      // Only clear if the current details is not the prefilled query value or if no query value is present
      if (!queryEquipmentName) {
        setEquipmentDetails('');
      }
    } else {
      setIsManualEquipment(false);
      const selected = equipments.find((e) => e.id === equipmentId);
      if (selected) {
        setEquipmentDetails(`${selected.name} - ${selected.brand} ${selected.model} (S/N: ${selected.serial_number || '—'})`);
      }
    }
  }, [equipmentId, equipments, queryEquipmentName]);

  // 3. Atualiza o Valor Total e Subtotal somando Mão de Obra + Peças + Serviços do Catálogo
  useEffect(() => {
    const labor = parseFloat(serviceValue) || 0;
    const partsTotal = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const servicesTotal = selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const subtotal = labor + partsTotal + servicesTotal;
    const disc = parseFloat(discount) || 0;
    setSubtotalValue(subtotal.toFixed(2));
    setTotalValue(Math.max(0, subtotal - disc).toFixed(2));
  }, [serviceValue, selectedProducts, selectedServices, discount]);

  // Avança para a etapa do equipamento no modal de cliente (criação inline)
  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newClientName) {
      setClientModalError('Por favor, preencha o nome do cliente (*).');
      return;
    }
    setClientModalError('');
    setClientModalStep(2);
  };

  // Salva o novo cliente e equipamento (criação inline)
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newEqName) {
      setClientModalError('Por favor, preencha os campos obrigatórios (*).');
      return;
    }
    setSavingClient(true);
    setClientModalError('');

    try {
      const clientData = {
        company_id: companyId,
        name: newClientName,
        type: newClientType,
        document: newClientDoc || '',
        phone: newClientPhone || '',
        email: newClientEmail || '',
      };

      let newClient: Client | null = null;
      let newEquipment: any = null;

      // 1. Salva o cliente
      const { data: insertedClient, error: clientErr } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (clientErr) {
        console.warn('Erro Supabase ao salvar cliente, salvando mock local:', clientErr.message);
        
        const mockClientsStr = localStorage.getItem('mock-clients') || '[]';
        const parsedClients = JSON.parse(mockClientsStr);
        const nextNumber = Math.max(...parsedClients.map((c: any) => c.client_number || 1000), 1000) + 1;
        const mockClientId = `mock-client-${Date.now()}`;
        
        newClient = {
          id: mockClientId,
          ...clientData,
        };
        
        parsedClients.push({
          ...newClient,
          client_number: nextNumber,
        });
        localStorage.setItem('mock-clients', JSON.stringify(parsedClients));
      } else {
        newClient = insertedClient;
      }

      if (!newClient) throw new Error('Falha ao registrar novo cliente.');

      // 2. Salva o equipamento associado
      const eqData = {
        company_id: companyId,
        client_id: newClient.id,
        name: newEqName,
        brand: newEqBrand || '',
        model: newEqModel || '',
        serial_number: newEqSerial || '',
      };

      const { data: insertedEq, error: eqErr } = await supabase
        .from('client_equipments')
        .insert(eqData)
        .select()
        .single();

      if (eqErr) {
        console.warn('Erro Supabase ao salvar equipamento, salvando mock local:', eqErr.message);
        
        const mockEqsStr = localStorage.getItem('mock-equipments') || '[]';
        const parsedEqs = JSON.parse(mockEqsStr);
        newEquipment = {
          id: `mock-eq-${Date.now()}`,
          ...eqData,
        };
        parsedEqs.push(newEquipment);
        localStorage.setItem('mock-equipments', JSON.stringify(parsedEqs));
      } else {
        newEquipment = insertedEq;
      }

      // 3. Atualiza os estados para auto-seleção imediata
      setClientsList((prev) => [...prev, newClient!]);
      setClientId(newClient.id);

      if (newEquipment) {
        setEquipments((prev) => [...prev, newEquipment]);
        setEquipmentId(newEquipment.id);
        setIsManualEquipment(false);
      }

      // 4. Reseta e fecha o modal
      setIsNewClientModalOpen(false);
      setClientModalStep(1);
      setNewClientName('');
      setNewClientType('PF');
      setNewClientDoc('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewEqName('');
      setNewEqBrand('');
      setNewEqModel('');
      setNewEqSerial('');
    } catch (err: any) {
      setClientModalError(err.message || 'Erro inesperado ao salvar cliente/equipamento.');
    } finally {
      setSavingClient(false);
    }
  };

  // Salva a nova peça/produto no estoque (criação inline)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSalePrice) {
      setProductModalError('Por favor, preencha os campos obrigatórios (*).');
      return;
    }
    setSavingProduct(true);
    setProductModalError('');

    try {
      // Geração inteligente de SKU baseado na categoria e marca
      const catClean = (newProdCategory || 'OUT').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase();
      const catCode = catClean.slice(0, 3).padEnd(3, 'X');
      const brandClean = (newProdBrand || 'GEN').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase();
      const brandCode = brandClean.slice(0, 3).padEnd(3, 'X');
      const prefix = `${catCode}-${brandCode}-`;

      const matchingProducts = inventory.filter(p => p.sku && p.sku.startsWith(prefix));
      const numbers = matchingProducts.map(p => {
        const parts = p.sku.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart);
        return isNaN(num) ? 0 : num;
      });

      const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      const paddedNum = String(nextNum).padStart(3, '0');
      const finalSku = `${prefix}${paddedNum}`;

      const salePriceNum = parseFloat(newProdSalePrice) || 0;
      const costPriceNum = salePriceNum * 0.6;
      const qtyNum = parseInt(newProdQty) || 0;

      const productData = {
        company_id: companyId,
        name: newProdName,
        sku: finalSku,
        category: newProdCategory || 'Peças',
        brand: newProdBrand || '',
        capacity: newProdCapacity || '',
        quantity: qtyNum,
        cost_price: costPriceNum,
        sale_price: salePriceNum,
        min_stock_alert: 1,
      };

      let newProduct: any = null;

      const { data: insertedProd, error: prodErr } = await supabase
        .from('products_inventory')
        .insert(productData)
        .select()
        .single();

      if (prodErr) {
        console.warn('Erro Supabase ao salvar produto, salvando mock local:', prodErr.message);
        
        const mockInvStr = localStorage.getItem('mock-inventory') || '[]';
        const parsedInv = JSON.parse(mockInvStr);
        newProduct = {
          id: `mock-prod-${Date.now()}`,
          ...productData,
        };
        parsedInv.push(newProduct);
        localStorage.setItem('mock-inventory', JSON.stringify(parsedInv));
      } else {
        newProduct = insertedProd;
      }

      if (!newProduct) throw new Error('Falha ao registrar novo produto.');

      // Atualiza listagem dinâmica de produtos do estoque
      setInventory((prev) => [...prev, newProduct]);
      setCurrentProductId(newProduct.id);

      // Reseta e fecha o modal
      setIsNewProductModalOpen(false);
      setNewProdName('');
      setNewProdCategory('');
      setNewProdBrand('');
      setNewProdCapacity('');
      setNewProdQty('10');
      setNewProdSalePrice('');
      setNewProdSsdTech('');
      setNewProdSsdGb('');
      setNewProdRamApp('');
      setNewProdRamTech('');
      setNewProdRamSpeed('');
      setNewProdRamGb('');
    } catch (err: any) {
      setProductModalError(err.message || 'Erro inesperado ao salvar produto.');
    } finally {
      setSavingProduct(false);
    }
  };

  // Adiciona produto ao chamado
  const handleAddProduct = () => {
    if (!currentProductId) return;
    
    const prod = inventory.find((p) => p.id === currentProductId);
    if (!prod) return;

    const qty = parseInt(currentProductQty) || 1;
    if (qty > prod.quantity) {
      alert(`Quantidade indisponível no estoque. Saldo atual: ${prod.quantity} un`);
      return;
    }

    // Verifica se já está adicionado
    const existsIndex = selectedProducts.findIndex((p) => p.product_id === currentProductId);
    if (existsIndex >= 0) {
      const updated = [...selectedProducts];
      const newQty = updated[existsIndex].quantity + qty;
      if (newQty > prod.quantity) {
        alert(`A quantidade total excede o saldo do estoque (${prod.quantity} un)`);
        return;
      }
      updated[existsIndex].quantity = newQty;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
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

  // Remove produto do chamado
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    if (!clientId) {
      setErrorMsg('Por favor, selecione um cliente.');
      setLoading(false);
      return;
    }

    const isProblemEmpty = !reportedProblem || reportedProblem.trim() === '' || reportedProblem === '<p><br></p>';
    if (isProblemEmpty) {
      setErrorMsg('Por favor, descreva o problema relatado.');
      setLoading(false);
      return;
    }


    try {
      const { data: { user } } = await supabase.auth.getUser();
      let companyId = 'mock-tenant-id';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          companyId = profile.company_id;
        }
      }

      const osData = {
        company_id: companyId,
        client_id: clientId,
        equipment_id: equipmentId === 'manual' ? null : equipmentId,
        equipment_details: equipmentDetails,
        reported_problem: reportedProblem,
        status,
        priority,
        technician_id: technicianId || null,
        delivery_prediction: deliveryPrediction || null,
        service_value: parseFloat(serviceValue) || 0,
        discount: parseFloat(discount) || 0,
        total_value: parseFloat(totalValue) || 0,
      };

      // 1. Insere Ordem de Serviço
      const { data: insertedOs, error } = await supabase
          .from('service_orders')
          .insert(osData)
          .select()
          .single();

      if (error) {
        console.warn('Erro Supabase, simulando salvamento mock local:', error.message);
        
        // Simulação offline / mock
        const mockOrders = localStorage.getItem('mock-orders') || '[]';
        const parsed = JSON.parse(mockOrders);
        const newOsId = `mock-os-${Date.now()}`;
        
        parsed.push({
          id: newOsId,
          ...osData,
          clients: { name: clients.find(c => c.id === clientId)?.name || 'Cliente' },
          created_at: new Date().toISOString()
        });
        localStorage.setItem('mock-orders', JSON.stringify(parsed));

        // Salva os itens da OS no localStorage
        if (selectedProducts.length > 0) {
          const localItems = localStorage.getItem('mock-order-items') || '[]';
          const parsedItems = JSON.parse(localItems);
          selectedProducts.forEach((item, index) => {
            parsedItems.push({
              id: `mock-item-${Date.now()}-${index}`,
              service_order_id: newOsId,
              product_id: item.product_id,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unit_price,
            });
          });
          localStorage.setItem('mock-order-items', JSON.stringify(parsedItems));

          // Decrementa peças do inventário mockado
          const localInv = localStorage.getItem('mock-inventory');
          if (localInv) {
            const parsedInv = JSON.parse(localInv);
            const updatedInv = parsedInv.map((p: any) => {
              const matched = selectedProducts.find(sp => sp.product_id === p.id);
              if (matched) {
                return { ...p, quantity: Math.max(0, p.quantity - matched.quantity) };
              }
              return p;
            });
            localStorage.setItem('mock-inventory', JSON.stringify(updatedInv));
          }
        }
      } else if (insertedOs) {
        // 2. Insere Itens no Banco (Online)
        if (selectedProducts.length > 0) {
          for (const item of selectedProducts) {
            await supabase.from('service_order_items').insert({
              company_id: companyId,
              service_order_id: insertedOs.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
            });

            // Baixa estoque (Online)
            const prod = inventory.find(p => p.id === item.product_id);
            if (prod) {
              await supabase
                .from('products_inventory')
                .update({ quantity: Math.max(0, prod.quantity - item.quantity) })
                .eq('id', item.product_id);
            }
          }
        }

        // 3. Insere Serviços no Banco (Online)
        if (selectedServices.length > 0) {
          for (const item of selectedServices) {
            await supabase.from('order_services').insert({
              company_id: companyId,
              os_id: insertedOs.id,
              service_id: item.service_id,
              quantidade: item.quantity,
              preco_unitario: item.unit_price,
              subtotal: item.quantity * item.unit_price
            });
          }
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar Ordem de Serviço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 text-slate-200">
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold text-sm">Ordem de Serviço aberta com sucesso!</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-450 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-semibold">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bloco de Informações Cadastrais */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Informações Iniciais</h3>

          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" /> Cliente
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'create_new_client') {
                  setIsNewClientModalOpen(true);
                } else {
                  setClientId(val);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              required
              disabled={!!queryClientId}
            >
              <option value="">Selecione um cliente...</option>
              {clientsList.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.type})
                </option>
              ))}
              {!queryClientId && (
                <option value="create_new_client" className="text-emerald-500 font-semibold">
                  ➕ Cadastrar Novo Cliente
                </option>
              )}
            </select>
          </div>

          {/* Seleção do Equipamento Cadastrado */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-500" /> Equipamento do Cliente
            </label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!clientId || !!queryEquipmentId}
            >
              {!clientId ? (
                <option value="">Selecione o cliente primeiro...</option>
              ) : (
                <>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.brand} {eq.model})
                    </option>
                  ))}
                  <option value="manual">Digitar manualmente...</option>
                </>
              )}
            </select>
          </div>

          {/* Detalhes Manuais (Só aparece se selecionado "Digitar manualmente") */}
          {isManualEquipment && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Especificações do Equipamento</label>
              <input
                type="text"
                placeholder="Ex: Notebook Lenovo ThinkPad L14 N/S: PE091728"
                value={equipmentDetails}
                onChange={(e) => setEquipmentDetails(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          )}

          {/* Status e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="Aguardando Equipamento">Aguardando Equipamento</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                <option value="Aguardando Peças">Aguardando Peças</option>
                <option value="Em Execução">Em Execução</option>
                <option value="Em Testes">Em Testes</option>
                <option value="Pronto para Retirada">Pronto para Retirada</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

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
          </div>
        </div>

        {/* Técnico, Previsão e Valores */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Atribuição e Prazo</h3>

          {/* Técnico Responsável */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" /> Técnico Responsável
            </label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="">Não atribuído</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Previsão de Entrega */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Previsão de Entrega
            </label>
            <input
              type="date"
              value={deliveryPrediction}
              onChange={(e) => setDeliveryPrediction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Mão de Obra */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Mão de Obra (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={serviceValue}
                onChange={(e) => setServiceValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Desconto */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-500" /> Desconto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Problema Relatado */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Problema Relatado / Sintomas</label>
        <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
          <ReactQuill
            theme="snow"
            modules={modules}
            formats={formats}
            value={reportedProblem}
            onChange={setReportedProblem}
            placeholder="Descreva o problema relatado..."
          />
        </div>
      </div>

      {/* Seção de Peças e Produtos Utilizados */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
          <Boxes className="w-4 h-4 text-indigo-400" /> Peças e Peças de Reposição Utilizadas
        </h3>

        {/* Formulário interno para adicionar peça */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produto em Estoque</label>
            <select
              value={currentProductId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'create_new_product') {
                  setIsNewProductModalOpen(true);
                } else {
                  setCurrentProductId(val);
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Selecione um item do estoque...</option>
              {inventory.map((prod) => (
                <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
                  {prod.name} (Qtd: {prod.quantity} | R$ {prod.sale_price.toFixed(2)})
                </option>
              ))}
              <option value="create_new_product" className="text-emerald-500 font-semibold">
                ➕ Cadastrar Nova Peça/Serviço
              </option>
            </select>
          </div>

          <div className="w-24 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantidade</label>
            <input
              type="number"
              min="1"
              value={currentProductQty}
              onChange={(e) => setCurrentProductQty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {(() => {
              const prod = inventory.find(p => p.id === currentProductId);
              if (prod) {
                const qty = parseInt(currentProductQty) || 0;
                const over = qty > prod.quantity;
                return (
                  <span className={`text-[10px] block mt-0.5 font-semibold ${over ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>
                    Estoque: {prod.quantity} un
                  </span>
                );
              }
              return null;
            })()}
          </div>

          <button
            type="button"
            onClick={handleAddProduct}
            disabled={(() => {
              if (!currentProductId) return true;
              const prod = inventory.find(p => p.id === currentProductId);
              if (!prod) return true;
              return (parseInt(currentProductQty) || 0) > prod.quantity;
            })()}
            className={`font-semibold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-all h-[34px] ${
              (() => {
                if (!currentProductId) return 'bg-slate-800 text-slate-500 cursor-not-allowed';
                const prod = inventory.find(p => p.id === currentProductId);
                if (!prod || (parseInt(currentProductQty) || 0) > prod.quantity) {
                  return 'bg-rose-950/20 text-rose-550 border border-rose-900/50 cursor-not-allowed';
                }
                return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-650/10 cursor-pointer';
              })()
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Peça
          </button>
        </div>

        {/* Lista de Peças Selecionadas */}
        {selectedProducts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">Nenhuma peça adicionada a esta ordem de serviço.</p>
        ) : (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-1 px-2">Peça</th>
                  <th className="py-1 px-2 text-center">Preço Unitário</th>
                  <th className="py-1 px-2 text-center">Qtd.</th>
                  <th className="py-1 px-2 text-right">Subtotal</th>
                  <th className="py-1 px-2 text-center">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {selectedProducts.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-800/10">
                    <td className="py-2 px-2 font-semibold text-slate-200">{item.name}</td>
                    <td className="py-2 px-2 text-center text-slate-400 font-mono">R$ {item.unit_price.toFixed(2)}</td>
                    <td className="py-2 px-2 text-center text-slate-200 font-bold">{item.quantity}</td>
                    <td className="py-2 px-2 text-right text-slate-205 font-bold font-mono">
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(item.product_id)}
                        className="text-rose-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção de Serviços Realizados (Catálogo) */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
          <Wrench className="w-4 h-4 text-indigo-400" /> Serviços Realizados (Catálogo)
        </h3>

        {/* Formulário interno para adicionar serviço */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviço do Catálogo</label>
            <select
              value={currentServiceId}
              onChange={(e) => handleServiceSelect(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Selecione um serviço...</option>
              {availableServices.map((serv) => (
                <option key={serv.id} value={serv.id}>
                  {serv.nome} (Preço Padrão: R$ {serv.preco_padrao.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="w-20 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qtd</label>
            <input
              type="number"
              min="1"
              value={currentServiceQty}
              onChange={(e) => setCurrentServiceQty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 text-center font-mono"
            />
          </div>

          <div className="flex-1 min-w-[120px] space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preço Unitário (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={currentServicePrice}
              onChange={(e) => setCurrentServicePrice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <button
            type="button"
            onClick={handleAddService}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-colors h-[34px] shadow-lg shadow-indigo-650/10 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Serviço
          </button>
        </div>

        {/* Lista de Serviços Selecionados */}
        {selectedServices.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">Nenhum serviço do catálogo adicionado a esta ordem de serviço.</p>
        ) : (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-1 px-2">Serviço</th>
                  <th className="py-1 px-2 text-center">Preço Unitário</th>
                  <th className="py-1 px-2 text-center">Qtd.</th>
                  <th className="py-1 px-2 text-right">Subtotal</th>
                  <th className="py-1 px-2 text-center">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {selectedServices.map((item) => (
                  <tr key={item.service_id} className="hover:bg-slate-800/10">
                    <td className="py-2 px-2 font-semibold text-slate-200">{item.name}</td>
                    <td className="py-2 px-2 text-center text-slate-400 font-mono">R$ {item.unit_price.toFixed(2)}</td>
                    <td className="py-2 px-2 text-center text-slate-200 font-bold">{item.quantity}</td>
                    <td className="py-2 px-2 text-right text-slate-205 font-bold font-mono">
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveService(item.service_id)}
                        className="text-rose-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo Financeiro / Botão de Ação */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-850">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
          {/* Listagem de Subtotal e Desconto */}
          <div className="flex flex-col text-xs text-slate-400 gap-0.5">
            <div>
              Subtotal: <span className="font-semibold text-slate-200 font-mono">R$ {Number(subtotalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {parseFloat(discount) > 0 && (
              <div className="text-rose-455 font-bold">
                Desconto: <span className="font-mono">- R$ {Number(discount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-4">
            <Tag className="w-6 h-6 text-emerald-450" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total da O.S.</p>
              <p className="text-xl font-extrabold text-emerald-450 font-mono">
                R$ {Number(totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-8 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-55"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ClipboardList className="w-4 h-4" /> Salvar Ordem de Serviço
            </>
          )}
        </button>
      </div>
    </form>

    {/* Modal para Cadastro de Novo Cliente + Equipamento (Fluxo em Etapas com Deslizamento) */}
    {isNewClientModalOpen && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in scale-in-95 duration-200">
          
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-slate-850 px-6 py-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" /> Cadastrar Novo Cliente
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsNewClientModalOpen(false);
                setClientModalStep(1);
              }}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Indicadores Visuais de Etapa */}
          <div className="flex items-center justify-center gap-2 px-6 pt-4">
            <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${clientModalStep === 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
            <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${clientModalStep === 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          </div>

          {/* Formulário com Slider Horizontal */}
          <form onSubmit={handleSaveClient} className="overflow-hidden">
            {clientModalError && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{clientModalError}</span>
              </div>
            )}

            <div 
              className="flex w-[200%] transition-transform duration-350 ease-in-out" 
              style={{ transform: `translateX(-${(clientModalStep - 1) * 50}%)` }}
            >
              {/* Etapa 1: Dados do Cliente */}
              <div className="w-1/2 px-6 py-4 space-y-4">
                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider pb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Passo 1: Informações Básicas
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Tipo de Cliente</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="clientType"
                        value="PF"
                        checked={newClientType === 'PF'}
                        onChange={() => setNewClientType('PF')}
                        className="accent-emerald-500 focus:ring-emerald-500"
                      />
                      Pessoa Física
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="clientType"
                        value="PJ"
                        checked={newClientType === 'PJ'}
                        onChange={() => setNewClientType('PJ')}
                        className="accent-emerald-500 focus:ring-emerald-500"
                      />
                      Pessoa Jurídica
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Nome / Razão Social *</label>
                  <input
                    type="text"
                    required={clientModalStep === 1}
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: João da Silva ou Tech Corp Ltda"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={newClientDoc}
                    onChange={(e) => setNewClientDoc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: 000.000.000-00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">E-mail</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: cliente@email.com"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewClientModalOpen(false);
                      setClientModalStep(1);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-slate-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    Salvar e Adicionar Equipamento
                  </button>
                </div>
              </div>

              {/* Etapa 2: Dados do Equipamento */}
              <div className="w-1/2 px-6 py-4 space-y-4">
                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider pb-1 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Passo 2: Equipamento Inicial *
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Nome do Equipamento *</label>
                  <input
                    type="text"
                    required={clientModalStep === 2}
                    value={newEqName}
                    onChange={(e) => setNewEqName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: Notebook Dell Inspiron"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Marca</label>
                  <input
                    type="text"
                    value={newEqBrand}
                    onChange={(e) => setNewEqBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: Dell"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Modelo</label>
                  <input
                    type="text"
                    value={newEqModel}
                    onChange={(e) => setNewEqModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: L14 Gen 2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Número de Série</label>
                  <input
                    type="text"
                    value={newEqSerial}
                    onChange={(e) => setNewEqSerial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: SN-98765432"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => {
                      setClientModalError('');
                      setClientModalStep(1);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-slate-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={savingClient}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingClient ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Salvar e Concluir
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Modal para Cadastro de Nova Peça no Estoque com Estrutura Hierárquica */}
    {isNewProductModalOpen && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in scale-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-850 px-6 py-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-500" /> Cadastrar Nova Peça
            </h3>
            <button
              type="button"
              onClick={() => setIsNewProductModalOpen(false)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
            {productModalError && (
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{productModalError}</span>
              </div>
            )}

            {/* Descrição / Nome da Peça */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Descrição / Nome da Peça *</label>
              <input
                type="text"
                required
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                disabled={newProdCategory === 'Memória RAM' || newProdCategory === 'SSD'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-650 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={
                  newProdCategory === 'Memória RAM' || newProdCategory === 'SSD'
                    ? 'Gerado automaticamente com base nos atributos...'
                    : 'Ex: HD Externo 1TB Seagate Expansion'
                }
              />
            </div>

            <div className={`grid grid-cols-1 ${newProdCategory === 'Memória RAM' || newProdCategory === 'SSD' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Categoria *</label>
                <select
                  value={newProdCategory}
                  onChange={(e) => {
                    setNewProdCategory(e.target.value);
                    // Limpa estados específicos ao mudar de categoria
                    setNewProdBrand('');
                    setNewProdCapacity('');
                    setNewProdSsdTech('');
                    setNewProdSsdGb('');
                    setNewProdRamApp('');
                    setNewProdRamTech('');
                    setNewProdRamSpeed('');
                    setNewProdRamGb('');
                    if (e.target.value === 'Memória RAM' || e.target.value === 'SSD') {
                      setNewProdName('');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="HD">HD</option>
                  <option value="SSD">SSD</option>
                  <option value="Memória RAM">Memória RAM</option>
                  <option value="Placa de Vídeo">Placa de Vídeo</option>
                  <option value="Fonte de Alimentação">Fonte de Alimentação</option>
                  <option value="Gabinete">Gabinete</option>
                  <option value="Processador">Processador</option>
                  <option value="Placa-Mãe">Placa-Mãe</option>
                  <option value="Cabo / Acessório">Cabo / Acessório</option>
                  <option value="Ferramentas">Ferramentas</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {/* Marca */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Marca *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Kingston"
                  value={newProdBrand}
                  onChange={(e) => setNewProdBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Capacidade (Se não for RAM ou SSD) */}
              {newProdCategory !== 'Memória RAM' && newProdCategory !== 'SSD' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Capacidade</label>
                  <input
                    type="text"
                    placeholder="Ex: 1TB / 8GB"
                    value={newProdCapacity}
                    onChange={(e) => setNewProdCapacity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Condicionais SSD */}
            {newProdCategory === 'SSD' && (
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-xl animate-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tecnologia SSD *</label>
                  <select
                    value={newProdSsdTech}
                    onChange={(e) => setNewProdSsdTech(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="SATA III">SATA III</option>
                    <option value="NVMe">NVMe</option>
                    <option value="M.2 SATA">M.2 SATA</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamanho (GB/TB) *</label>
                  <select
                    value={newProdSsdGb}
                    onChange={(e) => setNewProdSsdGb(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="120GB">120GB</option>
                    <option value="240GB">240GB</option>
                    <option value="256GB">256GB</option>
                    <option value="480GB">480GB</option>
                    <option value="500GB">500GB</option>
                    <option value="960GB">960GB</option>
                    <option value="1TB">1TB</option>
                    <option value="2TB">2TB</option>
                  </select>
                </div>
              </div>
            )}

            {/* Condicionais Memória RAM */}
            {newProdCategory === 'Memória RAM' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-xl animate-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aplicação *</label>
                  <select
                    value={newProdRamApp}
                    onChange={(e) => setNewProdRamApp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="PC">PC (Desktop)</option>
                    <option value="Notebook">Notebook</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tecnologia *</label>
                  <select
                    value={newProdRamTech}
                    onChange={(e) => setNewProdRamTech(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="DDR">DDR</option>
                    <option value="DDR2">DDR2</option>
                    <option value="DDR3">DDR3</option>
                    <option value="DDR4">DDR4</option>
                    <option value="DDR5">DDR5</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Velocidade</label>
                  <input
                    type="text"
                    placeholder="Ex: 3200MHz"
                    value={newProdRamSpeed}
                    onChange={(e) => setNewProdRamSpeed(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamanho *</label>
                  <select
                    value={newProdRamGb}
                    onChange={(e) => setNewProdRamGb(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="2GB">2GB</option>
                    <option value="4GB">4GB</option>
                    <option value="8GB">8GB</option>
                    <option value="16GB">16GB</option>
                    <option value="32GB">32GB</option>
                    <option value="64GB">64GB</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Preço de Venda (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newProdSalePrice}
                  onChange={(e) => setNewProdSalePrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Qtd. Inicial em Estoque</label>
                <input
                  type="number"
                  min="0"
                  value={newProdQty}
                  onChange={(e) => setNewProdQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-105 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-350 hover:text-slate-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingProduct ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Salvar Peça
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
);
}
