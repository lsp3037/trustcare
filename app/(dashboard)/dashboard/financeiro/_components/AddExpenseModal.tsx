'use client';

import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';

const EXPENSE_CATEGORIES = [
  'Marketing',
  'Equipamentos',
  'Aluguel',
  'Salários',
  'Software/Nuvem',
  'Infraestrutura',
  'Outros',
];

const RECURRENCES = ['Única', 'Diária', 'Semanal', 'Mensal', 'Anual'];

/** YYYY-MM-DD no fuso local — `toISOString()` empurraria a data um dia atrás. */
function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  recurrence?: string;
  end_date?: string | null;
}

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: Expense;
}

export function AddExpenseModal({ onClose, onSuccess, expenseToEdit }: AddExpenseModalProps) {
  const { company } = useCompany();
  const toast = useToast();

  const [description, setDescription] = useState(expenseToEdit?.description || '');
  const [amount, setAmount] = useState(expenseToEdit?.amount ? String(expenseToEdit.amount) : '');
  const [category, setCategory] = useState(expenseToEdit?.category || 'Marketing');
  const [expenseDate, setExpenseDate] = useState(
    expenseToEdit?.expense_date
      ? toDateInput(new Date(expenseToEdit.expense_date))
      : toDateInput(new Date()),
  );
  const [recurrence, setRecurrence] = useState(expenseToEdit?.recurrence || 'Única');
  const [endDate, setEndDate] = useState(
    expenseToEdit?.end_date ? toDateInput(new Date(expenseToEdit.end_date)) : '',
  );
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState('');

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      // O erro fica no campo que o causou, não num banner no rodapé.
      setAmountError('O valor deve ser maior que zero.');
      return;
    }
    setAmountError('');
    setLoading(true);

    try {
      const companyId = company?.id;
      if (!companyId) throw new Error('Nenhuma empresa encontrada no contexto.');

      const payload = {
        description: description.trim(),
        amount: val,
        category,
        expense_date: new Date(expenseDate).toISOString(),
        recurrence,
        end_date: recurrence !== 'Única' && endDate ? new Date(endDate).toISOString() : null,
      };

      if (expenseToEdit) {
        const { error } = await supabase
          .from('company_expenses')
          .update(payload)
          .eq('id', expenseToEdit.id);
        if (error) throw error;
        toast.success('Despesa atualizada');
      } else {
        const { error } = await supabase
          .from('company_expenses')
          .insert({ company_id: companyId, ...payload });
        if (error) throw error;
        toast.success(`Despesa "${payload.description}" cadastrada`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Não foi possível salvar a despesa', {
        description: err.message || 'Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={expenseToEdit ? 'Editar Despesa' : 'Cadastrar Despesa'}
      description="Custos fixos e variáveis entram no cálculo do lucro do período."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-despesa"
            loading={loading}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            Salvar Despesa
          </Button>
        </>
      }
    >
      <form id="form-despesa" onSubmit={handleConfirm} className="space-y-4">
        <Input
          label="Descrição"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Anúncios do Meta Ads - Julho"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (amountError) setAmountError('');
            }}
            placeholder="0,00"
            error={amountError}
            className="font-mono tabular-nums"
          />

          <Select
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Data Inicial"
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />

          <Select
            label="Recorrência"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
          >
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>

        {recurrence !== 'Única' && (
          <Input
            label="Recorrente até"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            hint="Deixe em branco para correr por tempo indeterminado."
          />
        )}
      </form>
    </Modal>
  );
}
