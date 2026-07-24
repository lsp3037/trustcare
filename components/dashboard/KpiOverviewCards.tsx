'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight 
} from 'lucide-react';
import { DashboardStats } from '@/components/hooks/useDashboardData';

interface KpiOverviewCardsProps {
  stats: DashboardStats;
  loading: boolean;
  isAdmin: boolean;
  role: string | null;
}

export function KpiOverviewCards({ stats, loading, isAdmin, role }: KpiOverviewCardsProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-900/60 border border-slate-800/60 rounded-none p-6 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-9 h-9 bg-slate-800" />
              <div className="w-12 h-4 bg-slate-800" />
            </div>
            <div className="h-3 w-28 bg-slate-800 mb-2" />
            <div className="h-7 w-20 bg-slate-800 mb-2" />
            <div className="h-2 w-32 bg-slate-800/60" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {isAdmin ? (
        <>
          {/* Card 1: Faturamento */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-none border border-emerald-500/20 flex items-center gap-1 font-mono">
                <TrendingUp className="w-3 h-3" /> +14.5%
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-400">Faturamento Realizado</p>
            <h3 className="text-2xl font-mono font-black text-white mt-1">
              R$ {stats.billing.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-2">Soma de OS Concluídas/Entregues</p>
          </div>

          {/* Card 2: OS Ativas (Clicável) */}
          <div 
            onClick={() => router.push('/dashboard/orders?status=Ativas')}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1 group-hover:text-emerald-400 transition-colors font-mono">
                Em progresso <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">OS Abertas / Em Análise</p>
            <h3 className="text-2xl font-mono font-black text-white mt-1">{stats.openOrders}</h3>
            <p className="text-xs text-slate-500 mt-2">Aguardando aprovação ou peças</p>
          </div>

          {/* Card 3: Ticket Médio */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-none border border-emerald-500/20 font-mono">
                Caixa
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-400">Ticket Médio</p>
            <h3 className="text-2xl font-mono font-black text-white mt-1">
              R$ {stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-slate-500 mt-2">Valor médio por O.S. paga</p>
          </div>
        </>
      ) : (
        <>
          {/* Card 1: OS Abertas / Em Execução (Não Admin) */}
          <div 
            onClick={() => router.push('/dashboard/orders?status=Ativas')}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {role === 'technician' ? 'Minha fila' : 'Geral'}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">O.S. Abertas / Em Execução</p>
            <h3 className="text-2xl font-mono font-black text-white mt-1">{stats.openOrders}</h3>
            <p className="text-xs text-slate-500 mt-2">Aguardando análise ou peças</p>
          </div>

          {/* Card 2: OS Prontas / Concluídas (Não Admin) */}
          <div 
            onClick={() => router.push('/dashboard/orders?status=Concluidas')}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">
                Concluídas
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">O.S. Prontas / Entregues</p>
            <h3 className="text-2xl font-mono font-black text-white mt-1">{stats.completedOrders}</h3>
            <p className="text-xs text-slate-500 mt-2">Finalizadas ou prontas para entrega</p>
          </div>

          {/* Card 3: Clientes Cadastrados (Não Admin) */}
          <div 
            onClick={() => router.push('/dashboard/clients')}
            className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-none group-hover:bg-emerald-500/20 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">
                Clientes
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">Total de Clientes</p>
            <h3 className="text-2xl font-mono font-black text-white mt-1">{stats.totalClients}</h3>
            <p className="text-xs text-slate-500 mt-2">Cadastrados na base global</p>
          </div>
        </>
      )}

      {/* Card 4: Alertas de Estoque */}
      <div 
        onClick={() => router.push('/dashboard/inventory?filter=low_stock')}
        className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-none p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/30 cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-none group-hover:bg-rose-500/20 transition-colors">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-none border border-rose-500/20 flex items-center gap-1 group-hover:bg-rose-500/20 transition-colors font-mono">
            Crítico <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">Produtos com Estoque Baixo</p>
        <h3 className="text-2xl font-mono font-black text-white mt-1">{stats.lowStockCount}</h3>
        <p className="text-xs text-slate-500 mt-2">Itens abaixo do estoque mínimo</p>
      </div>
    </div>
  );
}
