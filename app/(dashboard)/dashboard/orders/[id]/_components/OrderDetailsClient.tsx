'use client';
import { CheckCircle2, AlertTriangle, FileText, ChevronDown, Check } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
  LoadingSpinner,
  Card,
  CardTitle,
  Button,
  Modal,
  Field,
  Input,
  Select,
  useConfirm,
  useToast,
} from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';
import { cn } from '@/lib/utils';
import { toLocalYMD } from '@/lib/utils/dates';

/** Formas de pagamento — estava duplicado nos dois seletores deste arquivo. */
const PAYMENT_METHODS = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Transferência Bancária',
  'Boleto Bancário',
  'Outro',
] as const;

import { OrderChecklist, ChecklistTemplateItem } from './types';
import { OS_STATUS_FLOW, defaultChecklist } from './constants';

import { OrderHeader } from './OrderHeader';
import { ClientInfoCard } from './ClientInfoCard';
import { ChecklistSection } from './ChecklistSection';
import { TechnicalReportSection } from './TechnicalReportSection';
import { FinancialSection } from './FinancialSection';
import { AttachmentsSection } from './AttachmentsSection';
import { OrderActions } from './OrderActions';
import { appendServiceToTechnicalReport } from '@/lib/utils/reportFormatter';
import { useFormatProblem } from '@/components/hooks/useFormatProblem';

export function OrderDetailsClient({
  id,
  initialOrder,
  initialClient,
  initialInventory,
  initialTechnicians,
  initialAvailableServices,
  initialSelectedProducts,
  initialSelectedServices,
  checklistTemplateItems
}: any) {
  const router = useRouter();
  const { company, isReadOnly } = useCompany();
  const confirm = useConfirm();
  const toast = useToast();

  const [order, setOrder] = useState<any>(initialOrder);
  const [client, setClient] = useState<any>(initialClient);
  const [inventory, setInventory] = useState<any[]>(initialInventory);
  const [technicians, setTechnicians] = useState<any[]>(initialTechnicians);
  const [availableServices, setAvailableServices] = useState<any[]>(initialAvailableServices);

  const [status, setStatus] = useState(order?.status || 'Em Análise');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(
    toLocalYMD(order?.payment_date)
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(order?.payment_method || 'Pix');
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string>('');
  
  const [priority, setPriority] = useState(order?.priority || 'Média');
  const [technicianId, setTechnicianId] = useState(order?.technician_id || '');
  const [technicalReport, setTechnicalReport] = useState(order?.technical_report || '');
  const [reportedProblem, setReportedProblem] = useState(order?.reported_problem || '');
  const [deliveryPrediction, setDeliveryPrediction] = useState(order?.delivery_prediction ? new Date(order.delivery_prediction).toISOString().split('T')[0] : '');
  
  const [serviceValue, setServiceValue] = useState(Number(order?.service_value || 0).toString());
  const [discount, setDiscount] = useState(Number(order?.discount || 0).toString());
  const [totalValue, setTotalValue] = useState(Number(order?.total_value || 0).toString());
  const [pago, setPago] = useState(order?.pago || false);
  
  const [mediaFiles, setMediaFiles] = useState<any[]>(order?.media || []);
  const [uploading, setUploading] = useState(false);

  const [entryChecklist, setEntryChecklist] = useState<OrderChecklist>(order?.entry_checklist || defaultChecklist);
  const [exitChecklist, setExitChecklist] = useState<OrderChecklist>(order?.exit_checklist || defaultChecklist);
  const [savingChecklist, setSavingChecklist] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<any[]>(initialSelectedProducts || []);
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentProductQty, setCurrentProductQty] = useState('1');
  const [productAddError, setProductAddError] = useState('');

  // Peças sob encomenda / avulsas
  const [customPartName, setCustomPartName] = useState('');
  const [customPartQty, setCustomPartQty] = useState('1');
  const [customPartPrice, setCustomPartPrice] = useState('');
  const [customPartCost, setCustomPartCost] = useState('');
  const [customPartLink, setCustomPartLink] = useState('');

  const [selectedServices, setSelectedServices] = useState<any[]>(initialSelectedServices || []);
  const [currentServiceId, setCurrentServiceId] = useState('');
  const [currentServicePrice, setCurrentServicePrice] = useState('0.00');
  const [currentServiceQty, setCurrentServiceQty] = useState('1');

  const [saving, setSaving] = useState(false);
  const [formattingReport, setFormattingReport] = useState(false);
  const { formatProblem: handleFormatProblem, formattingProblem } = useFormatProblem({
    reportedProblem,
    setReportedProblem,
    equipment: order?.equipment_details || '',
    successMessage: 'Problema relatado formatado. Revise e clique em Salvar.',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const labor = parseFloat(serviceValue) || 0;
    const partsTotal = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const servicesTotal = selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const subtotal = labor + partsTotal + servicesTotal;
    const disc = parseFloat(discount) || 0;
    setTotalValue(Math.max(0, subtotal - disc).toFixed(2));
  }, [serviceValue, selectedProducts, selectedServices, discount]);

  const handleAddProduct = () => {
    if (!currentProductId) return;
    const prod = inventory.find((p) => p.id === currentProductId);
    if (!prod) return;
    const qty = parseInt(currentProductQty) || 1;
    const existingItem = selectedProducts.find((p) => p.product_id === currentProductId);
    const existingQty = existingItem ? existingItem.quantity : 0;
    const stockAvailable = prod.quantity + existingQty;

    if (qty > stockAvailable) {
      setProductAddError(`Quantidade indisponível no estoque. Saldo atual + alocado: ${stockAvailable} un`);
      return;
    }

    setProductAddError('');

    if (existingItem) {
      const updated = selectedProducts.map((p) => {
        if (p.product_id === currentProductId) {
          return { ...p, quantity: qty };
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

  const handleAddCustomProduct = () => {
    if (!customPartName.trim()) {
      setProductAddError('Informe a descrição/nome da peça sob encomenda.');
      return;
    }
    const qty = parseInt(customPartQty) || 1;
    const price = parseFloat(customPartPrice) || 0;
    const cost = parseFloat(customPartCost) || 0;

    if (price <= 0) {
      setProductAddError('O valor de venda da peça sob encomenda deve ser maior que zero.');
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
      }
    ]);

    setCustomPartName('');
    setCustomPartPrice('');
    setCustomPartCost('');
    setCustomPartLink('');
    setCustomPartQty('1');
    toast.success('Peça sob encomenda adicionada ao orçamento!');
  };

  const handleUpdateCustomProduct = (updatedItem: any) => {
    setSelectedProducts((prev) =>
      prev.map((p) => {
        const matches = (p.id && p.id === updatedItem.id) || (p.custom_name && p.custom_name === updatedItem.custom_name && p.is_custom);
        if (matches) {
          return {
            ...p,
            name: updatedItem.name,
            custom_name: updatedItem.name,
            quantity: updatedItem.quantity,
            unit_price: updatedItem.unit_price,
            unit_cost: updatedItem.unit_cost,
            supplier_link: updatedItem.supplier_link,
          };
        }
        return p;
      })
    );
    toast.success('Peça sob encomenda atualizada!');
  };

  const handleRemoveProduct = (itemOrId: any) => {
    if (!itemOrId) return;
    const idToRemove = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
    const prodIdToRemove = typeof itemOrId === 'object' ? itemOrId.product_id : itemOrId;

    setSelectedProducts((prev) =>
      prev.filter((p) => {
        if (p.id === idToRemove) return false;
        if (prodIdToRemove && p.product_id === prodIdToRemove) return false;
        return true;
      })
    );
  };

  const handleServiceSelect = (serviceId: string) => {
    setCurrentServiceId(serviceId);
    const serv = availableServices.find(s => s.id === serviceId);
    if (serv) {
      setCurrentServicePrice(Number(serv.preco_padrao || 0).toFixed(2));
    } else {
      setCurrentServicePrice('0.00');
    }
  };

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

    // Incorpora automaticamente a descrição do serviço no Laudo Técnico / Serviço Realizado
    const { updatedReport, added } = appendServiceToTechnicalReport(
      technicalReport,
      serv.nome,
      serv.descricao
    );
    if (added) {
      setTechnicalReport(updatedReport);
      toast.success(`Serviço "${serv.nome}" adicionado e incorporado ao laudo.`);
    }

    setCurrentServiceId('');
    setCurrentServicePrice('0.00');
    setCurrentServiceQty('1');
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.service_id !== serviceId));
  };

  const handleUploadFiles = async (
    filesOrEvent: React.ChangeEvent<HTMLInputElement> | FileList | File[],
    category: 'problem' | 'service' = 'service'
  ) => {
    let files: File[] = [];
    if (filesOrEvent && 'target' in filesOrEvent) {
      if (filesOrEvent.target.files) {
        files = Array.from(filesOrEvent.target.files);
      }
    } else if (filesOrEvent instanceof FileList) {
      files = Array.from(filesOrEvent);
    } else if (Array.isArray(filesOrEvent)) {
      files = filesOrEvent;
    }

    if (!files || files.length === 0) return;
    setUploading(true);
    setErrorMsg('');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      const fileType = file.type;
      try {
        if (order && order.company_id && !order.id.startsWith('mock-os') && order.id.length === 36) {
          const fileExt = fileName.split('.').pop();
          const prefix = category === 'problem' ? 'problem_' : '';
          const uniqueName = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const filePath = `${order.company_id}/${id}/${uniqueName}`;
          const { data, error } = await supabase.storage.from('os-media').upload(filePath, file, { cacheControl: '3600', upsert: true });
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('os-media').getPublicUrl(filePath);
          setMediaFiles((prev) => [...prev, { name: fileName, url: publicUrl, type: fileType, category }]);
        } else {
          const localUrl = URL.createObjectURL(file);
          const persistentUrl = fileType.startsWith('image/')
            ? 'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=600&auto=format&fit=crop&q=60'
            : fileType.startsWith('video/')
              ? 'https://www.w3schools.com/html/mov_bbb.mp4'
              : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
          setMediaFiles((prev) => [...prev, { name: fileName, url: localUrl, persistentUrl, type: fileType, category }]);
        }
      } catch (uploadErr: any) {
        console.error('Erro de upload:', uploadErr);
        setErrorMsg(`Falha ao anexar ${fileName}: ${uploadErr.message}`);
      }
    }
    setUploading(false);
    if (filesOrEvent && 'target' in filesOrEvent && filesOrEvent.target) {
      filesOrEvent.target.value = '';
    }
  };

  const problemMediaFiles = useMemo(
    () => mediaFiles.filter((m) => m.category === 'problem'),
    [mediaFiles]
  );
  const serviceMediaFiles = useMemo(
    () => mediaFiles.filter((m) => m.category !== 'problem'),
    [mediaFiles]
  );

  const handleRemoveProblemFile = async (index: number) => {
    const item = problemMediaFiles[index];
    if (!item) return;
    const globalIndex = mediaFiles.indexOf(item);
    if (globalIndex !== -1) {
      await handleRemoveFile(globalIndex);
    }
  };

  const handleRemoveServiceFile = async (index: number) => {
    const item = serviceMediaFiles[index];
    if (!item) return;
    const globalIndex = mediaFiles.indexOf(item);
    if (globalIndex !== -1) {
      await handleRemoveFile(globalIndex);
    }
  };

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = mediaFiles[index];
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

  const handleSaveChecklists = async (type: 'entry' | 'exit') => {
    if (isReadOnly) {
      setErrorMsg('A conta está em modo apenas-leitura devido a atraso no pagamento. Alterações de checklist não são permitidas.');
      return;
    }
    setSavingChecklist(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const updateData = type === 'entry' ? { entry_checklist: entryChecklist } : { exit_checklist: exitChecklist };
      const { error } = await supabase.from('service_orders').update(updateData).eq('id', id);
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

  const triggerWebhook = async (newStatus: string) => {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          order_id: id,
          equipment: order?.equipment_details || 'Equipamento',
          client_name: client?.name || 'Cliente',
          client_email: client?.email || '',
          client_phone: client?.phone || '',
          tracking_url: `${window.location.origin}/rastreio?id=${id}`,
          budget_url: `${window.location.origin}/orcamento/${id}`,
          total_value: order?.total_value ? parseFloat(order.total_value).toFixed(2) : undefined,
        })
      });
    } catch (webhookErr) {
      console.warn('Erro ao disparar fluxo de notificação:', webhookErr);
    }
  };

  /**
   * Transforma as anotações livres do laudo no formato padrão (Diagnóstico,
   * Serviços orçados, Total, Garantia, Prazo, Privacidade) via Edge Function
   * `formatar-laudo`. Os valores vêm dos itens da OS na tela; o total é
   * calculado no servidor. Nada é salvo: o técnico revisa e clica em Salvar.
   */
  const handleFormatReport = async () => {
    const plain = technicalReport.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    if (plain.length < 5) {
      toast.warning('Escreva suas anotações no laudo antes de formatar.');
      return;
    }
    setFormattingReport(true);
    const previous = technicalReport;
    try {
      const itens = [...selectedProducts, ...selectedServices].map((i: any) => ({
        nome: i.name,
        quantidade: Number(i.quantity) || 1,
        valor_unitario: Number(i.unit_price) || 0,
      }));
      const { data, error } = await supabase.functions.invoke('formatar-laudo', {
        body: {
          notas: technicalReport,
          itens,
          mao_de_obra: parseFloat(serviceValue) || 0,
          desconto: parseFloat(discount) || 0,
          equipamento: order?.equipment_details || '',
        },
      });
      if (error) {
        let message = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) message = body.error;
        } catch {}
        throw new Error(message);
      }
      if (!data?.html) throw new Error('A formatação voltou vazia.');
      setTechnicalReport(data.html);
      toast.success('Laudo formatado. Revise e clique em Salvar.', {
        action: { label: 'Desfazer', onClick: () => setTechnicalReport(previous) },
        duration: 10000,
      });
      if (data.aviso) toast.warning('Confira os valores', { description: data.aviso });
    } catch (err: any) {
      toast.error('Não foi possível formatar o laudo', { description: err?.message });
    } finally {
      setFormattingReport(false);
    }
  };

  const handleSaveChanges = async () => {
    if (isReadOnly) {
      setErrorMsg('A conta está em modo apenas-leitura devido a atraso no pagamento. Não é possível salvar alterações da OS.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const itemsPayload = selectedProducts.map((p) => ({
        product_id: p.product_id || null,
        custom_name: p.custom_name || (!p.product_id ? p.name : null),
        quantity: p.quantity,
        unit_price: p.unit_price,
        unit_cost: p.unit_cost || 0,
        part_status: p.part_status || (p.product_id ? 'em_estoque' : 'pendente'),
        supplier_link: p.supplier_link || null,
        tracking_code: p.tracking_code || null,
        actual_cost: p.actual_cost || null,
      }));

      const servicesPayload = selectedServices.map((s) => ({
        service_id: s.service_id,
        quantidade: s.quantity,
        preco_unitario: s.unit_price,
      }));

      const orderPayload = {
        id,
        client_id: order?.client_id || client?.id,
        equipment_id: order?.equipment_id || null,
        equipment_details: order?.equipment_details || '',
        reported_problem: reportedProblem,
        technical_report: technicalReport || null,
        status,
        priority,
        technician_id: technicianId || null,
        delivery_prediction: deliveryPrediction || null,
        service_value: parseFloat(serviceValue) || 0,
        discount: parseFloat(discount) || 0,
        pago,
        payment_status: pago ? 'pago' : 'pendente',
        payment_method: pago ? paymentMethod : null,
        payment_date: pago ? toLocalYMD(paymentDate) : null,
        media: mediaFiles.map((m) => ({ name: m.name, url: m.persistentUrl || m.url, type: m.type, category: m.category || 'service' })),
        entry_checklist: entryChecklist,
        exit_checklist: exitChecklist,
      };

      const { data: updatedOs, error: rpcErr } = await supabase.rpc('save_order', {
        order_data: orderPayload,
        items_data: itemsPayload,
        services_data: servicesPayload,
      });

      if (rpcErr) throw rpcErr;
      if (!updatedOs) {
        throw new Error('As alterações não foram salvas. Verifique as permissões da sua conta.');
      }

      const statusChanged = order && order.status !== status;
      if (statusChanged) {
        await triggerWebhook(status);
      }
      
      setSuccessMsg('Ordem de Serviço atualizada com sucesso no banco de dados!');
      router.refresh();
      setTimeout(() => { router.push('/dashboard/orders'); }, 1200);

    } catch (err: any) {
      console.warn('Erro ao atualizar online:', err.message);
      setErrorMsg(`Erro ao salvar no banco: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async () => {
    // A checagem de somente-leitura vem antes do diálogo: não faz sentido
    // perguntar se o usuário quer excluir para depois dizer que não pode.
    if (isReadOnly) {
      setErrorMsg('A conta está em modo apenas-leitura devido a atraso no pagamento. Exclusão de OS não é permitida.');
      return;
    }

    const confirmed = await confirm({
      title: `Excluir a OS #${order?.codigo_os || id.slice(0, 8)}?`,
      description:
        'A ordem de serviço será arquivada e as peças alocadas retornarão ao estoque. Ordens finalizadas ou pagas não podem ser excluídas.',
      confirmLabel: 'Excluir OS',
      destructive: true,
    });
    if (!confirmed) return;

    setSaving(true);
    setErrorMsg('');
    try {
      const { error: deleteErr } = await supabase.rpc('delete_service_orders_batch', {
        order_ids: [id],
      });
      if (deleteErr) throw deleteErr;
      setSuccessMsg('Ordem de Serviço excluída com sucesso!');
      router.refresh();
      setTimeout(() => { router.push('/dashboard/orders'); }, 1200);
    } catch (err: any) {
      console.warn('Erro ao excluir:', err.message);
      setErrorMsg(`Erro ao excluir: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'Finalizado') {
      setPendingStatusUpdate(newStatus);
      setIsPaymentModalOpen(true);
      return;
    }
    setStatus(newStatus);
    setUpdatingStatus(true);
    try {
      const { data: updatedSt, error: updateErr } = await supabase.rpc('change_order_status', {
        order_id: id,
        new_status: newStatus,
      });
      if (updateErr) throw updateErr;
      if (!updatedSt) {
        throw new Error('Status não alterado. Verifique as permissões da sua conta.');
      }
      setOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
      if (newStatus === 'Cancelado') {
        setSelectedProducts([]);
      }
      setSuccessMsg('Status atualizado em tempo real!');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      await triggerWebhook(newStatus);
    } catch (err: any) {
      setErrorMsg(`Erro ao atualizar status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmPaymentAndStatus = async () => {
    setIsPaymentModalOpen(false);
    setStatus(pendingStatusUpdate);
    setUpdatingStatus(true);
    try {
      const { data: updatedPay, error: updateErr } = await supabase.rpc('change_order_status', {
        order_id: id,
        new_status: pendingStatusUpdate,
        payment_data: {
          pago: true,
          payment_status: 'pago',
          payment_method: paymentMethod,
          payment_date: toLocalYMD(paymentDate),
        },
      });
      if (updateErr) throw updateErr;
      if (!updatedPay) {
        throw new Error('Atualização não concluída. Verifique as permissões da sua conta.');
      }
      setPago(true);
      setOrder((prev: any) => prev ? { ...prev, status: pendingStatusUpdate, payment_date: paymentDate, payment_method: paymentMethod, pago: true } : null);
      setSuccessMsg('Status e fluxo de caixa atualizados em tempo real!');
      
      await triggerWebhook(pendingStatusUpdate);
    } catch (err: any) {
      setErrorMsg(`Erro ao atualizar caixa: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <>
      <div className="space-y-8 print:hidden">
        <OrderHeader
          order={order}
          client={client}
          company={company}
          selectedProducts={selectedProducts}
          selectedServices={selectedServices}
          status={status}
          priority={priority}
        />

        {successMsg && (
          <div
            role="status"
            className="p-4 bg-success/10 border border-success/25 text-success flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden />
            <p className="text-small font-semibold">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div
            role="alert"
            className="p-4 bg-danger/10 border border-danger/25 text-danger flex items-center gap-2.5"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
            <p className="text-small font-semibold">{errorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            <ClientInfoCard order={order} client={client} />
            <TechnicalReportSection 
              reportedProblem={reportedProblem} setReportedProblem={setReportedProblem}
              technicalReport={technicalReport} setTechnicalReport={setTechnicalReport}
              onFormatReport={handleFormatReport}
              formattingReport={formattingReport}
              onFormatProblem={handleFormatProblem}
              formattingProblem={formattingProblem}
              formatDisabled={isReadOnly || saving}
              problemMediaFiles={problemMediaFiles}
              uploadingProblemMedia={uploading}
              onUploadProblemMedia={(files) => handleUploadFiles(files, 'problem')}
              onRemoveProblemMedia={handleRemoveProblemFile}
              readOnly={isReadOnly}
            />

            <Card className="space-y-6">
              <CardTitle className="flex items-center gap-2 border-b border-border pb-3">
                <FileText className="w-5 h-5 text-text-subtle" aria-hidden /> Status e Operacional
              </CardTitle>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dropdown de Status */}
                <Field label="Status da OS" className="relative">
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    aria-expanded={isStatusDropdownOpen}
                    className="w-full bg-surface-sunken border border-border py-2 px-3 text-sm text-text flex items-center justify-between gap-2 hover:border-border-strong transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="font-semibold truncate">{status}</span>
                    {updatingStatus ? (
                      <LoadingSpinner className="w-4 h-4 text-brand shrink-0" />
                    ) : (
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-text-subtle shrink-0 transition-transform',
                          isStatusDropdownOpen && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                  {isStatusDropdownOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Fechar opções de status"
                        className="fixed inset-0 z-10 cursor-default bg-transparent border-none"
                        onClick={() => setIsStatusDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface-overlay border border-border shadow-2xl z-20 p-1 max-h-[300px] overflow-y-auto">
                        {OS_STATUS_FLOW.map((statusKey) => (
                          <button
                            key={statusKey}
                            type="button"
                            aria-current={status === statusKey || undefined}
                            onClick={() => { handleStatusChange(statusKey); setIsStatusDropdownOpen(false); }}
                            className={cn(
                              'w-full text-left py-2 px-3 flex items-center justify-between gap-2 text-small transition-colors cursor-pointer',
                              status === statusKey
                                ? 'bg-surface-sunken text-text font-semibold'
                                : 'text-text-muted hover:bg-surface-sunken hover:text-text',
                            )}
                          >
                            <span>{statusKey}</span>
                            {status === statusKey && <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </Field>

                <Select
                  label="Prioridade"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </Select>

                <Input
                  label="Previsão de Entrega"
                  type="date"
                  value={deliveryPrediction}
                  onChange={(e) => setDeliveryPrediction(e.target.value)}
                  className="font-mono"
                />
              </div>

              {(status === 'Finalizado' || status === 'Pronto para Retirada') && (
                <div className="space-y-4 p-4 bg-surface-sunken border border-border">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="pago-checkbox"
                      checked={pago}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPago(checked);
                        if (checked && !paymentDate) {
                          setPaymentDate(new Date().toISOString().split('T')[0]);
                        }
                      }}
                      className="w-4 h-4 border-border bg-surface-sunken accent-brand cursor-pointer"
                    />
                    <label htmlFor="pago-checkbox" className="text-small font-semibold text-text cursor-pointer select-none">
                      Ordem de Serviço Paga
                    </label>
                  </div>

                  {pago && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
                      <Select
                        label="Forma de Pagamento"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </Select>

                      <Input
                        label="Data do Pagamento"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              <Select
                label="Técnico Responsável"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">Nenhum técnico atribuído...</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>

              <AttachmentsSection
                mediaFiles={serviceMediaFiles}
                uploading={uploading}
                handleFileUpload={(files) => handleUploadFiles(files, 'service')}
                handleRemoveFile={handleRemoveServiceFile}
                readOnly={isReadOnly}
              />
            </Card>

          </div>

          <div className="space-y-8">
            <FinancialSection 
              serviceValue={serviceValue} setServiceValue={setServiceValue} discount={discount} setDiscount={setDiscount} inventory={inventory}
              currentProductId={currentProductId} setCurrentProductId={setCurrentProductId} currentProductQty={currentProductQty} setCurrentProductQty={setCurrentProductQty} handleAddProduct={handleAddProduct}
              selectedProducts={selectedProducts} handleRemoveProduct={handleRemoveProduct}
              handleUpdateCustomProduct={handleUpdateCustomProduct}
              customPartName={customPartName} setCustomPartName={setCustomPartName}
              customPartQty={customPartQty} setCustomPartQty={setCustomPartQty}
              customPartPrice={customPartPrice} setCustomPartPrice={setCustomPartPrice}
              customPartCost={customPartCost} setCustomPartCost={setCustomPartCost}
              customPartLink={customPartLink} setCustomPartLink={setCustomPartLink}
              handleAddCustomProduct={handleAddCustomProduct}
              availableServices={availableServices} currentServiceId={currentServiceId} handleServiceSelect={handleServiceSelect}
              currentServiceQty={currentServiceQty} setCurrentServiceQty={setCurrentServiceQty} currentServicePrice={currentServicePrice} setCurrentServicePrice={setCurrentServicePrice} handleAddService={handleAddService}
              selectedServices={selectedServices} handleRemoveService={handleRemoveService} totalValue={totalValue}
              productAddError={productAddError} setProductAddError={setProductAddError}
            />
            
            <OrderActions handleDeleteOrder={handleDeleteOrder} handleSaveChanges={handleSaveChanges} saving={saving} />
          </div>
          
          <ChecklistSection 
            status={status} checklistTemplateItems={checklistTemplateItems} entryChecklist={entryChecklist} setEntryChecklist={setEntryChecklist}
            exitChecklist={exitChecklist} setExitChecklist={setExitChecklist} handleSaveChecklists={handleSaveChecklists} savingChecklist={savingChecklist}
          />
        </div>
      </div>

      <Modal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Finalização e Caixa"
        description={`Registre o recebimento para mover a OS para "${pendingStatusUpdate}".`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPaymentAndStatus}>Confirmar</Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="Data do Pagamento"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="font-mono"
          />
          <Select
            label="Forma de Pagamento"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      </Modal>
    </>
  );
}
