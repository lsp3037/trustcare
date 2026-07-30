'use client';
import React from 'react';
import { ClipboardList, Wrench, User } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui';

export function ClientInfoCard({ order, client }: { order: any, client: any }) {
  return (
    <Card className="space-y-5">
      <CardTitle className="flex items-center gap-2 border-b border-border pb-3">
        <ClipboardList className="w-5 h-5 text-text-subtle" aria-hidden /> Detalhes Físicos do Chamado
      </CardTitle>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <dt className="text-caption uppercase tracking-wider text-text-subtle">Equipamento</dt>
          <dd className="text-small font-semibold text-text mt-1 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />
            {order.equipment_details || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-caption uppercase tracking-wider text-text-subtle">Cliente Solicitante</dt>
          <dd className="text-small font-semibold text-text mt-1 flex items-center gap-2">
            <User className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />
            {client?.name} {client?.document ? `(${client.document})` : ''}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
