'use client';
import React from 'react';
import { DollarSign, Tag, Boxes, Plus, Trash2 } from 'lucide-react';

interface FinancialSectionProps {
  serviceValue: string;
  setServiceValue: (v: string) => void;
  discount: string;
  setDiscount: (v: string) => void;
  inventory: any[];
  currentProductId: string;
  setCurrentProductId: (v: string) => void;
  currentProductQty: string;
  setCurrentProductQty: (v: string) => void;
  handleAddProduct: () => void;
  selectedProducts: any[];
  handleRemoveProduct: (id: string) => void;
  availableServices: any[];
  currentServiceId: string;
  handleServiceSelect: (id: string) => void;
  currentServiceQty: string;
  setCurrentServiceQty: (v: string) => void;
  currentServicePrice: string;
  setCurrentServicePrice: (v: string) => void;
  handleAddService: () => void;
  selectedServices: any[];
  handleRemoveService: (id: string) => void;
  totalValue: string;
}

export function FinancialSection({
  serviceValue, setServiceValue,
  discount, setDiscount,
  inventory,
  currentProductId, setCurrentProductId,
  currentProductQty, setCurrentProductQty,
  handleAddProduct,
  selectedProducts, handleRemoveProduct,
  availableServices,
  currentServiceId, handleServiceSelect,
  currentServiceQty, setCurrentServiceQty,
  currentServicePrice, setCurrentServicePrice,
  handleAddService,
  selectedServices, handleRemoveService,
  totalValue
}: FinancialSectionProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-6 shadow-2xl space-y-6 h-fit">
      <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
        <Boxes className="w-5 h-5 text-emerald-500" /> Peças e Mão de Obra
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Mão de Obra (R$)
          </label>
          <input
            type="number" step="0.01" min="0" value={serviceValue}
            onChange={(e) => setServiceValue(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-mono font-semibold"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-rose-500" /> Desconto (R$)
          </label>
          <input
            type="number" step="0.01" min="0" value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-mono font-semibold"
          />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-850">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adicionar Peças do Estoque</p>
        <div className="space-y-2">
          <select
            value={currentProductId}
            onChange={(e) => setCurrentProductId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-150 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
                  type="number" min="1" placeholder="Qtd"
                  value={currentProductQty}
                  onChange={(e) => setCurrentProductQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors text-center font-mono"
                />
              </div>
              <button
                type="button" onClick={handleAddProduct}
                disabled={!currentProductId}
                className="flex-1 font-semibold font-mono uppercase tracking-wider py-2 px-4 rounded-none text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Peça
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-850">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Peças Alocadas</p>
        {selectedProducts.length === 0 ? (
          <div className="text-center py-4 text-slate-550 text-[10px] uppercase tracking-wider font-medium bg-slate-950/30 rounded-none border border-slate-950">
            Nenhuma peça vinculada
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
            {selectedProducts.map((prod) => (
              <div key={prod.id} className="bg-slate-950/60 border border-slate-900 rounded-none p-3 flex justify-between items-center text-xs group">
                <div className="space-y-0.5 overflow-hidden">
                  <p className="font-semibold font-mono text-slate-200 truncate">{prod.name}</p>
                  <p className="text-slate-500 font-mono text-[10px]">
                    {prod.quantity} un • R$ {Number(prod.unit_price).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-slate-300 font-mono text-[10px]">
                    R$ {(prod.quantity * prod.unit_price).toFixed(2)}
                  </span>
                  <button type="button" onClick={() => handleRemoveProduct(prod.product_id)} className="text-slate-600 hover:text-rose-500 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-850">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adicionar Serviços</p>
        <div className="space-y-2">
          <select
            value={currentServiceId}
            onChange={(e) => handleServiceSelect(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-150 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
              <input type="number" min="1" placeholder="Qtd" value={currentServiceQty} onChange={(e) => setCurrentServiceQty(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors text-center font-mono" />
            </div>
            <div className="flex-1">
              <input type="number" step="0.01" min="0" placeholder="Valor Unitário (R$)" value={currentServicePrice} onChange={(e) => setCurrentServicePrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-none py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-mono font-semibold" />
            </div>
            <button type="button" onClick={handleAddService} disabled={!currentServiceId} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold font-mono tracking-wider py-2 px-4 rounded-none text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-850">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Serviços Vinculados</p>
        {selectedServices.length === 0 ? (
          <div className="text-center py-4 text-slate-550 text-[10px] uppercase tracking-wider font-medium bg-slate-950/30 rounded-none border border-slate-950">
            Nenhum serviço vinculado.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
            {selectedServices.map((serv) => (
              <div key={serv.id} className="bg-slate-950/60 border border-slate-900 rounded-none p-3 flex justify-between items-center text-xs group">
                <div className="space-y-0.5 overflow-hidden">
                  <p className="font-semibold font-mono text-slate-200 truncate">{serv.name}</p>
                  <p className="text-slate-500 font-mono text-[10px]">
                    {serv.quantity} un • R$ {Number(serv.unit_price).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-slate-300 font-mono text-[10px]">
                    R$ {(serv.quantity * serv.unit_price).toFixed(2)}
                  </span>
                  <button type="button" onClick={() => handleRemoveService(serv.service_id)} className="text-slate-600 hover:text-rose-500 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-850 space-y-2.5 bg-slate-950/40 p-4 rounded-none border border-slate-900 font-mono">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Mão de Obra Geral:</span>
          <span className="font-semibold text-slate-200">R$ {parseFloat(serviceValue || '0').toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Serviços do Catálogo:</span>
          <span className="font-semibold text-slate-200">R$ {selectedServices.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Peças Utilizadas:</span>
          <span className="font-semibold text-slate-200">R$ {selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
        </div>
        <div className="h-px bg-slate-850 my-1" />
        {parseFloat(discount) > 0 && (
          <div className="flex justify-between items-center text-xs text-rose-455 font-bold">
            <span>Desconto Aplicado:</span>
            <span>- R$ {parseFloat(discount).toFixed(2)}</span>
          </div>
        )}
        <div className="h-px bg-slate-850 my-1" />
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-200 uppercase">VALOR TOTAL DO SERVIÇO:</span>
          <span className="text-base font-extrabold text-emerald-450 flex items-center">
            R$ {parseFloat(totalValue).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
