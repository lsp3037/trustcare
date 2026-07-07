'use client';
import React from 'react';
import { ClipboardList, Wrench, User } from 'lucide-react';

export function ClientInfoCard({ order, client }: { order: any, client: any }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-none p-6 shadow-2xl space-y-5">
      <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
        <ClipboardList className="w-5 h-5 text-blue-500" /> Detalhes Físicos do Chamado
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Equipamento</p>
          <p className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2 font-mono">
            <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
            {order.equipment_details || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente Solicitante</p>
          <p className="text-sm font-semibold text-slate-200 mt-1 flex items-center gap-2 font-mono">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            {client?.name} {client?.document ? `(${client.document})` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
