'use client';
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
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
      <div className="flex flex-col gap-2 border border-border p-4 bg-surface-sunken">
        <span className="text-caption uppercase tracking-wider text-text-subtle flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden /> SLA Tracker
        </span>
        <span className="text-small text-text-muted mt-2">
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
        "flex items-center justify-between gap-3 border px-2 py-1.5 w-full",
        isOverdue ? "bg-danger/10 border-danger/40" : "bg-surface-sunken border-border"
      )}>
        <span className="text-caption uppercase tracking-wider text-text-subtle flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden /> SLA
        </span>
        <span className={cn(
          "text-small font-mono tabular-nums font-semibold",
          isOverdue ? "text-danger" : "text-text-muted"
        )}>{elapsedTime}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-2 border p-4",
      isOverdue ? "bg-danger/5 border-danger/40" : "bg-surface-sunken border-border"
    )}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden /> Tempo de Espera
        </span>
        <span className={cn(
          "text-caption uppercase tracking-wider px-2 py-0.5 border",
          isOverdue
            ? "bg-danger/10 text-danger border-danger/25"
            : "bg-success/10 text-success border-success/25"
        )}>
          {isOverdue ? 'Prazo Vencido' : 'No Prazo'}
        </span>
      </div>

      <span
        className={cn(
          "text-display font-mono tabular-nums mt-2",
          isOverdue ? "text-danger" : "text-text"
        )}
        aria-label={`Tempo decorrido: ${elapsedTime}`}
      >
        {elapsedTime}
      </span>

      <div
        className="w-full h-1 bg-border mt-3 overflow-hidden"
        role="meter"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Consumo do prazo de SLA"
      >
        <div
          className={cn("h-full transition-all duration-1000", isOverdue ? "bg-danger" : "bg-brand")}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex justify-between items-center gap-3 mt-2">
        <span className={cn("text-caption", isOverdue ? "text-danger font-semibold" : "text-text-muted")}>
          {remainingTime}
        </span>
        <span className="text-caption font-mono tabular-nums text-text-subtle">
          Início: {new Date(startedAt).toLocaleDateString('pt-BR')} {new Date(startedAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  );
}
