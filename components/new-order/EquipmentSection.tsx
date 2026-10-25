'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';

interface EquipmentSectionProps {
  clientId: string;
  equipmentId: string;
  setEquipmentId: (id: string) => void;
  equipments: any[];
  queryEquipmentId: string;
  isManualEquipment: boolean;
  equipmentDetails: string;
  setEquipmentDetails: (details: string) => void;
  /** Abre o cadastro completo de equipamento, sem sair da OS. */
  onNewEquipment: () => void;
}

export function EquipmentSection({
  clientId,
  equipmentId,
  setEquipmentId,
  equipments,
  queryEquipmentId,
  isManualEquipment,
  equipmentDetails,
  setEquipmentDetails,
  onNewEquipment,
}: EquipmentSectionProps) {
  const hasEquipments = equipments.length > 0;

  return (
    <>
      <div className="flex items-end gap-2">
        <Select
          label="Equipamento do Cliente"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
          disabled={!clientId || !!queryEquipmentId}
          wrapperClassName="flex-1 min-w-0"
          hint={
            !clientId
              ? 'Escolha o cliente para listar os equipamentos dele.'
              : !hasEquipments
                ? 'Nenhum equipamento cadastrado ainda. Use "Novo" para cadastrar.'
                : undefined
          }
        >
          {!clientId ? (
            <option value="">Selecione o cliente primeiro...</option>
          ) : (
            <>
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.brand} {eq.model})
                </option>
              ))}
              <option value="manual">Digitar manualmente...</option>
            </>
          )}
        </Select>

        <Button
          type="button"
          variant="secondary"
          className="shrink-0 h-[42px] sm:h-[38px] px-3"
          onClick={onNewEquipment}
          disabled={!clientId}
          icon={<Plus className="w-4 h-4" aria-hidden />}
          title="Cadastrar novo equipamento"
        >
          Novo
        </Button>
      </div>

      {isManualEquipment && (
        <Input
          label="Especificações do Equipamento"
          type="text"
          placeholder="Ex: Notebook Lenovo ThinkPad L14 N/S: PE091728"
          value={equipmentDetails}
          onChange={(e) => setEquipmentDetails(e.target.value)}
          required
        />
      )}
    </>
  );
}
