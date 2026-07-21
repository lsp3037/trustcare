'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { getStatusColor } from '@/lib/utils/orderStatus';
import { SlaTracker } from '@/components/ui/SlaTracker';
import { generateOrderPdf } from '@/lib/utils/pdfGenerator';

interface OrderHeaderProps {
  order: any;
  client: any;
  company?: any;
  selectedProducts?: any[];
  selectedServices?: any[];
  status: string;
  priority: string;
}

export function OrderHeader({
  order,
  client,
  company,
  selectedProducts = [],
  selectedServices = [],
  status,
  priority
}: OrderHeaderProps) {
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
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para Ordens de Serviço
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-semibold border ${getStatusColor(status)}`}>
              {status}
            </span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-mono">
              Ordem de Serviço #{order?.codigo_os || order?.id?.slice(0, 8)}
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            Cliente: <strong className="text-slate-200">{client?.name}</strong> • Aberta em {order?.created_at ? new Date(order.created_at).toLocaleDateString('pt-BR') : '...'}
          </p>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-none text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <FileText className="w-4 h-4" /> Baixar PDF Oficial
            </button>
            <Link 
              href={`/dashboard/orders/${order?.id}/temp-print`} 
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-none text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer border border-slate-700"
            >
              <Printer className="w-4 h-4" /> Imprimir Via
            </Link>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-none">
              Prioridade: <strong className={priority === 'Alta' ? 'text-rose-400' : priority === 'Média' ? 'text-amber-400' : 'text-slate-400'}>{priority}</strong>
            </span>
          </div>
        </div>

        {/* SLA TRACKER REAL */}
        <div className="lg:col-span-1">
          <div className="space-y-3">
            <SlaTracker variant="full" startedAt={order?.analysis_started_at} status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}
