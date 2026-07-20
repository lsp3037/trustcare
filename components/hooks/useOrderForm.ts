'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { formatDocument, validateDocument } from '@/lib/utils/documentValidation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  type: string;
}

export interface UseOrderFormProps {
  clients: Client[];
  onSuccess: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrderForm({ clients, onSuccess }: UseOrderFormProps) {
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get('clientId') || searchParams.get('client_id') || '';
  const queryEquipmentId = searchParams.get('equipmentId') || searchParams.get('equipment_id') || '';
  const queryEquipmentName = searchParams.get('equipment') || searchParams.get('equipment_details') || '';

  // ── Campos Principais ───────────────────────────────────────────────────────
  const [clientId, setClientId] = useState(queryClientId);
  const [equipmentId, setEquipmentId] = useState(queryEquipmentId || (queryEquipmentName ? 'manual' : ''));
  const [equipmentDetails, setEquipmentDetails] = useState(queryEquipmentName || '');
  const [reportedProblem, setReportedProblem] = useState('');
  const [status, setStatus] = useState('Em Análise');
  const [priority, setPriority] = useState('Média');
  const [technicianId, setTechnicianId] = useState('');
  const [deliveryPrediction, setDeliveryPrediction] = useState('');

  // ── Financeiro ───────────────────────────────────────────────────────────────
  const [serviceValue, setServiceValue] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [subtotalValue, setSubtotalValue] = useState('0');
  const [totalValue, setTotalValue] = useState('0');

  // ── Listas de Dados ─────────────────────────────────────────────────────────
  const [equipments, setEquipments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isManualEquipment, setIsManualEquipment] = useState(false);
  const [companyId, setCompanyId] = useState('mock-tenant-id');
  const [clientsList, setClientsList] = useState<Client[]>(clients);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);

  // ── Modais ──────────────────────────────────────────────────────────────────
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  // ── Formulário Novo Cliente ─────────────────────────────────────────────────
  const [clientModalStep, setClientModalStep] = useState(1);
  const [newClientName, setNewClientName] = useState('');
  const [newClientType, setNewClientType] = useState('PF');
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newEqName, setNewEqName] = useState('');
  const [newEqBrand, setNewEqBrand] = useState('');
  const [newEqModel, setNewEqModel] = useState('');
  const [newEqSerial, setNewEqSerial] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState('');

  // ── Formulário Nova Peça ────────────────────────────────────────────────────
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdCapacity, setNewProdCapacity] = useState('');
  const [newProdQty, setNewProdQty] = useState('10');
  const [newProdSalePrice, setNewProdSalePrice] = useState('');
  const [newProdSsdTech, setNewProdSsdTech] = useState('');
  const [newProdSsdGb, setNewProdSsdGb] = useState('');
  const [newProdRamApp, setNewProdRamApp] = useState('');
  const [newProdRamTech, setNewProdRamTech] = useState('');
  const [newProdRamSpeed, setNewProdRamSpeed] = useState('');
  const [newProdRamGb, setNewProdRamGb] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [productModalError, setProductModalError] = useState('');

  // ── Itens Selecionados ──────────────────────────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentProductQty, setCurrentProductQty] = useState('1');
  const [productAddError, setProductAddError] = useState('');

  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [currentServiceId, setCurrentServiceId] = useState('');
  const [currentServiceQty, setCurrentServiceQty] = useState('1');
  const [currentServicePrice, setCurrentServicePrice] = useState('0.00');

  // ── Feedback Global ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Sincroniza prop clients com listagem interna
  useEffect(() => {
    setClientsList(clients);
  }, [clients]);

  // Auto-geração de nome/capacidade para peças inline (RAM / SSD)
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

  // Carrega company_id do perfil logado
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
          if (profile?.company_id) setCompanyId(profile.company_id);
        }
      } catch (err) {
        console.warn('Erro ao carregar company_id:', err);
      }
    };
    getCompany();
  }, []);

  // Carrega inventário, serviços e técnicos no mount
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
          const localInv = localStorage.getItem('mock-inventory');
          if (localInv) setInventory(JSON.parse(localInv));
        }
      } catch {
        const localInv = localStorage.getItem('mock-inventory');
        if (localInv) setInventory(JSON.parse(localInv));
      }
    };

    const fetchServices = async () => {
      try {
        const { data: servsData } = await supabase
          .from('services')
          .select('*')
          .eq('ativo', true)
          .order('nome');
        if (servsData && servsData.length > 0) setAvailableServices(servsData);
      } catch (err) {
        console.warn('Erro ao carregar serviços:', err);
      }
    };

    const loadLocalTechnicians = () => {
      const localProfiles = localStorage.getItem('mock-profiles');
      if (localProfiles) {
        const parsed = JSON.parse(localProfiles);
        const techs = parsed.filter((p: any) => p.role === 'tecnico' || p.role === 'technician');
        setTechnicians(techs.map((t: any) => ({ id: t.id, name: t.name })));
      } else {
        setTechnicians([]);
      }
    };

    const fetchTechnicians = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'technician');
        if (data && data.length > 0) {
          setTechnicians(data.map(t => ({
            id: t.id,
            name: t.full_name || t.email?.split('@')[0] || 'Técnico',
          })));
        } else {
          loadLocalTechnicians();
        }
      } catch {
        loadLocalTechnicians();
      }
    };

    fetchInventory();
    fetchServices();
    fetchTechnicians();
  }, []);

  // Carrega equipamentos quando o cliente muda
  useEffect(() => {
    if (!clientId) {
      setEquipments([]);
      setEquipmentId('');
      return;
    }

    const localEqs = localStorage.getItem('mock-equipments');
    if (localEqs) {
      const localFiltered = JSON.parse(localEqs).filter((e: any) => e.client_id === clientId);
      setEquipments(localFiltered);
      if (localFiltered.length > 0) {
        const hasQueryEq = queryEquipmentId && localFiltered.some((e: any) => e.id === queryEquipmentId);
        setEquipmentId(hasQueryEq ? queryEquipmentId : (queryEquipmentName ? 'manual' : localFiltered[0].id));
        setIsManualEquipment(hasQueryEq ? false : !!queryEquipmentName);
      } else {
        setEquipmentId('manual');
        setIsManualEquipment(true);
      }
    } else {
      setEquipmentId('manual');
      setIsManualEquipment(true);
    }

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
          setIsManualEquipment(hasQueryEq ? false : !!queryEquipmentName);
        }
      } catch (err) {
        console.warn('Erro ao carregar equipamentos do Supabase:', err);
      }
    };
    fetchOnlineEquipments();
  }, [clientId, queryEquipmentId, queryEquipmentName]);

  // Preenche detalhes do equipamento selecionado
  useEffect(() => {
    if (equipmentId === 'manual' || !equipmentId) {
      setIsManualEquipment(true);
      if (!queryEquipmentName) setEquipmentDetails('');
    } else {
      setIsManualEquipment(false);
      const selected = equipments.find((e) => e.id === equipmentId);
      if (selected) {
        setEquipmentDetails(`${selected.name} - ${selected.brand} ${selected.model} (S/N: ${selected.serial_number || '—'})`);
      }
    }
  }, [equipmentId, equipments, queryEquipmentName]);

  // Recalcula totais ao mudar itens, serviços ou desconto
  useEffect(() => {
    const labor = parseFloat(serviceValue) || 0;
    const partsTotal = selectedProducts.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const servicesTotal = selectedServices.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const subtotal = labor + partsTotal + servicesTotal;
    const disc = parseFloat(discount) || 0;
    setSubtotalValue(subtotal.toFixed(2));
    setTotalValue(Math.max(0, subtotal - disc).toFixed(2));
  }, [serviceValue, selectedProducts, selectedServices, discount]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newClientName) {
      setClientModalError('Por favor, preencha o nome do cliente (*).');
      return;
    }
    setClientModalError('');
    setClientModalStep(2);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newEqName) {
      setClientModalError('Por favor, preencha os campos obrigatórios (*).');
      return;
    }
    if (newClientDoc && !validateDocument(newClientDoc)) {
      setClientModalError('CPF ou CNPJ inválido. Por favor, verifique os dígitos.');
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

      const { data: insertedClient, error: clientErr } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (clientErr) {
        const mockClientsStr = localStorage.getItem('mock-clients') || '[]';
        const parsedClients = JSON.parse(mockClientsStr);
        const nextNumber = Math.max(...parsedClients.map((c: any) => c.client_number || 1000), 1000) + 1;
        const mockClientId = `mock-client-${Date.now()}`;
        newClient = { id: mockClientId, ...clientData };
        parsedClients.push({ ...newClient, client_number: nextNumber });
        localStorage.setItem('mock-clients', JSON.stringify(parsedClients));
      } else {
        newClient = insertedClient;
      }

      if (!newClient) throw new Error('Falha ao registrar novo cliente.');

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
        const mockEqsStr = localStorage.getItem('mock-equipments') || '[]';
        const parsedEqs = JSON.parse(mockEqsStr);
        newEquipment = { id: `mock-eq-${Date.now()}`, ...eqData };
        parsedEqs.push(newEquipment);
        localStorage.setItem('mock-equipments', JSON.stringify(parsedEqs));
      } else {
        newEquipment = insertedEq;
      }

      setClientsList((prev) => [...prev, newClient!]);
      setClientId(newClient.id);
      if (newEquipment) {
        setEquipments((prev) => [...prev, newEquipment]);
        setEquipmentId(newEquipment.id);
        setIsManualEquipment(false);
      }

      setIsNewClientModalOpen(false);
      setClientModalStep(1);
      setNewClientName(''); setNewClientType('PF'); setNewClientDoc('');
      setNewClientPhone(''); setNewClientEmail('');
      setNewEqName(''); setNewEqBrand(''); setNewEqModel(''); setNewEqSerial('');
    } catch (err: any) {
      setClientModalError(err.message || 'Erro inesperado ao salvar cliente/equipamento.');
    } finally {
      setSavingClient(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSalePrice) {
      setProductModalError('Por favor, preencha os campos obrigatórios (*).');
      return;
    }
    setSavingProduct(true);
    setProductModalError('');
    try {
      const catClean = (newProdCategory || 'OUT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();
      const catCode = catClean.slice(0, 3).padEnd(3, 'X');
      const brandClean = (newProdBrand || 'GEN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();
      const brandCode = brandClean.slice(0, 3).padEnd(3, 'X');
      const prefix = `${catCode}-${brandCode}-`;

      const matchingProducts = inventory.filter(p => p.sku && p.sku.startsWith(prefix));
      const numbers = matchingProducts.map(p => {
        const parts = p.sku.split('-');
        const num = parseInt(parts[parts.length - 1]);
        return isNaN(num) ? 0 : num;
      });
      const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      const finalSku = `${prefix}${String(nextNum).padStart(3, '0')}`;

      const salePriceNum = parseFloat(newProdSalePrice) || 0;
      const productData = {
        company_id: companyId,
        name: newProdName,
        sku: finalSku,
        category: newProdCategory || 'Peças',
        brand: newProdBrand || '',
        capacity: newProdCapacity || '',
        quantity: parseInt(newProdQty) || 0,
        cost_price: salePriceNum * 0.6,
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
        const mockInvStr = localStorage.getItem('mock-inventory') || '[]';
        const parsedInv = JSON.parse(mockInvStr);
        newProduct = { id: `mock-prod-${Date.now()}`, ...productData };
        parsedInv.push(newProduct);
        localStorage.setItem('mock-inventory', JSON.stringify(parsedInv));
      } else {
        newProduct = insertedProd;
      }

      if (!newProduct) throw new Error('Falha ao registrar novo produto.');

      setInventory((prev) => [...prev, newProduct]);
      setCurrentProductId(newProduct.id);
      setIsNewProductModalOpen(false);
      setNewProdName(''); setNewProdCategory(''); setNewProdBrand('');
      setNewProdCapacity(''); setNewProdQty('10'); setNewProdSalePrice('');
      setNewProdSsdTech(''); setNewProdSsdGb('');
      setNewProdRamApp(''); setNewProdRamTech(''); setNewProdRamSpeed(''); setNewProdRamGb('');
    } catch (err: any) {
      setProductModalError(err.message || 'Erro inesperado ao salvar produto.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleAddProduct = () => {
    if (!currentProductId) return;
    const prod = inventory.find((p) => p.id === currentProductId);
    if (!prod) return;
    const qty = parseInt(currentProductQty) || 1;
    const existsItem = selectedProducts.find((p) => p.product_id === currentProductId);
    const existingQty = existsItem ? existsItem.quantity : 0;
    const totalNeeded = qty + existingQty;
    if (totalNeeded > prod.quantity) {
      setProductAddError(`Quantidade indisponível. Saldo máximo no estoque: ${prod.quantity} un`);
      return;
    }
    setProductAddError('');
    if (existsItem) {
      setSelectedProducts(selectedProducts.map((p) =>
        p.product_id === currentProductId ? { ...p, quantity: totalNeeded } : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, {
        product_id: currentProductId,
        name: prod.name,
        quantity: qty,
        unit_price: prod.sale_price,
      }]);
    }
    setCurrentProductId('');
    setCurrentProductQty('1');
  };

  const handleRemoveProduct = (prodId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product_id !== prodId));
  };

  const handleServiceSelect = (serviceId: string) => {
    setCurrentServiceId(serviceId);
    const serv = availableServices.find(s => s.id === serviceId);
    setCurrentServicePrice(serv ? Number(serv.preco_padrao || 0).toFixed(2) : '0.00');
  };

  const handleAddService = () => {
    if (!currentServiceId) return;
    const serv = availableServices.find((s) => s.id === currentServiceId);
    if (!serv) return;
    const qty = parseInt(currentServiceQty) || 1;
    const price = parseFloat(currentServicePrice) || 0;
    const existingItem = selectedServices.find((s) => s.service_id === currentServiceId);
    if (existingItem) {
      setSelectedServices(selectedServices.map((s) =>
        s.service_id === currentServiceId ? { ...s, quantity: qty, unit_price: price } : s
      ));
    } else {
      setSelectedServices([...selectedServices, {
        service_id: currentServiceId,
        name: serv.nome,
        quantity: qty,
        unit_price: price,
      }]);
    }
    setCurrentServiceId('');
    setCurrentServicePrice('0.00');
    setCurrentServiceQty('1');
  };

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
      let resolvedCompanyId = 'mock-tenant-id';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();
        if (profile?.company_id) resolvedCompanyId = profile.company_id;
      }

      const osData = {
        company_id: resolvedCompanyId,
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

      const { data: insertedOs, error } = await supabase
        .from('service_orders')
        .insert(osData)
        .select()
        .single();

      if (error) {
        // Fallback mock local
        const mockOrders = localStorage.getItem('mock-orders') || '[]';
        const parsed = JSON.parse(mockOrders);
        const newOsId = `mock-os-${Date.now()}`;
        parsed.push({
          id: newOsId,
          ...osData,
          clients: { name: clients.find(c => c.id === clientId)?.name || 'Cliente' },
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('mock-orders', JSON.stringify(parsed));

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

          const localInv = localStorage.getItem('mock-inventory');
          if (localInv) {
            const parsedInv = JSON.parse(localInv);
            localStorage.setItem('mock-inventory', JSON.stringify(
              parsedInv.map((p: any) => {
                const matched = selectedProducts.find(sp => sp.product_id === p.id);
                return matched ? { ...p, quantity: Math.max(0, p.quantity - matched.quantity) } : p;
              })
            ));
          }
        }
      } else if (insertedOs) {
        for (const item of selectedProducts) {
          await supabase.from('service_order_items').insert({
            company_id: resolvedCompanyId,
            service_order_id: insertedOs.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          });
        }
        for (const item of selectedServices) {
          await supabase.from('order_services').insert({
            company_id: resolvedCompanyId,
            os_id: insertedOs.id,
            service_id: item.service_id,
            quantidade: item.quantity,
            preco_unitario: item.unit_price,
            subtotal: item.quantity * item.unit_price,
          });
        }
      }

      setSuccess(true);
      setTimeout(() => { onSuccess(); }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao criar OS.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    // Query params
    queryClientId, queryEquipmentId, queryEquipmentName,
    // Campos principais
    clientId, setClientId,
    equipmentId, setEquipmentId,
    equipmentDetails, setEquipmentDetails,
    reportedProblem, setReportedProblem,
    status, setStatus,
    priority, setPriority,
    technicianId, setTechnicianId,
    deliveryPrediction, setDeliveryPrediction,
    // Financeiro
    serviceValue, setServiceValue,
    discount, setDiscount,
    subtotalValue,
    totalValue,
    // Dados
    equipments, setEquipments,
    inventory,
    isManualEquipment,
    companyId,
    clientsList, setClientsList,
    technicians,
    availableServices,
    // Modais
    isNewClientModalOpen, setIsNewClientModalOpen,
    isNewProductModalOpen, setIsNewProductModalOpen,
    // Novo Cliente
    clientModalStep, setClientModalStep,
    newClientName, setNewClientName,
    newClientType, setNewClientType,
    newClientDoc, setNewClientDoc: (v: string) => setNewClientDoc(formatDocument(v)),
    newClientPhone, setNewClientPhone,
    newClientEmail, setNewClientEmail,
    newEqName, setNewEqName,
    newEqBrand, setNewEqBrand,
    newEqModel, setNewEqModel,
    newEqSerial, setNewEqSerial,
    savingClient,
    clientModalError, setClientModalError,
    // Nova Peça
    newProdName, setNewProdName,
    newProdCategory, setNewProdCategory,
    newProdBrand, setNewProdBrand,
    newProdCapacity, setNewProdCapacity,
    newProdQty, setNewProdQty,
    newProdSalePrice, setNewProdSalePrice,
    newProdSsdTech, setNewProdSsdTech,
    newProdSsdGb, setNewProdSsdGb,
    newProdRamApp, setNewProdRamApp,
    newProdRamTech, setNewProdRamTech,
    newProdRamSpeed, setNewProdRamSpeed,
    newProdRamGb, setNewProdRamGb,
    savingProduct,
    productModalError,
    // Itens
    selectedProducts,
    currentProductId, setCurrentProductId,
    currentProductQty, setCurrentProductQty,
    productAddError, setProductAddError,
    selectedServices,
    currentServiceId,
    currentServiceQty, setCurrentServiceQty,
    currentServicePrice, setCurrentServicePrice,
    // Feedback
    loading,
    errorMsg,
    success,
    // Handlers
    handleNextStep,
    handleSaveClient,
    handleSaveProduct,
    handleAddProduct,
    handleRemoveProduct,
    handleServiceSelect,
    handleAddService,
    handleRemoveService,
    handleSubmit,
  };
}
