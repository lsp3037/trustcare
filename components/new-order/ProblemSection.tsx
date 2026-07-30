'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Field, Input, Select } from '@/components/ui';
import { OS_STATUS_FLOW } from '@/lib/design/status';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-32 w-full animate-pulse bg-surface-sunken border border-border" />,
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

/** Título de bloco do formulário. Eram 3 cópias da mesma classe. */
function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-h3 text-text border-b border-border pb-2">{children}</h3>
  );
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
          <BlockTitle>Status &amp; Prioridade</BlockTitle>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {OS_STATUS_FLOW.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>

            <Select label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </Select>
          </div>
        </div>

        {/* Técnico, Previsão e Valores */}
        <div className="space-y-4">
          <BlockTitle>Atribuição e Prazo</BlockTitle>

          <Select
            label="Técnico Responsável"
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
          >
            <option value="">Não atribuído</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>

          <Input
            label="Previsão de Entrega"
            type="date"
            value={deliveryPrediction}
            onChange={(e) => setDeliveryPrediction(e.target.value)}
            className="font-mono"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mão de Obra (R$)"
              type="number"
              step="0.01"
              min="0"
              value={serviceValue}
              onChange={(e) => setServiceValue(e.target.value)}
              className="font-mono tabular-nums"
            />
            <Input
              label="Desconto (R$)"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Problema Relatado */}
      <Field label="Problema Relatado / Sintomas">
        <ReactQuill
          theme="snow"
          modules={modules}
          formats={formats}
          value={reportedProblem}
          onChange={setReportedProblem}
          placeholder="Descreva o problema relatado..."
        />
      </Field>
    </>
  );
}
