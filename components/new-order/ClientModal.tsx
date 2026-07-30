'use client';

import React from 'react';
import { User, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Field, Input } from '@/components/ui';
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
  savingClient,
  handleSaveClient,
  handleNextStep,
}: ClientModalProps) {
  const close = () => {
    setIsNewClientModalOpen(false);
    setClientModalStep(1);
  };

  return (
    <Modal
      open={isNewClientModalOpen}
      onClose={close}
      title="Cadastrar Novo Cliente"
      description={`Passo ${clientModalStep} de 2`}
      size="sm"
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

            <Input
              label="Nome do Equipamento"
              required
              type="text"
              value={newEqName}
              onChange={(e) => setNewEqName(e.target.value)}
              placeholder="Ex: Notebook Dell Inspiron"
            />

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
            />
          </>
        )}
      </form>
    </Modal>
  );
}
