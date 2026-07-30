'use client';
import React from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface OrderActionsProps {
  handleDeleteOrder: () => void;
  handleSaveChanges: () => void;
  saving: boolean;
}

export function OrderActions({ handleDeleteOrder, handleSaveChanges, saving }: OrderActionsProps) {
  return (
    <div className="flex gap-3">
      <Button
        variant="danger"
        icon={<Trash2 className="w-4 h-4" />}
        disabled={saving}
        onClick={handleDeleteOrder}
      >
        Excluir OS
      </Button>

      <Button
        icon={<CheckCircle2 className="w-4 h-4" />}
        loading={saving}
        onClick={handleSaveChanges}
        className="flex-1"
      >
        Salvar Alterações
      </Button>
    </div>
  );
}
