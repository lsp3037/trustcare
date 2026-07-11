'use client';

import React, { useState } from 'react';
import { X, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCompany } from '@/lib/context/CompanyContext';

const EXPENSE_CATEGORIES = [
  'Marketing',
  'Equipamentos',
  'Aluguel',
  'Salários',
  'Software/Nuvem',
  'Infraestrutura',
  'Outros',
];

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddExpenseModal({ onClose, onSuccess }: AddExpenseModalProps) {
  const { company } = useCompany();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Marketing');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrence, setRecurrence] = useState('Única');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('A descrição é obrigatória.');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('O valor deve ser maior que zero.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const companyId = company?.id;
      if (!companyId) {
        throw new Error('Nenhuma empresa encontrada no contexto.');
      }

      const { error: insertError } = await supabase
        .from('company_expenses')
        .insert({
          company_id: companyId,
          description: description.trim(),
          amount: val,
          category,
          expense_date: new Date(expenseDate).toISOString(),
          recurrence,
          end_date: (recurrence !== 'Única' && endDate) ? new Date(endDate).toISOString() : null,
        });

      if (insertError) throw insertError;
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(`Erro ao salvar despesa: ${err.message || 'Tente novamente.'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-none w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-none">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-white">Cadastrar Despesa</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm}>
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Descrição
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Anúncios do Meta Ads - Julho"
                className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Recorrência
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
                >
                  <option value="Única">Única</option>
                  <option value="Diária">Diária</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Mensal">Mensal</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
            </div>

            {recurrence !== 'Única' && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Recorrente até (Opcional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Sem data de término"
                  className="w-full bg-slate-950 border border-slate-800 rounded-none py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 block">Deixe em branco para correr por tempo indeterminado.</span>
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-none animate-fadeIn">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white transition-colors rounded-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors rounded-none disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Salvar Despesa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
