'use client';

import React from 'react';
import { Wrench } from 'lucide-react';

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
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-blue-500" /> Equipamento do Cliente
        </label>
        <select
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={!clientId || !!queryEquipmentId}
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
        </select>
      </div>

      {isManualEquipment && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Especificações do Equipamento</label>
          <input
            type="text"
            placeholder="Ex: Notebook Lenovo ThinkPad L14 N/S: PE091728"
            value={equipmentDetails}
            onChange={(e) => setEquipmentDetails(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>
      )}
    </>
  );
}
