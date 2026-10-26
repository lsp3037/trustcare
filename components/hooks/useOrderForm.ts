'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { formatDocument, validateDocument } from '@/lib/utils/documentValidation';
import { useFormatProblem } from '@/components/hooks/useFormatProblem';
import type { NewEquipmentPayload } from '@/components/new-order/EquipmentModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  type: string;
}

export interface UseOrderFormProps {
  clients: Client[];
  onSuccess?: () => void;
}

/**
 * Traduz o erro do PostgREST. `42501` é bloqueio de RLS — na prática, conta em
 * modo somente leitura (assinatura/trial) ou papel sem permissão de escrita.
 */
function describeDbError(error: { code?: string; message?: string } | null, fallback: string): string {
  if (error?.code === '42501') {
    return 'Seu usuário não tem permissão para esta ação ou a conta está em modo somente leitura. Verifique a assinatura em Configurações > Assinatura.';
  }
  return error?.message ? `${fallback} (${error.message})` : fallback;
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
  const [companyId, setCompanyId] = useState('');
  const [clientsList, setClientsList] = useState<Client[]>(clients);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);

  // ── Modais ──────────────────────────────────────────────────────────────────
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  // ── Cadastro de Equipamento (popup dentro da OS) ────────────────────────────
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [equipmentModalError, setEquipmentModalError] = useState('');

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
  const [newProdCostPrice, setNewProdCostPrice] = useState('');
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

  // ── Peças Sob Demanda / Sob Encomenda ─────────────────────────────────────────
  const [customPartName, setCustomPartName] = useState('');
  const [customPartQty, setCustomPartQty] = useState('1');
  const [customPartPrice, setCustomPartPrice] = useState('');
  const [customPartCost, setCustomPartCost] = useState('');
  const [customPartLink, setCustomPartLink] = useState('');

  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [currentServiceId, setCurrentServiceId] = useState('');
  const [currentServiceQty, setCurrentServiceQty] = useState('1');
  const [currentServicePrice, setCurrentServicePrice] = useState('0.00');

  // ── Feedback Global ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Formatação do Problema Relatado com IA (mesma Edge Function do laudo).
  const { formatProblem, formattingProblem } = useFormatProblem({
    reportedProblem,
    setReportedProblem,
    equipment: equipmentDetails,
    successMessage: 'Problema relatado formatado. Revise antes de abrir a O.S.',
  });

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
        const { data: invData, error } = await supabase
          .from('products_inventory')
          .select('*')
          .order('name');
        if (error) throw error;
        setInventory(invData || []);
      } catch (err) {
        console.warn('Erro ao carregar inventário:', err);
        setInventory([]);
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

    const fetchTechnicians = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .eq('role', 'technician');
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = data.map(t => ({
            id: t.id,
            name: t.full_name || t.email?.split('@')[0] || 'Técnico',
          }));
          setTechnicians(mapped);
          // Equipe com um único técnico: já vem atribuído, evitando um passo manual.
          if (mapped.length === 1) setTechnicianId(mapped[0].id);
        } else {
          setTechnicians([]);
        }
      } catch (err) {
        console.warn('Erro ao carregar técnicos:', err);
        setTechnicians([]);
      }
    };

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('equipment_categories')
          .select('id, name')
          .order('name');
        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.warn('Erro ao carregar categorias de equipamento:', err);
        setCategories([]);
      }
    };

    fetchInventory();
    fetchServices();
    fetchTechnicians();
    fetchCategories();
  }, []);

  // Carrega equipamentos quando o cliente muda
  useEffect(() => {
    if (!clientId) {
      setEquipments([]);
      setEquipmentId('');
      return;
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
        } else {
          setEquipments([]);
          setEquipmentId('manual');
          setIsManualEquipment(true);
        }
      } catch (err) {
        console.warn('Erro ao carregar equipamentos do Supabase:', err);
        setEquipments([]);
        setEquipmentId('manual');
        setIsManualEquipment(true);
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

      if (!companyId) throw new Error('Empresa do usuário ainda não carregada. Tente novamente.');

      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (clientErr || !newClient) {
        throw new Error(describeDbError(clientErr, 'Falha ao registrar novo cliente.'));
      }

      const eqData = {
        company_id: companyId,
        client_id: newClient.id,
        name: newEqName,
        brand: newEqBrand || '',
        model: newEqModel || '',
        serial_number: newEqSerial || '',
      };

      const { data: newEquipment, error: eqErr } = await supabase
        .from('client_equipments')
        .insert(eqData)
        .select()
        .single();

      // O cliente já foi salvo: falha no equipamento não desfaz o cliente. O modal
      // fecha mesmo assim (reenviar duplicaria o cliente) e o aviso vai para o form.
      setClientsList((prev) => [...prev, newClient]);
      setClientId(newClient.id);
      if (eqErr || !newEquipment) {
        setErrorMsg(describeDbError(eqErr, 'Cliente salvo, mas o equipamento não foi registrado. Informe-o manualmente.'));
      } else {
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

  /**
   * Cadastro completo de equipamento a partir da própria OS. Antes só existia
   * "Digitar manualmente", que criava a OS sem vínculo com um aparelho.
   */
  const handleCreateEquipment = async (payload: NewEquipmentPayload) => {
    setEquipmentModalError('');

    if (!clientId) {
      setEquipmentModalError('Selecione o cliente antes de cadastrar o equipamento.');
      return;
    }
    if (!companyId) {
      setEquipmentModalError('Empresa do usuário ainda não carregada. Tente novamente.');
      return;
    }

    setSavingEquipment(true);
    try {
      const { data, error } = await supabase
        .from('client_equipments')
        .insert({ company_id: companyId, client_id: clientId, ...payload })
        .select()
        .single();

      if (error || !data) {
        throw new Error(describeDbError(error, 'Falha ao cadastrar o equipamento.'));
      }

      setEquipments((prev) => [...prev, data]);
      setEquipmentId(data.id);
      setIsManualEquipment(false);
      setIsEquipmentModalOpen(false);
    } catch (err: any) {
      setEquipmentModalError(err.message || 'Erro inesperado ao cadastrar o equipamento.');
    } finally {
      setSavingEquipment(false);
    }
  };

  const handleCreateEquipmentCategory = async (name: string) => {
    if (!companyId) return null;

    const { data, error } = await supabase
      .from('equipment_categories')
      .insert({ name, company_id: companyId })
      .select('id, name')
      .single();

    if (error || !data) {
      console.warn('Erro ao criar categoria:', error?.message);
      return null;
    }

    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data as { id: string; name: string };
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
      const costPriceNum = parseFloat(newProdCostPrice) || 0;
      const productData = {
        company_id: companyId,
        name: newProdName,
        sku: finalSku,
        category: newProdCategory || 'Peças',
        brand: newProdBrand || '',
        capacity: newProdCapacity || '',
        quantity: parseInt(newProdQty) || 0,
        cost_price: costPriceNum,
        sale_price: salePriceNum,
        min_stock_alert: 1,
      };

      if (!companyId) throw new Error('Empresa do usuário ainda não carregada. Tente novamente.');

      const { data: newProduct, error: prodErr } = await supabase
        .from('products_inventory')
        .insert(productData)
        .select()
        .single();

      if (prodErr || !newProduct) {
        throw new Error(describeDbError(prodErr, 'Falha ao registrar novo produto.'));
      }

      setInventory((prev) => [...prev, newProduct]);
      setCurrentProductId(newProduct.id);
      setIsNewProductModalOpen(false);
      setNewProdName(''); setNewProdCategory(''); setNewProdBrand('');
      setNewProdCapacity(''); setNewProdQty('10'); setNewProdSalePrice('');
      setNewProdCostPrice('');
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

  const handleAddCustomProduct = () => {
    if (!customPartName.trim()) {
      setProductAddError('Informe a descrição/nome da peça sob demanda.');
      return;
    }
    const qty = parseInt(customPartQty) || 1;
    const price = parseFloat(customPartPrice) || 0;
    const cost = parseFloat(customPartCost) || 0;

    if (price <= 0) {
      setProductAddError('O valor de venda da peça sob demanda deve ser maior que zero.');
      return;
    }

    setProductAddError('');
    setSelectedProducts((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        product_id: null,
        name: customPartName.trim(),
        custom_name: customPartName.trim(),
        quantity: qty,
        unit_price: price,
        unit_cost: cost,
        part_status: 'pendente',
        supplier_link: customPartLink.trim() || null,
        is_custom: true,
      },
    ]);

    setCustomPartName('');
    setCustomPartPrice('');
    setCustomPartCost('');
    setCustomPartLink('');
    setCustomPartQty('1');
  };

  const handleRemoveProduct = (target: any) => {
    const idToRemove = typeof target === 'string' ? target : target?.id;
    setSelectedProducts((prev) =>
      prev.filter((p) => {
        if (p.id && p.id === idToRemove) return false;
        if (p.product_id && p.product_id === idToRemove) return false;
        return true;
      })
    );
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
      if (!user) throw new Error('Sua sessão expirou. Entre novamente para abrir a OS.');

      const itemsPayload = selectedProducts.map((item) => ({
        product_id: item.product_id || null,
        custom_name: item.custom_name || (!item.product_id ? item.name : null),
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost || 0,
        part_status: item.part_status || (item.product_id ? 'em_estoque' : 'pendente'),
        supplier_link: item.supplier_link || null,
        tracking_code: item.tracking_code || null,
        actual_cost: item.actual_cost || null,
      }));

      const servicesPayload = selectedServices.map((item) => ({
        service_id: item.service_id,
        quantidade: item.quantity,
        preco_unitario: item.unit_price,
      }));

      const orderPayload = {
        client_id: clientId,
        equipment_id: equipmentId === 'manual' ? null : (equipmentId || null),
        equipment_details: equipmentDetails,
        reported_problem: reportedProblem,
        status,
        priority,
        technician_id: technicianId || null,
        delivery_prediction: deliveryPrediction || null,
        service_value: parseFloat(serviceValue) || 0,
        discount: parseFloat(discount) || 0,
      };

      const { data: savedOrder, error } = await supabase.rpc('save_order', {
        order_data: orderPayload,
        items_data: itemsPayload,
        services_data: servicesPayload,
      });

      if (error || !savedOrder) {
        throw new Error(describeDbError(error, 'Não foi possível abrir a OS.'));
      }

      const insertedId = (savedOrder as any).id;

      // A API busca cliente, e-mail e equipamento no banco — só envia id e status.
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Abertura', order_id: insertedId }),
      }).catch(() => {});

      setSuccess(true);
      setTimeout(() => { onSuccess?.(); }, 1000);
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
    formatProblem, formattingProblem,
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
    // Equipamento (popup dentro da OS)
    categories,
    isEquipmentModalOpen, setIsEquipmentModalOpen,
    savingEquipment,
    equipmentModalError,
    handleCreateEquipment,
    handleCreateEquipmentCategory,
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
    newProdCostPrice, setNewProdCostPrice,
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
    customPartName, setCustomPartName,
    customPartQty, setCustomPartQty,
    customPartPrice, setCustomPartPrice,
    customPartCost, setCustomPartCost,
    customPartLink, setCustomPartLink,
    handleAddCustomProduct,
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
