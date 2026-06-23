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
  Paperclip
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  // Estados dos Dados
  const [order, setOrder] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Estados dos Campos Editáveis da OS
  const [status, setStatus] = useState('Novo');
  const [priority, setPriority] = useState('Média');
  const [technicianId, setTechnicianId] = useState('');
  const [technicalReport, setTechnicalReport] = useState('');
  const [deliveryPrediction, setDeliveryPrediction] = useState('');
  const [serviceValue, setServiceValue] = useState('0'); // Valor da mão de obra
  const [totalValue, setTotalValue] = useState('0');     // Mão de obra + Peças
  const [pago, setPago] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
        setServiceValue(Number(osData.service_value || 0).toString());
        setTotalValue(Number(osData.total_value || 0).toString());
        setPago(osData.pago || false);
        setMediaFiles(osData.media || []);

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
        setServiceValue(Number(foundOs.service_value || 0).toString());
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

  // 2. Atualiza o Valor Total somando Mão de Obra + Peças + Serviços do Catálogo
  useEffect(() => {
    const labor = parseFloat(serviceValue) || 0;
    const partsTotal = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const servicesTotal = selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    setTotalValue((labor + partsTotal + servicesTotal).toFixed(2));
  }, [serviceValue, selectedProducts, selectedServices]);

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
        delivery_prediction: deliveryPrediction || null,
        service_value: parseFloat(serviceValue) || 0,
        total_value: parseFloat(totalValue) || 0,
        pago: status === 'Entregue' ? pago : false,
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
      const criticalStatuses = ['Aguardando Peça', 'Pronta para Retirada', 'Cancelada'];
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
              delivery_prediction: deliveryPrediction || null,
              service_value: parseFloat(serviceValue) || 0,
              total_value: parseFloat(totalValue) || 0,
              pago: status === 'Entregue' ? pago : false,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Equipamento': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'Em Análise': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Na Bancada': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Aguardando Peça': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Em Testes': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'Pronta para Retirada': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Entregue': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Cancelada': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
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
    <div className="space-y-8">
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

            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-900/80">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Problema Relatado / Defeito</p>
              <p className="text-sm text-slate-350 italic font-medium">
                "{order.reported_problem}"
              </p>
            </div>
          </div>

          {/* Gerenciamento de Trabalho */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-indigo-400" /> Status, Técnico e Laudo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Status da OS</label>
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

            {/* Pagamento (Somente se Entregue) */}
            {status === 'Entregue' && (
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
              <textarea
                rows={5}
                placeholder="Insira as observações técnicas detalhadas, testes executados e solução encontrada..."
                value={technicalReport}
                onChange={(e) => setTechnicalReport(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
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

            {/* Mão de Obra */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Valor de Mão de Obra (R$)
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
                    disabled={!currentProductId}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Peça
                  </button>
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
    </div>
  );
}
