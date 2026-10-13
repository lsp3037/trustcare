'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Modal,
  Button,
  Field,
  Input,
  Skeleton,
  useToast,
  useConfirm,
} from '@/components/ui';
import {
  ReportTemplate,
  getStoredTemplates,
  saveStoredTemplates,
  resetStoredTemplates,
} from '@/lib/utils/reportFormatter';
import {
  Plus,
  Trash2,
  RotateCcw,
  Check,
  FileText,
  Sparkles,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <Skeleton className="h-44 w-full border border-border" />,
});

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['clean'],
  ],
};

const formats = ['bold', 'italic', 'underline', 'list', 'align'];

interface ReportTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onApplyTemplate?: (content: string, label: string) => void;
  onTemplatesUpdated?: () => void;
}

export function ReportTemplatesModal({
  open,
  onClose,
  onApplyTemplate,
  onTemplatesUpdated,
}: ReportTemplatesModalProps) {
  const toast = useToast();
  const confirm = useConfirm();

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [editingDesc, setEditingDesc] = useState<string>('');
  const [editingContent, setEditingContent] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const selectTemplate = (tpl: ReportTemplate) => {
    setSelectedId(tpl.id);
    setEditingLabel(tpl.label);
    setEditingDesc(tpl.description || '');
    setEditingContent(tpl.content);
    setIsCreatingNew(false);
  };

  const startNewTemplate = () => {
    setSelectedId(`custom_${Date.now()}`);
    setEditingLabel('Novo Modelo de Laudo');
    setEditingDesc('Descrição do novo modelo');
    setEditingContent('<p><strong>1. DIAGNÓSTICO:</strong></p><p>Insira os detalhes do diagnóstico...</p>');
    setIsCreatingNew(true);
  };

  // Carrega templates ao abrir o modal
  useEffect(() => {
    if (open) {
      const loaded = getStoredTemplates();
      setTemplates(loaded);
      if (loaded.length > 0) {
        selectTemplate(loaded[0]);
      } else {
        startNewTemplate();
      }
    }
  }, [open]);

  const handleSave = () => {
    if (!editingLabel.trim()) {
      toast.warning('O modelo precisa de um nome.');
      return;
    }

    let updated: ReportTemplate[];
    if (isCreatingNew) {
      const newTpl: ReportTemplate = {
        id: selectedId,
        label: editingLabel.trim(),
        description: editingDesc.trim(),
        content: editingContent,
      };
      updated = [...templates, newTpl];
      setIsCreatingNew(false);
    } else {
      updated = templates.map((t) =>
        t.id === selectedId
          ? {
              ...t,
              label: editingLabel.trim(),
              description: editingDesc.trim(),
              content: editingContent,
            }
          : t
      );
    }

    setTemplates(updated);
    saveStoredTemplates(updated);
    toast.success('Modelo salvo com sucesso!');
    onTemplatesUpdated?.();
  };

  const handleDelete = async () => {
    if (templates.length <= 1) {
      toast.warning('É necessário manter pelo menos um modelo cadastrado.');
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir Modelo',
      description: `Tem certeza que deseja remover o modelo "${editingLabel}"?`,
      confirmLabel: 'Excluir',
      destructive: true,
    });

    if (!confirmed) return;

    const updated = templates.filter((t) => t.id !== selectedId);
    setTemplates(updated);
    saveStoredTemplates(updated);
    toast.success('Modelo removido.');
    onTemplatesUpdated?.();

    if (updated.length > 0) {
      selectTemplate(updated[0]);
    } else {
      startNewTemplate();
    }
  };

  const handleResetDefaults = async () => {
    const confirmed = await confirm({
      title: 'Restaurar Modelos Padrão',
      description: 'Isso irá restaurar os 3 modelos originais de fábrica do Trust Care. Deseja continuar?',
      confirmLabel: 'Restaurar',
      destructive: false,
    });

    if (!confirmed) return;

    const defaults = resetStoredTemplates();
    setTemplates(defaults);
    selectTemplate(defaults[0]);
    toast.success('Modelos padrão restaurados!');
    onTemplatesUpdated?.();
  };

  const handleApply = () => {
    if (onApplyTemplate) {
      onApplyTemplate(editingContent, editingLabel);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Gerenciar Modelos de Laudo Técnico"
      description="Customize os textos, diagnósticos e termos padrão utilizados nos laudos da sua assistência."
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="w-4 h-4 text-text-subtle" />}
            onClick={handleResetDefaults}
          >
            Restaurar Padrões
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            {onApplyTemplate && (
              <Button
                type="button"
                variant="primary"
                icon={<Check className="w-4 h-4" />}
                onClick={handleApply}
              >
                Aplicar no Laudo
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        {/* Painel Esquerdo: Lista de Modelos */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-text-subtle uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Seus Modelos ({templates.length})
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5 text-brand" />}
              onClick={startNewTemplate}
              className="text-caption h-7 px-2"
            >
              Novo
            </Button>
          </div>

          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {templates.map((tpl) => {
              const isSelected = tpl.id === selectedId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => selectTemplate(tpl)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-0.5',
                    isSelected
                      ? 'bg-brand/10 border-brand text-text shadow-sm'
                      : 'bg-surface-sunken/50 border-border hover:bg-surface-overlay text-text-muted hover:text-text'
                  )}
                >
                  <span className="text-sm font-semibold truncate flex items-center gap-1.5">
                    <FileText
                      className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        isSelected ? 'text-brand' : 'text-text-subtle'
                      )}
                    />
                    {tpl.label}
                  </span>
                  {tpl.description && (
                    <span className="text-caption text-text-subtle line-clamp-1">
                      {tpl.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Direito: Edição do Modelo Selecionado */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-sm font-bold text-text">
                {isCreatingNew ? 'Novo Modelo' : 'Editar Modelo'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isCreatingNew && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="w-4 h-4 text-danger" />}
                  onClick={handleDelete}
                  title="Excluir este modelo"
                  className="text-danger hover:bg-danger/10 h-8"
                >
                  Excluir
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Check className="w-4 h-4 text-brand" />}
                onClick={handleSave}
                className="h-8 text-caption font-semibold"
              >
                Salvar Modelo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome do Modelo">
              <Input
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                placeholder="Ex: Troca de Tela / Display"
                className="text-sm"
              />
            </Field>

            <Field label="Breve Descrição / Finalidade">
              <Input
                value={editingDesc}
                onChange={(e) => setEditingDesc(e.target.value)}
                placeholder="Ex: Usado para troca de telas e flats"
                className="text-sm"
              />
            </Field>
          </div>

          <Field label="Conteúdo Formatado do Laudo">
            <div className="border border-border rounded-lg overflow-hidden bg-surface-sunken">
              <ReactQuill
                theme="snow"
                value={editingContent}
                onChange={setEditingContent}
                modules={modules}
                formats={formats}
                className="prose prose-invert max-w-none text-sm min-h-[160px]"
              />
            </div>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
