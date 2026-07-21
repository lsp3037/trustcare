'use client';

import React from 'react';
import { Boxes, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProductModalProps {
  isNewProductModalOpen: boolean;
  setIsNewProductModalOpen: (open: boolean) => void;
  productModalError: string;
  newProdName: string;
  setNewProdName: (name: string) => void;
  newProdCategory: string;
  setNewProdCategory: (cat: string) => void;
  newProdBrand: string;
  setNewProdBrand: (brand: string) => void;
  newProdCapacity: string;
  setNewProdCapacity: (cap: string) => void;
  newProdSsdTech: string;
  setNewProdSsdTech: (tech: string) => void;
  newProdSsdGb: string;
  setNewProdSsdGb: (gb: string) => void;
  newProdRamApp: string;
  setNewProdRamApp: (app: string) => void;
  newProdRamTech: string;
  setNewProdRamTech: (tech: string) => void;
  newProdRamSpeed: string;
  setNewProdRamSpeed: (speed: string) => void;
  newProdRamGb: string;
  setNewProdRamGb: (gb: string) => void;
  newProdSalePrice: string;
  setNewProdSalePrice: (price: string) => void;
  newProdQty: string;
  setNewProdQty: (qty: string) => void;
  savingProduct: boolean;
  handleSaveProduct: (e: React.FormEvent) => void;
}

export function ProductModal({
  isNewProductModalOpen,
  setIsNewProductModalOpen,
  productModalError,
  newProdName, setNewProdName,
  newProdCategory, setNewProdCategory,
  newProdBrand, setNewProdBrand,
  newProdCapacity, setNewProdCapacity,
  newProdSsdTech, setNewProdSsdTech,
  newProdSsdGb, setNewProdSsdGb,
  newProdRamApp, setNewProdRamApp,
  newProdRamTech, setNewProdRamTech,
  newProdRamSpeed, setNewProdRamSpeed,
  newProdRamGb, setNewProdRamGb,
  newProdSalePrice, setNewProdSalePrice,
  newProdQty, setNewProdQty,
  savingProduct,
  handleSaveProduct,
}: ProductModalProps) {
  if (!isNewProductModalOpen) return null;

  return (
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
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Categoria *</label>
              <select
                value={newProdCategory}
                onChange={(e) => {
                  setNewProdCategory(e.target.value);
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
                <LoadingSpinner />
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
  );
}
