'use client';

import React from 'react';
import { Input, Select } from '@/components/ui';

interface EquipmentSectionProps {
  clientId: string;
  equipmentId: string;
  setEquipmentId: (id: string) => void;
  equipments: any[];
  queryEquipmentId: string;
  isManualEquipment: boolean;
  equipmentDetails: string;
  setEquipmentDetails: (details: string) => void;
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
}: EquipmentSectionProps) {
  return (
    <>
      <Select
        label="Equipamento do Cliente"
        value={equipmentId}
        onChange={(e) => setEquipmentId(e.target.value)}
        disabled={!clientId || !!queryEquipmentId}
        hint={!clientId ? 'Escolha o cliente para listar os equipamentos dele.' : undefined}
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
