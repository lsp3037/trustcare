'use client';

import React from 'react';
import { User } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  type: string;
}

interface ClientSectionProps {
  clientId: string;
  setClientId: (id: string) => void;
  setIsNewClientModalOpen: (open: boolean) => void;
  clientsList: Client[];
  queryClientId: string;
}

export function ClientSection({
  clientId,
  setClientId,
  setIsNewClientModalOpen,
  clientsList,
  queryClientId,
}: ClientSectionProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
        <User className="w-3.5 h-3.5 text-blue-500" /> Cliente
      </label>
      <select
        value={clientId}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'create_new_client') {
            setIsNewClientModalOpen(true);
          } else {
            setClientId(val);
          }
        }}
        className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        required
        disabled={!!queryClientId}
      >
        <option value="">Selecione um cliente...</option>
        {clientsList.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name} ({client.type})
          </option>
        ))}
        {!queryClientId && (
          <option value="create_new_client" className="text-emerald-500 font-semibold">
            ➕ Cadastrar Novo Cliente
          </option>
        )}
      </select>
    </div>
  );
}
