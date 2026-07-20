'use client';

import React from 'react';
import {
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
  Info,
  Clock,
  Printer,
  FileText,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { useOrderForm } from '@/components/hooks/useOrderForm';
import { formatDocument } from '@/lib/utils/documentValidation';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-32 w-full animate-pulse bg-slate-950 border border-slate-800 rounded-none" />,
});

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean'],
  ],
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
  const {
    queryClientId,
    queryEquipmentId,
    queryEquipmentName,
    clientId, setClientId,
    equipmentId, setEquipmentId,
    equipmentDetails, setEquipmentDetails,
    reportedProblem, setReportedProblem,
    status, setStatus,
    priority, setPriority,
    technicianId, setTechnicianId,
    deliveryPrediction, setDeliveryPrediction,
    serviceValue, setServiceValue,
    discount, setDiscount,
    subtotalValue,
    totalValue,
    equipments,
    inventory,
    isManualEquipment,
    clientsList,
    technicians,
    availableServices,
    isNewClientModalOpen, setIsNewClientModalOpen,
    isNewProductModalOpen, setIsNewProductModalOpen,
    clientModalStep,
    newClientName, setNewClientName,
    newClientType, setNewClientType,
    newClientDoc, setNewClientDoc,
    newClientPhone, setNewClientPhone,
    newClientEmail, setNewClientEmail,
    newEqName, setNewEqName,
    newEqBrand, setNewEqBrand,
    newEqModel, setNewEqModel,
    newEqSerial, setNewEqSerial,
    savingClient,
    clientModalError, setClientModalError,
    setClientModalStep,
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
    selectedProducts,
    currentProductId, setCurrentProductId,
    currentProductQty, setCurrentProductQty,
    productAddError, setProductAddError,
    selectedServices,
    currentServiceId,
    currentServiceQty, setCurrentServiceQty,
    currentServicePrice, setCurrentServicePrice,
    loading,
    errorMsg,
    success,
    handleNextStep,
    handleSaveClient,
    handleSaveProduct,
    handleAddProduct,
    handleRemoveProduct,
    handleServiceSelect,
    handleAddService,
    handleRemoveService,
    handleSubmit,
  } = useOrderForm({ clients, onSuccess });

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 text-slate-200">
      {success && (
        <div className="p-4 rounded-none bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold text-sm">Ordem de Serviço aberta com sucesso!</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/25 text-rose-450 flex items-center gap-2.5">
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
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Problema Relatado */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Problema Relatado / Sintomas</label>
        <div className="bg-slate-950 rounded-none overflow-hidden border border-slate-800">
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
      <div className="bg-slate-950/40 border border-slate-900 rounded-none p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
          <Boxes className="w-4 h-4 text-indigo-400" /> Peças e Peças de Reposição Utilizadas
        </h3>

        {/* Base de formulário com suporte a erros inline */}
        <div className="space-y-3">
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
                    setProductAddError('');
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                onChange={(e) => {
                  setCurrentProductQty(e.target.value);
                  setProductAddError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              {(() => {
                const prod = inventory.find(p => p.id === currentProductId);
                if (prod) {
                  const qty = parseInt(currentProductQty) || 0;
                  const over = qty > prod.quantity;
                  const isLow = prod.quantity <= prod.min_stock_alert;
                  return (
                    <div className="space-y-0.5 mt-1">
                      <span className={`text-[10px] block font-semibold ${over ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                        Estoque: {prod.quantity} un
                      </span>
                      {!over && isLow && (
                        <span className="text-[9px] text-amber-500 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Estoque Baixo (Mín: {prod.min_stock_alert})
                        </span>
                      )}
                    </div>
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
              className={`font-semibold py-2 px-4 rounded-none text-xs flex items-center gap-1.5 transition-all h-[34px] ${
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

          {productAddError && (
            <div className="p-2.5 rounded-none bg-rose-500/10 border border-rose-500/20 text-xs text-rose-450 font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              {productAddError}
            </div>
          )}
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
      <div className="bg-slate-950/40 border border-slate-900 rounded-none p-5 space-y-4">
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
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 text-center font-mono"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          <button
            type="button"
            onClick={handleAddService}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-none text-xs flex items-center gap-1.5 transition-colors h-[34px] shadow-lg shadow-indigo-650/10 shrink-0 cursor-pointer"
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

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-none flex items-center gap-4">
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
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-8 rounded-none text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-55"
        >
          {loading ? (
            <LoadingSpinner className="w-4 h-4 animate-spin" />
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
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-none shadow-2xl overflow-hidden animate-in scale-in-95 duration-200">
          
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
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-none hover:bg-slate-800"
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
              <div className="mx-6 mt-4 p-3 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs flex items-center gap-2 animate-in fade-in duration-200">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: João da Silva ou Tech Corp Ltda"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={newClientDoc}
                    onChange={(e) => setNewClientDoc(formatDocument(e.target.value))}
                    maxLength={18}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">E-mail</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
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
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-slate-100 font-semibold rounded-none text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-none text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: Notebook Dell Inspiron"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Marca</label>
                  <input
                    type="text"
                    value={newEqBrand}
                    onChange={(e) => setNewEqBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: Dell"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Modelo</label>
                  <input
                    type="text"
                    value={newEqModel}
                    onChange={(e) => setNewEqModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Ex: L14 Gen 2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Número de Série</label>
                  <input
                    type="text"
                    value={newEqSerial}
                    onChange={(e) => setNewEqSerial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
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
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-slate-100 font-semibold rounded-none text-xs transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={savingClient}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-none text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingClient ? (
                      <LoadingSpinner className="w-3.5 h-3.5 animate-spin" />
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
        <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-none shadow-2xl overflow-hidden animate-in scale-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-850 px-6 py-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-500" /> Cadastrar Nova Peça
            </h3>
            <button
              type="button"
              onClick={() => setIsNewProductModalOpen(false)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-none hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
            {productModalError && (
              <div className="p-4 rounded-none bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs flex items-center gap-2">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-650 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-100 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Condicionais SSD */}
            {newProdCategory === 'SSD' && (
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-none animate-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tecnologia SSD *</label>
                  <select
                    value={newProdSsdTech}
                    onChange={(e) => setNewProdSsdTech(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 border border-slate-850 rounded-none animate-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aplicação *</label>
                  <select
                    value={newProdRamApp}
                    onChange={(e) => setNewProdRamApp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                    className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tamanho *</label>
                  <select
                    value={newProdRamGb}
                    onChange={(e) => setNewProdRamGb(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 placeholder-slate-655 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-sm text-slate-105 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-350 hover:text-slate-100 font-semibold rounded-none text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-none text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingProduct ? (
                  <LoadingSpinner className="w-3.5 h-3.5 animate-spin" />
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
