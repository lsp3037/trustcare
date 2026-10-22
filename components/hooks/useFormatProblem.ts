'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatReportedProblem } from '@/lib/utils/reportFormatter';
import { useToast } from '@/components/ui';

interface UseFormatProblemOptions {
  reportedProblem: string;
  setReportedProblem: (value: string) => void;
  /** Descrição do equipamento, enviada como contexto para a IA. */
  equipment?: string;
  /** Varia entre criar e editar a O.S. */
  successMessage?: string;
}

/**
 * Formata o Problema Relatado com a mesma IA do laudo: a Edge Function
 * `formatar-laudo` tem o modo `tipo: "problema"`, que organiza a queixa do
 * cliente em tópicos no padrão visual do laudo técnico.
 *
 * Se a IA estiver indisponível (função antiga, alta demanda, rede), cai no
 * formatador local — melhor um resultado simples do que um erro na tela.
 */
export function useFormatProblem({
  reportedProblem,
  setReportedProblem,
  equipment = '',
  successMessage = 'Problema relatado formatado',
}: UseFormatProblemOptions) {
  const toast = useToast();
  const [formattingProblem, setFormattingProblem] = useState(false);

  const formatProblem = async () => {
    const plain = reportedProblem.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    if (plain.length < 5) {
      toast.warning('Escreva o problema relatado antes de formatar.');
      return;
    }

    setFormattingProblem(true);
    const previous = reportedProblem;

    try {
      const { data, error } = await supabase.functions.invoke('formatar-laudo', {
        body: {
          tipo: 'problema',
          notas: reportedProblem,
          equipamento: equipment,
        },
      });
      if (error) throw error;
      if (data?.tipo !== 'problema' || !data?.html) {
        throw new Error('Formatação com IA indisponível.');
      }

      setReportedProblem(data.html);
      toast.success(successMessage, {
        action: { label: 'Desfazer', onClick: () => setReportedProblem(previous) },
        duration: 10000,
      });
    } catch (err: any) {
      // Detalhe técnico só no console: o usuário final não precisa ver isso.
      let reason = err?.message || 'Erro desconhecido';
      try {
        const body = await err?.context?.json?.();
        if (body?.error) reason = body.error;
      } catch {}
      console.error('[formatar-problema] Falha na IA:', reason);

      const formatted = formatReportedProblem(reportedProblem);
      if (!formatted) {
        toast.error('Não foi possível formatar o problema', {
          description: 'Tente novamente em instantes.',
        });
        return;
      }
      if (formatted === reportedProblem) {
        toast.info('O problema relatado já está formatado.');
        return;
      }

      setReportedProblem(formatted);
      toast.warning('Formatação básica aplicada', {
        description: 'A formatação com IA está indisponível no momento.',
        action: { label: 'Desfazer', onClick: () => setReportedProblem(previous) },
      });
    } finally {
      setFormattingProblem(false);
    }
  };

  return { formatProblem, formattingProblem };
}
