'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardTitle, Field, Input, Select } from '@/components/ui';
import { OS_STATUS_FLOW } from '@/lib/design/status';
import { Sliders, FileText } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-32 w-full animate-pulse bg-surface-sunken border border-border rounded-xl" />,
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
  /** When true, only renders the Status/Assignment card (hides the Quill editor card) */
  hideQuill?: boolean;
  /** When true, only renders the Quill editor card (hides the Status/Assignment card) */
  quillOnly?: boolean;
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
  hideQuill = false,
  quillOnly = false,
}: ProblemSectionProps) {
  return (
    <div className="space-y-6">
      {/* Bloco de Status, Atribuição e Prazo */}
      {!quillOnly && (
        <Card padding="md" className="space-y-4">
          <CardTitle className="flex items-center gap-2 border-b border-border pb-2">
            <Sliders className="w-4 h-4 text-brand" aria-hidden /> Status, Atribuição e Prazo
          </CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </Card>
      )}

      {/* Bloco do Problema Relatado — renderizado à parte para ter largura total */}
      {!hideQuill && (
        <Card padding="md" className="space-y-4">
          <CardTitle className="flex items-center gap-2 border-b border-border pb-2">
            <FileText className="w-4 h-4 text-brand" aria-hidden /> Problema Relatado / Sintomas
          </CardTitle>

          <Field>
            <ReactQuill
              theme="snow"
              modules={modules}
              formats={formats}
              value={reportedProblem}
              onChange={setReportedProblem}
              placeholder="Descreva o problema relatado..."
            />
          </Field>
        </Card>
      )}
    </div>
  );
}
