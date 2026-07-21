'use client';

import React from 'react';
import { User, Calendar, DollarSign, Tag } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

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

interface ProblemSectionProps {
  status: string;
  setStatus: (status: string) => void;
  priority: string;
  setPriority: (priority: string) => void;
  technicianId: string;
  setTechnicianId: (id: string) => void;
  technicians: any[];
  deliveryPrediction: string;
  setDeliveryPrediction: (date: string) => void;
  serviceValue: string;
  setServiceValue: (val: string) => void;
  discount: string;
  setDiscount: (val: string) => void;
  reportedProblem: string;
  setReportedProblem: (val: string) => void;
}

export function ProblemSection({
  status, setStatus,
  priority, setPriority,
  technicianId, setTechnicianId,
  technicians,
  deliveryPrediction, setDeliveryPrediction,
  serviceValue, setServiceValue,
  discount, setDiscount,
  reportedProblem, setReportedProblem,
}: ProblemSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status e Prioridade */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Status & Prioridade</h3>
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
    </>
  );
}
