'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { ServiceOrder } from '@/components/hooks/useDashboardData';
import { getStatusDotColor } from '@/lib/utils/orderStatus';

interface RecentOrdersTableProps {
  recentOrders: ServiceOrder[];
  isAdmin: boolean;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export function RecentOrdersTable({ recentOrders, isAdmin, onUpdateStatus }: RecentOrdersTableProps) {
  const router = useRouter();
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<ServiceOrder | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const formatEquipmentDetails = (details: string) => {
    if (!details) return '—';
    return details.replace(/\s*\(S\/N:\s*(—|null|undefined|)?\)/gi, '').trim();
  };

  return (
    <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 flex flex-col shadow-lg`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Ordens de Serviço Recentes</h3>
          <p className="text-xs text-slate-500 mt-0.5">Movimentações no período selecionado.</p>
        </div>
        <Link href="/dashboard/orders" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
          Ver mais <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto">
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
            <div className="p-3 bg-slate-800/60 text-slate-600">
              <ClipboardList className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Nenhuma OS no período selecionado</p>
            <p className="text-xs text-slate-600 max-w-xs">Ajuste o filtro de datas ou crie uma nova Ordem de Serviço para começar.</p>
            <Link
              href="/dashboard/orders?new=true"
              className="mt-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/50 px-4 py-1.5 transition-all"
            >
              + Nova OS
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="pb-3">Cliente</th>
                <th className="pb-3">Equipamento</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Valor</th>
                <th className="pb-3 text-right pr-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 pr-2 font-semibold text-slate-200">{order.clients?.name || 'Cliente'}</td>
                  <td className="py-4 pr-2 text-slate-400 truncate max-w-[200px]" title={order.equipment_details || ''}>
                    {formatEquipmentDetails(order.equipment_details || '')}
                  </td>
                  <td className="py-4 pr-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-xs font-semibold bg-slate-950/80 border border-slate-800/60 text-slate-350 light:bg-slate-100 light:border-slate-200 light:text-slate-700 font-mono">
                      <span className={`w-2 h-2 rounded-none shrink-0 ${getStatusDotColor(order.status)}`} />
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 text-right font-bold text-slate-200 font-mono">
                    R$ {Number(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 text-right relative pr-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(activeDropdownId === order.id ? null : order.id);
                      }}
                      className="p-1.5 hover:bg-slate-800/60 rounded-none text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {activeDropdownId === order.id && (
                      <div className="absolute right-4 mt-1 w-40 bg-slate-950 border border-slate-800 rounded-none shadow-2xl z-50 p-1 py-1.5 text-left animate-in fade-in duration-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(null);
                            router.push(`/dashboard/orders/${order.id}`);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(null);
                            setStatusModalOrder(order);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
                        >
                          Alterar Status
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(null);
                            window.print();
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-none transition-colors cursor-pointer"
                        >
                          Imprimir OS
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Alteração de Status */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-none space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Alterar Status da OS</h3>
              <button 
                onClick={() => setStatusModalOrder(null)} 
                className="text-slate-400 hover:text-white text-[10px] font-bold font-mono tracking-wider cursor-pointer border border-slate-800 px-2 py-1 hover:bg-slate-850 transition-colors rounded-none"
              >
                CANCELAR
              </button>
            </div>
            
            <div className="flex justify-between items-center bg-slate-950 p-2.5 border border-slate-800 font-mono text-xs">
              <span className="text-slate-500 font-bold">CÓDIGO OS:</span>
              <span className="text-white font-black">{statusModalOrder.codigo_os}</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 pt-2">
              {[
                'Aguardando Equipamento',
                'Em Análise',
                'Aguardando Aprovação',
                'Aguardando Peças',
                'Em Execução',
                'Em Testes',
                'Pronto para Retirada',
                'Finalizado',
                'Cancelado'
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    onUpdateStatus(statusModalOrder.id, status);
                    setStatusModalOrder(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-mono border rounded-none transition-colors cursor-pointer ${
                    statusModalOrder.status === status
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-850 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
