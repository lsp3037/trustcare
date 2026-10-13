'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FileSignature, Sparkles, Wand2, Copy, FileText, Layers, Settings } from 'lucide-react';
import {
  Card,
  CardTitle,
  Skeleton,
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  useToast,
} from '@/components/ui';
import {
  ReportTemplate,
  getStoredTemplates,
  formatToTechnicalReport,
  formatReportedProblem,
} from '@/lib/utils/reportFormatter';
import { ReportTemplatesModal } from './ReportTemplatesModal';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <Skeleton className="h-32 w-full border border-border" />
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
}

export function TechnicalReportSection({
  reportedProblem, setReportedProblem,
  technicalReport, setTechnicalReport
}: TechnicalReportSectionProps) {
  const toast = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setTemplates(getStoredTemplates());
  }, []);

  const handleAutoFormat = () => {
    const source = technicalReport.trim() ? technicalReport : reportedProblem;
    if (!source.trim()) {
      const defaultContent = templates[0]?.content || '';
      if (defaultContent) {
        setTechnicalReport(defaultContent);
        toast.success('Modelo padrão de laudo inserido');
      }
      return;
    }

    const formatted = formatToTechnicalReport(source);
    setTechnicalReport(formatted);
    toast.success('Laudo formatado com sucesso');
  };

  const handleImportFromProblem = () => {
    if (!reportedProblem.trim()) {
      toast.warning('O campo Problema Relatado está vazio');
      return;
    }
    const formatted = formatToTechnicalReport(reportedProblem);
    setTechnicalReport(formatted);
    toast.success('Laudo estruturado a partir do Problema Relatado');
  };

  const handleApplyTemplate = (content: string, label: string) => {
    setTechnicalReport(content);
    toast.success(`Modelo "${label}" aplicado`);
  };

  const handleFormatProblem = () => {
    if (!reportedProblem.trim()) return;
    const formatted = formatReportedProblem(reportedProblem);
    setReportedProblem(formatted);
    toast.success('Problema relatado formatado');
  };

  return (
    <>
      <Card className="space-y-6">
        <CardTitle className="flex items-center gap-2 border-b border-border pb-3">
          <FileSignature className="w-5 h-5 text-text-subtle" aria-hidden /> Diagnóstico e Laudo
        </CardTitle>

        <div className="w-full max-w-full overflow-hidden break-words">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-text-muted">Problema Relatado / Defeito</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Wand2 className="w-3.5 h-3.5 text-text-subtle" />}
              onClick={handleFormatProblem}
              className="text-xs h-8 px-2.5 text-text-muted hover:text-text"
            >
              Formatar
            </Button>
          </div>
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
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Sparkles className="w-4 h-4 text-brand" />}
                onClick={handleAutoFormat}
                className="text-xs font-semibold"
              >
                Formatar Laudo
              </Button>

              <DropdownMenu
                label="Modelos de Laudo Técnico"
                trigger={
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface-sunken hover:bg-surface-overlay text-text-muted transition-colors cursor-pointer">
                    <Layers className="w-3.5 h-3.5 text-text-subtle" />
                    Modelos
                  </span>
                }
              >
                <DropdownMenuItem
                  icon={<Sparkles className="w-4 h-4 text-brand" />}
                  onSelect={handleAutoFormat}
                >
                  Auto-formatar Texto Atual
                </DropdownMenuItem>

                <DropdownMenuItem
                  icon={<Copy className="w-4 h-4 text-info" />}
                  onSelect={handleImportFromProblem}
                >
                  Importar do Problema Relatado
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {templates.map((tpl) => (
                  <DropdownMenuItem
                    key={tpl.id}
                    icon={<FileText className="w-4 h-4 text-text-subtle" />}
                    onSelect={() => handleApplyTemplate(tpl.content, tpl.label)}
                  >
                    {tpl.label}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  icon={<Settings className="w-4 h-4 text-brand" />}
                  onSelect={() => setIsModalOpen(true)}
                >
                  ⚙️ Gerenciar / Editar Modelos...
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>

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

      <ReportTemplatesModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        onTemplatesUpdated={() => setTemplates(getStoredTemplates())}
      />
    </>
  );
}
