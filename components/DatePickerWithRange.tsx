'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonClasses } from '@/components/ui';

interface DateRange {
  from: Date;
  to: Date;
}

interface DatePickerWithRangeProps {
  onChange: (range: DateRange) => void;
  defaultPreset?: string;
}

export default function DatePickerWithRange({ onChange, defaultPreset = 'Últimos 30 dias' }: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState(defaultPreset);

  // Intervalo selecionado
  const [from, setFrom] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  // Mês de visualização no calendário
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha popover ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Notifica mudanças para o componente pai
  const handleRangeChange = (newFrom: Date, newTo: Date, presetName?: string) => {
    setFrom(newFrom);
    setTo(newTo);
    if (presetName) {
      setPreset(presetName);
    } else {
      setPreset('Personalizado');
    }
    onChange({ from: newFrom, to: newTo });
  };

  // Aplicação dos Presets
  const applyPreset = (presetName: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let newFrom = new Date(today);
    const newTo = new Date(endOfToday);

    switch (presetName) {
      case 'Hoje':
        // Hoje já configurado
        break;
      case 'Últimos 7 dias':
        newFrom.setDate(today.getDate() - 6);
        break;
      case 'Últimos 30 dias':
        newFrom.setDate(today.getDate() - 29);
        break;
      case 'Este Mês':
        newFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      default:
        break;
    }

    setViewDate(new Date(newTo));
    handleRangeChange(newFrom, newTo, presetName);
    setIsOpen(false);
  };

  // Lógica do Calendário
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0: Dom, 1: Seg, ...

  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dayNum: number) => {
    const clickedDate = new Date(year, month, dayNum);
    
    if (!from || (from && to)) {
      // Primeiro clique: define data inicial
      clickedDate.setHours(0, 0, 0, 0);
      setFrom(clickedDate);
      setTo(null as any);
      setPreset('Personalizado');
    } else if (from && !to) {
      // Segundo clique: define data final
      if (clickedDate < from) {
        clickedDate.setHours(0, 0, 0, 0);
        setFrom(clickedDate);
      } else {
        clickedDate.setHours(23, 59, 59, 999);
        handleRangeChange(from, clickedDate);
        setIsOpen(false);
      }
    }
  };

  const isSelected = (dayNum: number) => {
    const d = new Date(year, month, dayNum);
    d.setHours(0, 0, 0, 0);
    
    if (from && from.getTime() === d.getTime()) return true;
    if (to && to.getTime() === new Date(year, month, dayNum, 23, 59, 59, 999).getTime()) return true;
    return false;
  };

  const isInRange = (dayNum: number) => {
    if (!from || !to) return false;
    const d = new Date(year, month, dayNum);
    return d > from && d < to;
  };

  const formatButtonLabel = () => {
    if (!from) return 'Selecione o período';
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    };

    if (from && !to) {
      return `${formatDate(from)} - ...`;
    }

    return `${formatDate(from)} - ${formatDate(to)}`;
  };

  // Carrega o preset inicial na montagem
  useEffect(() => {
    onChange({ from, to });
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Botão de Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Período: ${formatButtonLabel()} (${preset})`}
        className={buttonClasses({
          variant: 'secondary',
          className: 'gap-2',
        })}
      >
        <CalendarIcon className="w-4 h-4 text-text-subtle" aria-hidden />
        <span className="font-mono tabular-nums">{formatButtonLabel()}</span>
        <span className="text-caption text-text-subtle bg-surface-sunken border border-border px-1.5 py-0.5">
          {preset}
        </span>
      </button>

      {/* Popover do Calendário e Presets */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-surface-overlay border border-border shadow-2xl z-[100] flex p-4 gap-4">

          {/* Painel Esquerdo: Presets */}
          <div className="w-36 flex flex-col gap-1 border-r border-border pr-4">
            <span className="text-caption uppercase tracking-wider text-text-subtle mb-2 pl-2">Filtros Rápidos</span>
            {['Hoje', 'Últimos 7 dias', 'Últimos 30 dias', 'Este Mês'].map((pName) => (
              <button
                key={pName}
                type="button"
                aria-current={preset === pName || undefined}
                onClick={() => applyPreset(pName)}
                className={`w-full text-left px-2.5 py-1.5 text-small font-semibold border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  preset === pName
                    ? 'bg-brand/10 text-brand border-brand/25'
                    : 'text-text-muted hover:text-text hover:bg-surface-sunken border-transparent'
                }`}
              >
                {pName}
              </button>
            ))}
          </div>

          {/* Painel Direito: Calendário */}
          <div className="w-[230px] flex flex-col">
            {/* Header do Calendário */}
            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                className="p-1 text-text-muted hover:text-text hover:bg-surface-sunken transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-small font-semibold text-text">
                {monthsNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                className="p-1 text-text-muted hover:text-text hover:bg-surface-sunken transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Cabeçalho da Semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-caption text-text-subtle uppercase tracking-wider mb-1">
              <span>D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Grid dos Dias */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Células Vazias no Início do Mês */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="w-7 h-7" />
              ))}

              {/* Dias do Mês */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const selected = isSelected(dayNum);
                const ranged = isInRange(dayNum);

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleDayClick(dayNum)}
                    aria-pressed={selected}
                    className={`w-7 h-7 text-small font-mono tabular-nums transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                      selected
                        ? 'bg-brand text-brand-contrast font-semibold'
                        : ranged
                        ? 'bg-brand/10 text-brand'
                        : 'text-text-muted hover:bg-surface-sunken hover:text-text'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
