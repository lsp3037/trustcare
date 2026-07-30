'use client';

import React from 'react';
import { Select } from '@/components/ui';

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
    <Select
      label="Cliente"
      value={clientId}
      onChange={(e) => {
        const val = e.target.value;
        if (val === 'create_new_client') {
          setIsNewClientModalOpen(true);
        } else {
          setClientId(val);
        }
      }}
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
        <option value="create_new_client">+ Cadastrar Novo Cliente</option>
      )}
    </Select>
  );
}
