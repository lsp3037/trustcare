'use client';
import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Check, } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ChecklistTemplateItem, OrderChecklist, ChecklistItem } from './types';

interface ChecklistItemRowProps {
  label: string;
  field: string;
  checklist: OrderChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<OrderChecklist>>;
  disabled?: boolean;
  color?: 'emerald' | 'sky';
}

const ChecklistItemRow = ({ label, field, checklist, setChecklist, disabled = false, color = 'emerald' }: ChecklistItemRowProps) => {
  const item = (checklist[field] || { checked: false, observation: '' }) as ChecklistItem;
  const activeBg = color === 'emerald' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-sky-950/40 border-sky-500';
  const knobColor = color === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500';

  return (
    <div className="group border-b border-zinc-800/80 pb-3 last:border-0">
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors pr-2 leading-relaxed break-words">
          {label}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setChecklist(prev => ({
            ...prev,
            [field]: { ...(prev[field] || { checked: false, observation: '' }), checked: !(prev[field] || { checked: false, observation: '' }).checked }
          }))}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-none border transition-colors duration-150 p-0.5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${item.checked ? activeBg : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
        >
          <span className={`pointer-events-none inline-block h-full w-4 transform rounded-none transition-transform duration-150 ${item.checked ? `translate-x-5 ${knobColor}` : 'translate-x-0 bg-zinc-800'}`} />
        </button>
      </div>
      {(item.checked || item.observation.trim() !== '') && (
        <div className="mt-2 pl-1">
          <input
            type="text"
            disabled={disabled}
            placeholder={`[Nota: ${label.toLowerCase()}]`}
            value={item.observation}
            onChange={(e) => setChecklist(prev => ({
              ...prev,
              [field]: { ...(prev[field] || { checked: false, observation: '' }), observation: e.target.value }
            }))}
            className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-700 px-1 py-0.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none transition-colors font-mono"
          />
        </div>
      )}
    </div>
  );
};

interface ChecklistSectionProps {
  status: string;
  checklistTemplateItems: ChecklistTemplateItem[];
  entryChecklist: OrderChecklist;
  setEntryChecklist: React.Dispatch<React.SetStateAction<OrderChecklist>>;
  exitChecklist: OrderChecklist;
  setExitChecklist: React.Dispatch<React.SetStateAction<OrderChecklist>>;
  handleSaveChecklists: (type: 'entry' | 'exit') => Promise<void>;
  savingChecklist: boolean;
}

export function ChecklistSection({
  status,
  checklistTemplateItems,
  entryChecklist,
  setEntryChecklist,
  exitChecklist,
  setExitChecklist,
  handleSaveChecklists,
  savingChecklist
}: ChecklistSectionProps) {
  const [isEntryOpen, setIsEntryOpen] = useState(true);
  const [isExitOpen, setIsExitOpen] = useState(true);

  return (
    <div className="mt-8 space-y-4 lg:col-span-3">
      <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
        <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Checklist e Condições
      </h2>
      <div className={`grid grid-cols-1 ${status === 'Finalizado' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-8`}>
        {/* Bloco de Entrada */}
        <div className="bg-zinc-950 border-2 border-zinc-900 rounded-none p-6 shadow-2xl flex flex-col h-fit">
          <div 
            onClick={() => setIsEntryOpen(!isEntryOpen)}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900 mb-6 cursor-pointer select-none group/header"
          >
            <div>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">Fase de Recebimento</span>
              <h3 className="text-sm font-bold font-mono text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" /> Entrada
              </h3>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-1 uppercase tracking-wider rounded-none">
                Preenchimento Inicial
              </span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover/header:text-zinc-300 transition-transform duration-150 ${isEntryOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
          
          {isEntryOpen && (
            <>
              <div className="flex-1 space-y-4">
                {checklistTemplateItems.map((item) => (
                  <ChecklistItemRow key={item.id} label={item.label} field={item.id} checklist={entryChecklist} setChecklist={setEntryChecklist} />
                ))}
                
                <div className="pt-4 border-t border-zinc-900">
                  <div className="grid grid-cols-[1fr_auto] gap-4 items-center mb-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Possui Senha / PIN?</span>
                    <button
                      type="button"
                      onClick={() => setEntryChecklist(prev => ({ ...prev, password_pin: { ...prev.password_pin, has_password: !prev.password_pin.has_password } }))}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-none border transition-colors duration-150 p-0.5 focus:outline-none ${entryChecklist.password_pin.has_password ? 'bg-emerald-950 border-emerald-500' : 'bg-zinc-950 border-zinc-800'}`}
                    >
                      <span className={`pointer-events-none inline-block h-full w-4 transform rounded-none transition-transform duration-150 ${entryChecklist.password_pin.has_password ? 'translate-x-5 bg-emerald-500' : 'translate-x-0 bg-zinc-800'}`} />
                    </button>
                  </div>
                  {entryChecklist.password_pin.has_password && (
                    <input
                      type="text"
                      placeholder="[Senha do Equipamento]"
                      value={entryChecklist.password_pin.password_value}
                      onChange={(e) => setEntryChecklist(prev => ({ ...prev, password_pin: { ...prev.password_pin, password_value: e.target.value } }))}
                      className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-650 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none transition-colors font-mono"
                    />
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-900">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">Observações Gerais (Entrada)</span>
                  <textarea
                    rows={2}
                    placeholder="[Observações adicionais de recebimento]"
                    value={entryChecklist.general_notes}
                    onChange={(e) => setEntryChecklist(prev => ({ ...prev, general_notes: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-none px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors resize-none font-mono"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => handleSaveChecklists('entry')}
                  disabled={savingChecklist}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-900 text-black font-bold uppercase tracking-wider text-xs py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-none border-b-4 border-emerald-800 hover:border-emerald-500 active:border-b-0 active:translate-y-[2px]"
                >
                  {savingChecklist ? <LoadingSpinner className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                  <span>Salvar Checklist de Entrada</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bloco de Saída (Entrega) */}
        {status === 'Finalizado' && (
          <div className="border-2 p-6 shadow-2xl flex flex-col h-fit rounded-none bg-zinc-950 border-zinc-900">
            <div 
              onClick={() => setIsExitOpen(!isExitOpen)}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900 mb-6 cursor-pointer select-none group/header"
            >
              <div>
                <span className="text-[9px] font-mono text-zinc-650 uppercase tracking-widest block mb-0.5">Fase de Entrega</span>
                <h3 className="text-sm font-bold font-mono text-sky-500 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-sky-500 animate-pulse" /> Saída
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExitChecklist(JSON.parse(JSON.stringify(entryChecklist)));
                  }}
                  className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1 uppercase tracking-wider cursor-pointer transition-colors rounded-none"
                  title="Copiar as condições registradas na Entrada"
                >
                  Copiar da Entrada
                </button>
                <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-450 px-2 py-1 uppercase tracking-wider rounded-none">
                  Revisão Final
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover/header:text-zinc-300 transition-transform duration-150 ${isExitOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            {isExitOpen && (
              <>
                <div className="flex-1 space-y-4">
                  {checklistTemplateItems.map((item) => (
                    <ChecklistItemRow key={item.id} label={item.label} field={item.id} checklist={exitChecklist} setChecklist={setExitChecklist} disabled={false} color="sky" />
                  ))}
                  
                  <div className="pt-4 border-t border-zinc-900">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">Observações Gerais (Saída)</span>
                    <textarea
                      rows={2}
                      placeholder="[Observações adicionais de entrega]"
                      value={exitChecklist.general_notes}
                      onChange={(e) => setExitChecklist(prev => ({ ...prev, general_notes: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-none px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors resize-none font-mono"
                    />
                  </div>
                </div>
   
                <div className="mt-6 pt-6 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => handleSaveChecklists('exit')}
                    disabled={savingChecklist}
                    className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-900 text-black font-bold uppercase tracking-wider text-xs py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-none border-b-4 border-sky-800 hover:border-sky-500 active:border-b-0 active:translate-y-[2px]"
                  >
                    {savingChecklist ? <LoadingSpinner className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                    <span>Salvar Checklist de Saída</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
