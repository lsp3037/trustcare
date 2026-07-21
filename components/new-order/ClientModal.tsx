'use client';

import React from 'react';
import { User, Wrench, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ClientModalProps {
  isNewClientModalOpen: boolean;
  setIsNewClientModalOpen: (open: boolean) => void;
  clientModalStep: number;
  setClientModalStep: (step: number) => void;
  clientModalError: string;
  setClientModalError: (err: string) => void;
  newClientType: string;
  setNewClientType: (type: string) => void;
  newClientName: string;
  setNewClientName: (name: string) => void;
  newClientDoc: string;
  setNewClientDoc: (doc: string) => void;
  newClientPhone: string;
  setNewClientPhone: (phone: string) => void;
  newClientEmail: string;
  setNewClientEmail: (email: string) => void;
  newEqName: string;
  setNewEqName: (name: string) => void;
  newEqBrand: string;
  setNewEqBrand: (brand: string) => void;
  newEqModel: string;
  setNewEqModel: (model: string) => void;
  newEqSerial: string;
  setNewEqSerial: (serial: string) => void;
  savingClient: boolean;
  handleSaveClient: (e: React.FormEvent) => void;
  handleNextStep: (e: React.MouseEvent) => void;
}

export function ClientModal({
  isNewClientModalOpen,
  setIsNewClientModalOpen,
  clientModalStep,
  setClientModalStep,
  clientModalError,
  setClientModalError,
  newClientType,
  setNewClientType,
  newClientName,
  setNewClientName,
  newClientDoc,
  setNewClientDoc,
  newClientPhone,
  setNewClientPhone,
  newClientEmail,
  setNewClientEmail,
  newEqName,
  setNewEqName,
  newEqBrand,
  setNewEqBrand,
  newEqModel,
  setNewEqModel,
  newEqSerial,
  setNewEqSerial,
  savingClient,
  handleSaveClient,
  handleNextStep,
}: ClientModalProps) {
  if (!isNewClientModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-none shadow-2xl overflow-hidden animate-in scale-in-95 duration-200">
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

        <div className="flex items-center justify-center gap-2 px-6 pt-4">
          <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${clientModalStep === 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${clientModalStep === 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
        </div>

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
                  onChange={(e) => setNewClientDoc(e.target.value)}
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
                    <LoadingSpinner />
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
  );
}
