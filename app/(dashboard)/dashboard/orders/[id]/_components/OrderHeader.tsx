'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, Link2, MessageCircle } from 'lucide-react';
import { SlaTracker } from '@/components/ui/SlaTracker';
import { StatusBadge, Button, buttonClasses } from '@/components/ui';
import { generateOrderPdf } from '@/lib/utils/pdfGenerator';
import { cn } from '@/lib/utils';

interface OrderHeaderProps {
  order: any;
  client: any;
  company?: any;
  selectedProducts?: any[];
  selectedServices?: any[];
  status: string;
  priority: string;
}

/** Prioridade é escala de urgência — mapeia nas semânticas, não em cores soltas. */
const PRIORITY_TONE: Record<string, string> = {
  Alta: 'text-danger',
  Média: 'text-warning',
};

export function OrderHeader({
  order,
  client,
  company,
  selectedProducts = [],
  selectedServices = [],
  status,
  priority
}: OrderHeaderProps) {
  const osCode = order?.codigo_os || order?.id?.slice(0, 8);

  const handleDownloadPdf = () => {
    generateOrderPdf({
      order,
      company,
      client,
      items: selectedProducts,
      services: selectedServices,
    });
  };

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-small font-semibold text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden /> Voltar para Ordens de Serviço
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={status} />
            <h1 className="text-h1 text-text">
              Ordem de Serviço <span className="font-mono">#{osCode}</span>
            </h1>
          </div>
          <p className="text-small text-text-muted mt-2">
            Cliente: <strong className="text-text font-semibold">{client?.name}</strong>
            {' • '}Aberta em{' '}
            <span className="font-mono tabular-nums">
              {order?.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '...'}
            </span>
          </p>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Button size="sm" icon={<FileText className="w-4 h-4" />} onClick={handleDownloadPdf}>
              PDF
            </Button>
            <Link
              href={`/dashboard/orders/${order?.id}/temp-print`}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <Printer className="w-4 h-4" aria-hidden /> Via
            </Link>

            <Button
              variant="secondary"
              size="sm"
              icon={<Link2 className="w-4 h-4" />}
              onClick={() => {
                const url = `${window.location.origin}/orcamento/${order?.id}`;
                navigator.clipboard.writeText(url);
                alert('Link do orçamento copiado para a área de transferência!');
              }}
            >
              Copiar Link
            </Button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Olá ${client?.name || ''}, seu orçamento (OS #${osCode}) está pronto para aprovação. Acesse: ${typeof window !== 'undefined' ? window.location.origin : ''}/orcamento/${order?.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <MessageCircle className="w-4 h-4" aria-hidden /> WhatsApp
            </a>

            <span className="text-caption uppercase tracking-wider text-text-subtle bg-surface-sunken border border-border px-2.5 py-1.5">
              Prioridade:{' '}
              <strong className={cn('font-semibold', PRIORITY_TONE[priority] ?? 'text-text-muted')}>
                {priority}
              </strong>
            </span>
          </div>
        </div>

        {/* SLA TRACKER REAL */}
        <div className="lg:col-span-1">
          <SlaTracker variant="full" startedAt={order?.analysis_started_at} status={status} />
        </div>
      </div>
    </div>
  );
}
