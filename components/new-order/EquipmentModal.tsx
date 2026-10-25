'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, FolderPlus, Save } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from '@/components/ui';

export interface NewEquipmentPayload {
  name: string;
  category_id: string | null;
  brand: string;
  model: string;
  serial_number: string;
  processor: string | null;
  ram: string | null;
  storage: string | null;
  gpu_type: string | null;
  gpu_model: string | null;
}

interface EquipmentModalProps {
  open: boolean;
  /** Nome do cliente já selecionado na OS, só para contextualizar o modal. */
  clientName?: string;
  categories: { id: string; name: string }[];
  saving: boolean;
  errorMsg?: string;
  onClose: () => void;
  onSubmit: (payload: NewEquipmentPayload) => void;
  /** Cria a categoria no tenant e devolve o registro criado. */
  onCreateCategory: (name: string) => Promise<{ id: string; name: string } | null>;
}

const EMPTY = {
  name: '',
  categoryId: '',
  brand: '',
  model: '',
  serial: '',
  processor: '',
  ram: '',
  storage: '',
  gpuType: '',
  gpuModel: '',
};

/**
 * Cadastro completo de um equipamento sem sair da OS. O formulário anterior só
 * aceitava texto livre em "Digitar manualmente", o que deixava o aparelho sem
 * categoria — e sem categoria o checklist de entrada não existe.
 */
export function EquipmentModal({
  open,
  clientName,
  categories,
  saving,
  errorMsg,
  onClose,
  onSubmit,
  onCreateCategory,
}: EquipmentModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Cada abertura começa de um formulário limpo, sem herdar rascunho anterior.
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setCategoryError('');
    }
  }, [open]);

  const set = <K extends keyof typeof EMPTY>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setIsCreatingCategory(false);
      return;
    }

    setCategoryError('');
    const created = await onCreateCategory(name);
    if (!created) {
      setCategoryError('Não foi possível criar a categoria.');
      return;
    }

    set('categoryId', created.id);
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    onSubmit({
      name: form.name.trim(),
      category_id: form.categoryId || null,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serial_number: form.serial.trim(),
      processor: form.processor.trim() || null,
      ram: form.ram.trim() || null,
      storage: form.storage.trim() || null,
      gpu_type: form.gpuType || null,
      gpu_model: form.gpuType === 'dedicada' ? form.gpuModel.trim() || null : null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo Equipamento"
      description={
        clientName
          ? `Cadastro vinculado a ${clientName}. A categoria define o checklist de entrada da OS.`
          : 'Cadastro completo do aparelho, com categoria e configuração de hardware.'
      }
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="new-equipment-form"
            loading={saving}
            icon={<Save className="w-3.5 h-3.5" aria-hidden />}
          >
            Salvar Equipamento
          </Button>
        </>
      }
    >
      <form id="new-equipment-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <p
            role="alert"
            className="text-small text-danger bg-danger/10 border border-danger/25 rounded-xl px-3 py-2"
          >
            {errorMsg}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Identificação / Nome"
            required
            autoFocus
            placeholder="Ex: Notebook do Cliente"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />

          <Field label="Categoria" hint="Usada para escolher o checklist da OS.">
            <div className="flex gap-2">
              <Select
                aria-label="Categoria do equipamento"
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                wrapperClassName="flex-1"
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="px-3 shrink-0"
                onClick={() => setIsCreatingCategory((v) => !v)}
                title="Nova categoria"
                aria-label="Criar nova categoria"
                aria-expanded={isCreatingCategory}
              >
                <FolderPlus className="w-4 h-4" aria-hidden />
              </Button>
            </div>
          </Field>

          {isCreatingCategory && (
            <div className="sm:col-span-2">
              <Field label="Nova categoria" error={categoryError || undefined}>
                <div className="flex gap-2">
                  <Input
                    aria-label="Nome da nova categoria"
                    placeholder="Ex: Notebook"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    wrapperClassName="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      // Enter aqui salvaria o equipamento inteiro; a categoria é
                      // um sub-fluxo próprio.
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleCreateCategory}>
                    Criar
                  </Button>
                </div>
              </Field>
            </div>
          )}

          <Input
            label="Marca"
            placeholder="Ex: Dell"
            value={form.brand}
            onChange={(e) => set('brand', e.target.value)}
          />
          <Input
            label="Modelo"
            placeholder="Ex: Latitude 3420"
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
          />

          <Input
            label="Nº de Série / Tag"
            wrapperClassName="sm:col-span-2"
            placeholder="Ex: PE091728"
            className="font-mono"
            value={form.serial}
            onChange={(e) => set('serial', e.target.value)}
          />
        </div>

        <details className="group rounded-xl border border-border/80 bg-surface-subtle/40 p-3.5">
          <summary className="flex items-center justify-between cursor-pointer list-none select-none">
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-text-subtle" aria-hidden />
              <span className="text-small font-medium text-text">Configuração da Máquina</span>
            </span>
            <span className="text-caption text-brand group-open:hidden">
              + Preencher (opcional)
            </span>
            <span className="text-caption text-text-subtle hidden group-open:inline">Recolher</span>
          </summary>

          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Processador (CPU)"
                placeholder="Ex: Core i5-1135G7"
                value={form.processor}
                onChange={(e) => set('processor', e.target.value)}
              />
              <Input
                label="Memória RAM"
                placeholder="Ex: 16 GB DDR4"
                value={form.ram}
                onChange={(e) => set('ram', e.target.value)}
              />
              <Input
                label="Armazenamento"
                placeholder="Ex: SSD 512 GB NVMe"
                value={form.storage}
                onChange={(e) => set('storage', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Placa de Vídeo"
                aria-label="Tipo de placa de vídeo"
                value={form.gpuType}
                onChange={(e) => {
                  const value = e.target.value;
                  set('gpuType', value);
                  if (!value) set('gpuModel', '');
                }}
              >
                <option value="">Não informado</option>
                <option value="integrada">Integrada (Onboard)</option>
                <option value="dedicada">Dedicada (Offboard)</option>
              </Select>

              {form.gpuType === 'dedicada' && (
                <Input
                  label="Modelo da GPU"
                  placeholder="Ex: NVIDIA RTX 3060 6GB"
                  value={form.gpuModel}
                  onChange={(e) => set('gpuModel', e.target.value)}
                />
              )}
            </div>
          </div>
        </details>
      </form>
    </Modal>
  );
}
