'use client';
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlaTrackerProps {
  startedAt?: string | null;
  status?: string;
  variant?: 'mini' | 'full';
}

// 72 hours in milliseconds (3 days SLA)
const SLA_DURATION_MS = 72 * 60 * 60 * 1000;

function formatDuration(ms: number) {
  if (ms < 0) ms = 0; 
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatRemaining(ms: number) {
  const isOverdue = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  
  if (isOverdue) {
    if (days > 0) return `Atrasado em ${days}d ${hours}h`;
    return `Atrasado em ${hours}h`;
  } else {
    if (days > 0) return `Faltam ${days}d ${hours}h`;
    return `Faltam ${hours}h`;
  }
}

export function SlaTracker({ startedAt, status, variant = 'full' }: SlaTrackerProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    // Only tick if it's active
    const isActive = status !== 'Finalizado' && status !== 'Cancelado' && status !== 'Pronto para Retirada';
    if (!startedAt || !isActive) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  if (status === 'Finalizado' || status === 'Cancelado' || status === 'Pronto para Retirada') {
    return null; // Oculta o contador se a O.S já acabou
  }

  if (!startedAt) {
    if (variant === 'mini') return null;
    return (
      <div className="flex flex-col gap-2 rounded-none border p-4 bg-slate-950/80 border-slate-800/80 shadow-xl opacity-60">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> SLA Tracker
        </span>
        <span className="text-xs text-slate-400 mt-2 font-mono">
          O contador será ativado quando a análise iniciar.
        </span>
      </div>
    );
  }

  const startTimeMs = new Date(startedAt).getTime();
  const deadlineMs = startTimeMs + SLA_DURATION_MS;
  
  const elapsedMs = now - startTimeMs;
  const remainingMs = deadlineMs - now;
  const isOverdue = remainingMs < 0;

  let progressPercent = (elapsedMs / SLA_DURATION_MS) * 100;
  if (progressPercent > 100) progressPercent = 100;

  const elapsedTime = formatDuration(elapsedMs);
  const remainingTime = formatRemaining(remainingMs);

  if (variant === 'mini') {
    return (
      <div className={cn(
        "flex flex-col gap-1 rounded-none border px-2 py-1.5 w-full mt-2 transition-all",
        isOverdue ? "bg-rose-500/10 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.1)]" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono flex items-center gap-1">
             <Clock className="w-3 h-3"/> SLA
          </span>
          <span className={cn(
            "text-xs font-bold font-mono",
            isOverdue ? "text-rose-450" : "text-slate-300"
          )}>{elapsedTime}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-none border p-4 shadow-xl transition-all",
      isOverdue ? "bg-rose-500/5 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.05)]" : "bg-slate-950/80 border-slate-800/80"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Tempo de Espera
        </span>
        <span className={cn(
          "text-[10px] font-bold uppercase px-2 py-0.5 rounded-none border tracking-widest",
          isOverdue ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        )}>
          {isOverdue ? 'Prazo Vencido' : 'No Prazo'}
        </span>
      </div>
      
      <div className="flex items-end justify-between mt-2">
        <span className={cn(
          "text-4xl font-black font-mono tracking-tighter leading-none",
          isOverdue ? "text-rose-500" : "text-white"
        )}>
          {elapsedTime}
        </span>
      </div>

      <div className="w-full h-1 bg-slate-900 mt-3 rounded-none overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-1000", isOverdue ? "bg-rose-500" : "bg-blue-500")}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex justify-between items-center mt-2">
        <span className={cn(
          "text-[10px] font-mono",
          isOverdue ? "text-rose-450 font-bold" : "text-slate-400"
        )}>
          {remainingTime}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          Início: {new Date(startedAt).toLocaleDateString('pt-BR')} {new Date(startedAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  );
}
