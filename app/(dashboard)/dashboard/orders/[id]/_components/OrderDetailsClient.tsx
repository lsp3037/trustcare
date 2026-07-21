'use client';
import { CheckCircle2, AlertTriangle, FileText, ChevronDown, Check, Calendar, DollarSign } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';

import { OrderChecklist, ChecklistTemplateItem } from './types';
import { STATUS_CONFIG, defaultChecklist } from './constants';

import { OrderHeader } from './OrderHeader';
import { ClientInfoCard } from './ClientInfoCard';
import { ChecklistSection } from './ChecklistSection';
import { TechnicalReportSection } from './TechnicalReportSection';
import { FinancialSection } from './FinancialSection';
import { AttachmentsSection } from './AttachmentsSection';
import { OrderActions } from './OrderActions';

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

  const [order, setOrder] = useState<any>(initialOrder);
  const [client, setClient] = useState<any>(initialClient);
  const [inventory, setInventory] = useState<any[]>(initialInventory);
  const [technicians, setTechnicians] = useState<any[]>(initialTechnicians);
  const [availableServices, setAvailableServices] = useState<any[]>(initialAvailableServices);

  const [status, setStatus] = useState(order?.status || 'Novo');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(
    order?.payment_date
      ? new Date(order.payment_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [entryChecklist, setEntryChecklist] = useState<OrderChecklist>(order?.entry_checklist || defaultChecklist);
  const [exitChecklist, setExitChecklist] = useState<OrderChecklist>(order?.exit_checklist || defaultChecklist);
  const [savingChecklist, setSavingChecklist] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<any[]>(initialSelectedProducts || []);
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentProductQty, setCurrentProductQty] = useState('1');
  const [productAddError, setProductAddError] = useState('');

  const [selectedServices, setSelectedServices] = useState<any[]>(initialSelectedServices || []);
  const [currentServiceId, setCurrentServiceId] = useState('');
  const [currentServicePrice, setCurrentServicePrice] = useState('0.00');
  const [currentServiceQty, setCurrentServiceQty] = useState('1');

  const [saving, setSaving] = useState(false);
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

  const handleRemoveProduct = (prodId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product_id !== prodId));
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
    setCurrentServiceId('');
    setCurrentServicePrice('0.00');
    setCurrentServiceQty('1');
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.service_id !== serviceId));
  };

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
        if (order && order.company_id && !order.id.startsWith('mock-os') && order.id.length === 36) {
          const fileExt = fileName.split('.').pop();
          const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const filePath = `${order.company_id}/${id}/${uniqueName}`;
          const { data, error } = await supabase.storage.from('os-media').upload(filePath, file, { cacheControl: '3600', upsert: true });
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('os-media').getPublicUrl(filePath);
          setMediaFiles((prev) => [...prev, { name: fileName, url: publicUrl, type: fileType }]);
        } else {
          const localUrl = URL.createObjectURL(file);
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

  const handleSaveChanges = async () => {
    if (isReadOnly) {
      setErrorMsg('A conta está em modo apenas-leitura devido a atraso no pagamento. Não é possível salvar alterações da OS.');
      return;
    }
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
        pago,
        payment_status: pago ? 'pago' : 'pendente',
        payment_method: pago ? paymentMethod : null,
        payment_date: pago ? new Date(paymentDate).toISOString() : null,
        media: mediaFiles.map(m => ({ name: m.name, url: m.persistentUrl || m.url, type: m.type }))
      };
      
      const { data: updatedOs, error: updateErr } = await supabase.from('service_orders').update(updatedOsData).eq('id', id).select().single();
      if (updateErr) throw updateErr;

      await supabase.from('service_order_items').delete().eq('service_order_id', id);

      for (const item of selectedProducts) {
        await supabase.from('service_order_items').insert({
          company_id: order.company_id,
          service_order_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      }

      await supabase.from('order_services').delete().eq('os_id', id);
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

      const statusChanged = order && order.status !== status;
      if (statusChanged) {
        await triggerWebhook(status);
      }
      
      setSuccessMsg('Ordem de Serviço atualizada com sucesso no banco de dados!');
      setTimeout(() => { router.push('/dashboard/orders'); }, 1200);

    } catch (err: any) {
      console.warn('Erro ao atualizar online:', err.message);
      setErrorMsg(`Erro ao salvar no banco: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async () => {
    const confirmDelete = window.confirm("Deseja realmente excluir esta Ordem de Serviço?");
    if (!confirmDelete) return;
    if (isReadOnly) {
      setErrorMsg('A conta está em modo apenas-leitura devido a atraso no pagamento. Exclusão de OS não é permitida.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const { error: deleteErr } = await supabase.from('service_orders').delete().eq('id', id);
      if (deleteErr) throw deleteErr;
      setSuccessMsg('Ordem de Serviço excluída com sucesso!');
      setTimeout(() => { router.push('/dashboard/orders'); }, 1200);
    } catch (err: any) {
      console.warn('Erro ao excluir:', err.message);
      setErrorMsg(`Erro ao excluir: ${err.message}`);
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
    try {
      const { error: updateErr } = await supabase.from('service_orders').update({ status: newStatus }).eq('id', id);
      if (updateErr) throw updateErr;
      setOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
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
      const { error: updateErr } = await supabase.from('service_orders').update({
        status: pendingStatusUpdate,
        payment_date: new Date(paymentDate).toISOString(),
        payment_method: paymentMethod,
        pago: true,
        payment_status: 'pago'
      }).eq('id', id);
      if (updateErr) throw updateErr;
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
        <OrderHeader order={order} client={client} status={status} priority={priority} />

        {successMsg && (
          <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5 shadow-lg">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-semibold text-sm font-mono tracking-wide">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/25 text-rose-450 flex items-center gap-2.5 shadow-lg">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold font-mono tracking-wide">{errorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            <ClientInfoCard order={order} client={client} />
            <TechnicalReportSection 
              reportedProblem={reportedProblem} setReportedProblem={setReportedProblem}
              technicalReport={technicalReport} setTechnicalReport={setTechnicalReport}
            />

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-6 shadow-2xl space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
                <FileText className="w-5 h-5 text-indigo-400" /> Status e Operacional
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dropdown de Status (Simplificado para o layout) */}
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status da OS</label>
                  <div>
                    <button
                      type="button" onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 flex items-center justify-between hover:border-slate-700 transition-colors focus:outline-none focus:border-blue-500"
                    >
                      <span className="font-semibold font-mono text-xs">{status}</span>
                      {updatingStatus ? <LoadingSpinner className="w-4 h-4 text-emerald-500 animate-spin" /> : <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />}
                    </button>
                    {isStatusDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-850 rounded-none shadow-2xl z-25 p-1 space-y-1 max-h-[300px] overflow-y-auto">
                          {Object.keys(STATUS_CONFIG).map((statusKey) => (
                            <button
                              key={statusKey} type="button"
                              onClick={() => { handleStatusChange(statusKey); setIsStatusDropdownOpen(false); }}
                              className={`w-full text-left py-2 px-3 flex items-center justify-between text-[10px] font-mono transition-colors uppercase tracking-wider ${status === statusKey ? 'bg-slate-900 text-white font-bold' : 'text-slate-400 hover:bg-slate-900/50 hover:text-white'}`}
                            >
                              <span>{statusKey}</span>
                              {status === statusKey && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridade</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition-colors">
                    <option value="Baixa">BAIXA</option>
                    <option value="Média">MÉDIA</option>
                    <option value="Alta">ALTA</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> Previsão de Entrega
                  </label>
                  <input type="date" value={deliveryPrediction} onChange={(e) => setDeliveryPrediction(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition-colors" />
                </div>
              </div>

              {(status === 'Finalizado' || status === 'Entregue' || status === 'Pronto para Retirada') && (
                <div className="space-y-4 p-4 bg-slate-950/40 border border-slate-800 rounded-none">
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
                      className="w-4 h-4 rounded-none border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer" 
                    />
                    <label htmlFor="pago-checkbox" className="text-xs font-bold text-slate-100 font-mono uppercase tracking-widest cursor-pointer select-none">
                      Ordem de Serviço Paga
                    </label>
                  </div>

                  {pago && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/40 animate-fadeIn">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento</label>
                        <select 
                          value={paymentMethod} 
                          onChange={(e) => setPaymentMethod(e.target.value)} 
                          className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                        >
                          <option value="Pix">Pix</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Transferência Bancária">Transferência Bancária</option>
                          <option value="Boleto Bancário">Boleto Bancário</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Pagamento</label>
                        <input 
                          type="date" 
                          value={paymentDate} 
                          onChange={(e) => setPaymentDate(e.target.value)} 
                          className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition-colors" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Técnico Responsável</label>
                <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer">
                  <option value="">Nenhum técnico atribuído...</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <AttachmentsSection mediaFiles={mediaFiles} uploading={uploading} handleFileUpload={handleFileUpload} handleRemoveFile={handleRemoveFile} previewImage={previewImage} setPreviewImage={setPreviewImage} />
            </div>

          </div>

          <div className="space-y-8">
            <FinancialSection 
              serviceValue={serviceValue} setServiceValue={setServiceValue} discount={discount} setDiscount={setDiscount} inventory={inventory}
              currentProductId={currentProductId} setCurrentProductId={setCurrentProductId} currentProductQty={currentProductQty} setCurrentProductQty={setCurrentProductQty} handleAddProduct={handleAddProduct}
              selectedProducts={selectedProducts} handleRemoveProduct={handleRemoveProduct} availableServices={availableServices} currentServiceId={currentServiceId} handleServiceSelect={handleServiceSelect}
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

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-none w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-850">
              <h2 className="text-base font-bold font-mono uppercase text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" /> Finalização e Caixa
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data do Pagamento</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500">
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-850 flex justify-end gap-3">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400 hover:text-white transition-colors">Cancelar</button>
              <button type="button" onClick={handleConfirmPaymentAndStatus} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none text-[10px] font-bold font-mono tracking-wider uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
