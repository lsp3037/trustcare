'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { FileSignature, Sparkles } from 'lucide-react';
import { Button, Card, CardTitle } from '@/components/ui';
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

const formats = ['bold', 'italic', 'underline', 'list', 'align'];

interface TechnicalReportSectionProps {
  reportedProblem: string;
  setReportedProblem: (v: string) => void;
  technicalReport: string;
  setTechnicalReport: (v: string) => void;
  /** Formata as anotações do laudo no padrão Trust Care (via IA). */
  onFormatReport?: () => void;
  formattingReport?: boolean;
  formatDisabled?: boolean;
}

export function TechnicalReportSection({
  reportedProblem, setReportedProblem,
  technicalReport, setTechnicalReport,
  onFormatReport, formattingReport = false, formatDisabled = false
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium text-text-muted">Laudo Técnico / Serviço Realizado</p>
          {onFormatReport && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles className="w-4 h-4" aria-hidden />}
              loading={formattingReport}
              disabled={formatDisabled}
              onClick={onFormatReport}
              title="Transforma suas anotações no laudo padrão (Diagnóstico, Serviços orçados, Total, Garantia, Prazo e Privacidade)"
            >
              {formattingReport ? 'Formatando...' : 'Formatar laudo'}
            </Button>
          )}
        </div>
        <ReactQuill
          theme="snow"
          modules={modules}
          formats={formats}
          value={technicalReport}
          onChange={setTechnicalReport}
          placeholder="Anote do seu jeito (ex.: tela quebrada, dobradiça solta, bateria 1h no YouTube, placa e vídeo ok no HDMI) e clique em Formatar laudo..."
          className="prose prose-invert max-w-none text-sm"
        />
      </div>
    </Card>
  );
}
