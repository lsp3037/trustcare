'use client';

import React, { useState } from 'react';
import { User, Wrench, AlertTriangle, CheckCircle2, Cpu, FolderPlus } from 'lucide-react';
import { Modal, Button, Field, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

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
  categories?: { id: string; name: string }[];
  newEqCategoryId?: string;
  setNewEqCategoryId?: (id: string) => void;
  onCreateCategory?: (name: string) => Promise<{ id: string; name: string } | null>;
  newEqProcessor?: string;
  setNewEqProcessor?: (val: string) => void;
  newEqRam?: string;
  setNewEqRam?: (val: string) => void;
  newEqStorage?: string;
  setNewEqStorage?: (val: string) => void;
  newEqGpuType?: string;
  setNewEqGpuType?: (val: string) => void;
  newEqGpuModel?: string;
  setNewEqGpuModel?: (val: string) => void;
  savingClient: boolean;
  handleSaveClient: (e: React.FormEvent) => void;
  handleNextStep: (e: React.MouseEvent) => void;
}

/** Rótulo do passo atual, dentro do corpo do modal. */
function StepHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="text-caption uppercase tracking-wider text-brand flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" aria-hidden /> {children}
    </h3>
  );
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
  categories = [],
  newEqCategoryId = '',
  setNewEqCategoryId,
  onCreateCategory,
  newEqProcessor = '',
  setNewEqProcessor,
  newEqRam = '',
  setNewEqRam,
  newEqStorage = '',
  setNewEqStorage,
  newEqGpuType = '',
  setNewEqGpuType,
  newEqGpuModel = '',
  setNewEqGpuModel,
  savingClient,
  handleSaveClient,
  handleNextStep,
}: ClientModalProps) {
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const close = () => {
    setIsNewClientModalOpen(false);
    setClientModalStep(1);
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setCategoryError('');
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setIsCreatingCategory(false);
      return;
    }
    if (!onCreateCategory) return;

    setCategoryError('');
    const created = await onCreateCategory(name);
    if (!created) {
      setCategoryError('Não foi possível criar a categoria.');
      return;
    }

    if (setNewEqCategoryId) setNewEqCategoryId(created.id);
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  return (
    <Modal
      open={isNewClientModalOpen}
      onClose={close}
      title="Cadastrar Novo Cliente"
      description={`Passo ${clientModalStep} de 2`}
      size="md"
      footer={
        clientModalStep === 1 ? (
          <>
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button onClick={handleNextStep}>Salvar e Adicionar Equipamento</Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setClientModalError('');
                setClientModalStep(1);
              }}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              form="new-client-form"
              loading={savingClient}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Salvar e Concluir
            </Button>
          </>
        )
      }
    >
      {/* Indicador de progresso */}
      <div className="flex items-center gap-2 mb-5" role="presentation">
        {[1, 2].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1.5 flex-1 transition-colors',
              clientModalStep === step ? 'bg-brand' : 'bg-border',
            )}
          />
        ))}
      </div>

      {clientModalError && (
        <p
          role="alert"
          className="mb-4 p-3 bg-danger/10 border border-danger/25 text-danger text-small flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          <span>{clientModalError}</span>
        </p>
      )}

      {/*
        Só o passo ativo é renderizado. Antes os dois viviam num carrossel
        de 200% de largura, então os campos do passo oculto continuavam
        focáveis por Tab, fora da tela.
      */}
      <form id="new-client-form" onSubmit={handleSaveClient} className="space-y-4">
        {clientModalStep === 1 ? (
          <>
            <StepHeading icon={User}>Passo 1: Informações Básicas</StepHeading>

            <Field label="Tipo de Cliente">
              <div className="flex gap-4 pt-1">
                {[
                  { value: 'PF', label: 'Pessoa Física' },
                  { value: 'PJ', label: 'Pessoa Jurídica' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-small text-text cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="clientType"
                      value={opt.value}
                      checked={newClientType === opt.value}
                      onChange={() => setNewClientType(opt.value)}
                      className="accent-brand"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Field>

            <Input
              label="Nome / Razão Social"
              required
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Ex: João da Silva ou Tech Corp Ltda"
            />

            <Input
              label="CPF / CNPJ"
              type="text"
              maxLength={18}
              value={newClientDoc}
              onChange={(e) => setNewClientDoc(e.target.value)}
              placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
              className="font-mono"
            />

            <Input
              label="Telefone / WhatsApp"
              type="text"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="Ex: (11) 99999-9999"
              className="font-mono"
            />

            <Input
              label="E-mail"
              type="email"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              placeholder="Ex: cliente@email.com"
            />
          </>
        ) : (
          <>
            <StepHeading icon={Wrench}>Passo 2: Equipamento Inicial</StepHeading>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nome do Equipamento"
                required
                type="text"
                value={newEqName}
                onChange={(e) => setNewEqName(e.target.value)}
                placeholder="Ex: Notebook Dell Inspiron"
              />

              <Field label="Categoria (Opcional)" hint="Define o checklist da OS.">
                <div className="flex gap-2">
                  <Select
                    aria-label="Categoria do equipamento"
                    value={newEqCategoryId}
                    onChange={(e) => setNewEqCategoryId?.(e.target.value)}
                    wrapperClassName="flex-1"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                  {onCreateCategory && (
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
                  )}
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
                type="text"
                value={newEqBrand}
                onChange={(e) => setNewEqBrand(e.target.value)}
                placeholder="Ex: Dell"
              />

              <Input
                label="Modelo"
                type="text"
                value={newEqModel}
                onChange={(e) => setNewEqModel(e.target.value)}
                placeholder="Ex: L14 Gen 2"
              />

              <Input
                label="Número de Série"
                type="text"
                value={newEqSerial}
                onChange={(e) => setNewEqSerial(e.target.value)}
                placeholder="Ex: SN-98765432"
                className="font-mono"
                wrapperClassName="sm:col-span-2"
              />
            </div>

            {/* Configuração de Hardware / Configuração da Máquina (Opcional) */}
            <details className="group rounded-xl border border-border/80 bg-surface-subtle/40 p-3.5">
              <summary className="flex items-center justify-between cursor-pointer list-none select-none">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-text-subtle" aria-hidden />
                  <span className="text-small font-medium text-text">
                    Configuração da Máquina (Opcional)
                  </span>
                </div>
                <span className="text-caption text-brand group-open:hidden">
                  + Preencher
                </span>
                <span className="text-caption text-text-subtle hidden group-open:inline">
                  Recolher
                </span>
              </summary>

              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Processador (CPU)"
                    placeholder="Ex: Core i5 / Ryzen 5"
                    value={newEqProcessor}
                    onChange={(e) => setNewEqProcessor?.(e.target.value)}
                  />
                  <Input
                    label="Memória RAM"
                    placeholder="Ex: 16 GB DDR4"
                    value={newEqRam}
                    onChange={(e) => setNewEqRam?.(e.target.value)}
                  />
                  <Input
                    label="Armazenamento"
                    placeholder="Ex: SSD 512 GB NVMe"
                    value={newEqStorage}
                    onChange={(e) => setNewEqStorage?.(e.target.value)}
                  />
                  <Field label="Placa de Vídeo">
                    <Select
                      aria-label="Tipo de placa de vídeo"
                      value={newEqGpuType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewEqGpuType?.(val);
                        if (!val) setNewEqGpuModel?.('');
                      }}
                    >
                      <option value="">Não informado</option>
                      <option value="integrada">Integrada (Onboard)</option>
                      <option value="dedicada">Dedicada (Offboard)</option>
                    </Select>
                  </Field>
                </div>

                {newEqGpuType === 'dedicada' && (
                  <Input
                    label="Qual a placa de vídeo dedicada?"
                    placeholder="Ex: NVIDIA GeForce RTX 3060 6GB / GTX 1650"
                    value={newEqGpuModel}
                    onChange={(e) => setNewEqGpuModel?.(e.target.value)}
                  />
                )}
              </div>
            </details>
          </>
        )}
      </form>
    </Modal>
  );
}
