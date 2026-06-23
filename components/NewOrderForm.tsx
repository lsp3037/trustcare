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
  DollarSign
} from 'lucide-react';

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

  // Estados dos Campos Principais
  const [clientId, setClientId] = useState(queryClientId);
  const [equipmentId, setEquipmentId] = useState(queryEquipmentId);
  const [equipmentDetails, setEquipmentDetails] = useState('');
  const [reportedProblem, setReportedProblem] = useState('');
  const [status, setStatus] = useState('Em Análise');
  const [priority, setPriority] = useState('Média');
  const [technicianId, setTechnicianId] = useState('');
  const [deliveryPrediction, setDeliveryPrediction] = useState('');
  
  // Estado Financeiro / Mão de Obra
  const [serviceValue, setServiceValue] = useState('0'); // Valor da mão de obra
  const [totalValue, setTotalValue] = useState('0');     // Valor total (Mão de Obra + Peças)

  // Listagem de Equipamentos e Inventário
  const [equipments, setEquipments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isManualEquipment, setIsManualEquipment] = useState(false);

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
        setEquipmentId(hasQueryEq ? queryEquipmentId : localFiltered[0].id);
        setIsManualEquipment(false);
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
          setEquipmentId(hasQueryEq ? queryEquipmentId : eqsData[0].id);
          setIsManualEquipment(false);
        }
      } catch (err) {
        console.warn('Erro ao carregar equipamentos do Supabase:', err);
      }
    };

    fetchOnlineEquipments();
  }, [clientId, queryEquipmentId]);

  // 2. Controla o preenchimento automático das especificações se selecionar um equipamento pronto
  useEffect(() => {
    if (equipmentId === 'manual' || !equipmentId) {
      setIsManualEquipment(true);
      setEquipmentDetails('');
    } else {
      setIsManualEquipment(false);
      const selected = equipments.find((e) => e.id === equipmentId);
      if (selected) {
        setEquipmentDetails(`${selected.name} - ${selected.brand} ${selected.model} (S/N: ${selected.serial_number || '—'})`);
      }
    }
  }, [equipmentId, equipments]);

  // 3. Atualiza o Valor Total somando Mão de Obra + Peças + Serviços do Catálogo
  useEffect(() => {
    const labor = parseFloat(serviceValue) || 0;
    const partsTotal = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const servicesTotal = selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    setTotalValue((labor + partsTotal + servicesTotal).toFixed(2));
  }, [serviceValue, selectedProducts, selectedServices]);

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
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              required
              disabled={!!queryClientId}
            >
              <option value="">Selecione um cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.type})
                </option>
              ))}
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="Aguardando Equipamento">Aguardando Equipamento</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Na Bancada">Na Bancada</option>
                <option value="Aguardando Peça">Aguardando Peça</option>
                <option value="Em Testes">Em Testes</option>
                <option value="Pronta para Retirada">Pronta para Retirada</option>
                <option value="Entregue">Entregue</option>
                <option value="Cancelada">Cancelada</option>
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

          {/* Mão de Obra */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Valor de Mão de Obra (R$)
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
        </div>
      </div>

      {/* Problema Relatado */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Problema Relatado / Sintomas</label>
        <textarea
          rows={3}
          placeholder="Descreva o problema relatado..."
          value={reportedProblem}
          onChange={(e) => setReportedProblem(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
          required
        />
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
              onChange={(e) => setCurrentProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">Selecione um item do estoque...</option>
              {inventory.map((prod) => (
                <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
                  {prod.name} (Qtd: {prod.quantity} | R$ {prod.sale_price.toFixed(2)})
                </option>
              ))}
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
          </div>

          <button
            type="button"
            onClick={handleAddProduct}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-colors h-[34px] shadow-lg shadow-indigo-650/10"
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
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-4">
          <Tag className="w-6 h-6 text-emerald-450" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total da O.S.</p>
            <p className="text-xl font-extrabold text-emerald-450 font-mono">
              R$ {Number(totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
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
  );
}
