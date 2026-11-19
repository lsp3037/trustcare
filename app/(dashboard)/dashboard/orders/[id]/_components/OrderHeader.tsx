'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, Link2, MessageCircle, MoreHorizontal, Trash2, ChevronDown } from 'lucide-react';
import { SlaTracker } from '@/components/ui/SlaTracker';
import { StatusBadge, Button, buttonClasses, useToast } from '@/components/ui';
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
  onDelete: () => void;
}

/** Menu simples: abre/fecha com backdrop transparente (mesmo padrão do dropdown de status). */
function Menu({
  trigger,
  label,
  align = 'right',
  children,
}: {
  trigger: React.ReactNode;
  label: string;
  align?: 'left' | 'right';
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        {trigger}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default bg-transparent border-none"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className={cn(
              'absolute top-full mt-1.5 min-w-48 bg-surface-overlay border border-border shadow-2xl z-20 p-1',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

const menuItem =
  'w-full text-left py-2 px-3 flex items-center gap-2 text-small text-text-muted hover:bg-surface-sunken hover:text-text transition-colors cursor-pointer';

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
  priority,
  onDelete,
}: OrderHeaderProps) {
  const toast = useToast();
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={status} />
              <h1 className="text-h1 text-text">
                Ordem de Serviço <span className="font-mono">#{osCode}</span>
              </h1>
            </div>
            <Menu label="Mais ações" trigger={<MoreHorizontal className="w-4 h-4" aria-hidden />}>
              {(close) => (
                <button
                  type="button"
                  role="menuitem"
                  className={cn(menuItem, 'text-danger hover:text-danger')}
                  onClick={() => { close(); onDelete(); }}
                >
                  <Trash2 className="w-4 h-4" aria-hidden /> Excluir OS…
                </button>
              )}
            </Menu>
          </div>
          <p className="text-small text-text-muted mt-2">
            Cliente: <strong className="text-text font-semibold">{client?.name}</strong>
            {' • '}Aberta em{' '}
            <span className="font-mono tabular-nums">
              {order?.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '...'}
            </span>
          </p>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Olá ${client?.name || ''}, seu orçamento (OS #${osCode}) está pronto para aprovação. Acesse: ${typeof window !== 'undefined' ? window.location.origin : ''}/orcamento/${order?.id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'primary', size: 'sm' })}
            >
              <MessageCircle className="w-4 h-4" aria-hidden /> Enviar orçamento
            </a>

            <Button
              variant="secondary"
              size="sm"
              icon={<Link2 className="w-4 h-4" />}
              onClick={async () => {
                const url = `${window.location.origin}/orcamento/${order?.id}`;
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success('Link do orçamento copiado', {
                    description: 'Envie ao cliente para ele aprovar online.',
                  });
                } catch {
                  toast.error('Não foi possível copiar o link');
                }
              }}
            >
              Copiar link
            </Button>

            <Menu
              label="Imprimir ou exportar"
              align="left"
              trigger={<>Imprimir / Exportar <ChevronDown className="w-3.5 h-3.5" aria-hidden /></>}
            >
              {(close) => (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItem}
                    onClick={() => { close(); handleDownloadPdf(); }}
                  >
                    <FileText className="w-4 h-4" aria-hidden /> Baixar PDF
                  </button>
                  <Link
                    href={`/dashboard/orders/${order?.id}/temp-print`}
                    role="menuitem"
                    className={menuItem}
                    onClick={close}
                  >
                    <Printer className="w-4 h-4" aria-hidden /> Imprimir via
                  </Link>
                </>
              )}
            </Menu>

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
