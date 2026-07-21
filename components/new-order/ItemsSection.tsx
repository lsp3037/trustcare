'use client';

import React from 'react';
import { Boxes, Wrench, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface ItemsSectionProps {
  inventory: any[];
  currentProductId: string;
  setCurrentProductId: (id: string) => void;
  setIsNewProductModalOpen: (open: boolean) => void;
  currentProductQty: string;
  setCurrentProductQty: (qty: string) => void;
  productAddError: string;
  setProductAddError: (err: string) => void;
  handleAddProduct: () => void;
  selectedProducts: any[];
  handleRemoveProduct: (id: string) => void;
  availableServices: any[];
  currentServiceId: string;
  handleServiceSelect: (id: string) => void;
  currentServiceQty: string;
  setCurrentServiceQty: (qty: string) => void;
  currentServicePrice: string;
  setCurrentServicePrice: (price: string) => void;
  handleAddService: () => void;
  selectedServices: any[];
  handleRemoveService: (id: string) => void;
}

export function ItemsSection({
  inventory,
  currentProductId, setCurrentProductId,
  setIsNewProductModalOpen,
  currentProductQty, setCurrentProductQty,
  productAddError, setProductAddError,
  handleAddProduct,
  selectedProducts,
  handleRemoveProduct,
  availableServices,
  currentServiceId,
  handleServiceSelect,
  currentServiceQty, setCurrentServiceQty,
  currentServicePrice, setCurrentServicePrice,
  handleAddService,
  selectedServices,
  handleRemoveService,
}: ItemsSectionProps) {
  return (
    <>
      {/* Seção de Peças e Produtos Utilizados */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-none p-5 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
          <Boxes className="w-4 h-4 text-indigo-400" /> Peças e Peças de Reposição Utilizadas
        </h3>

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
    </>
  );
}
