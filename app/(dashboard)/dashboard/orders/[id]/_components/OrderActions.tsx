'use client';
import React from 'react';
import { Trash2, CheckCircle2, } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface OrderActionsProps {
  handleDeleteOrder: () => void;
  handleSaveChanges: () => void;
  saving: boolean;
}

export function OrderActions({ handleDeleteOrder, handleSaveChanges, saving }: OrderActionsProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleDeleteOrder}
        disabled={saving}
        className="bg-rose-950/20 border border-rose-900/50 hover:bg-rose-900/40 disabled:bg-zinc-900 disabled:border-transparent text-rose-400 font-bold font-mono tracking-wider py-3 px-4 rounded-none text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
      >
        <Trash2 className="w-4 h-4" /> Excluir OS
      </button>

      <button
        type="button"
        onClick={handleSaveChanges}
        disabled={saving}
        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-900 text-white font-bold font-mono tracking-wider uppercase py-3 px-4 rounded-none text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        {saving ? <LoadingSpinner className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Salvar Alterações
      </button>
    </div>
  );
}
