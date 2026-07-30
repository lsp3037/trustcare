'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { FileSignature } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-32 w-full animate-pulse bg-surface-sunken border border-border" />
});

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean']
  ]
};

const formats = ['bold', 'italic', 'underline', 'list', 'bullet', 'align'];

interface TechnicalReportSectionProps {
  reportedProblem: string;
  setReportedProblem: (v: string) => void;
  technicalReport: string;
  setTechnicalReport: (v: string) => void;
}

export function TechnicalReportSection({
  reportedProblem, setReportedProblem,
  technicalReport, setTechnicalReport
}: TechnicalReportSectionProps) {
  return (
    <Card className="space-y-6">
      <CardTitle className="flex items-center gap-2 border-b border-border pb-3">
        <FileSignature className="w-5 h-5 text-text-subtle" aria-hidden /> Diagnóstico e Laudo
      </CardTitle>

      <div className="w-full max-w-full overflow-hidden break-words">
        <p className="text-sm font-medium text-text-muted mb-1.5">Problema Relatado / Defeito</p>
        <ReactQuill
          theme="snow"
          value={reportedProblem}
          onChange={setReportedProblem}
          modules={modules}
          formats={formats}
          className="prose prose-invert max-w-none text-sm"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-text-muted mb-1.5">Laudo Técnico / Serviço Realizado</p>
        <ReactQuill
          theme="snow"
          modules={modules}
          formats={formats}
          value={technicalReport}
          onChange={setTechnicalReport}
          placeholder="Insira as observações técnicas detalhadas, testes executados e solução encontrada..."
          className="prose prose-invert max-w-none text-sm"
        />
      </div>
    </Card>
  );
}
