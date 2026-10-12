'use client';

import React, { useEffect, useState, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ClipboardList,
  Users,
  Package,
  Plus,
  ArrowRight,
  X,
  Laptop,
  Banknote,
  Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  type: 'action' | 'order' | 'client' | 'product';
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
  badgeTone?: 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

const STATIC_ACTIONS: CommandItem[] = [
  {
    id: 'action-new-order',
    type: 'action',
    title: 'Nova Ordem de Serviço',
    subtitle: 'Cadastrar nova entrada de equipamento',
    href: '/dashboard/orders?new=true',
    badge: 'Criar',
    badgeTone: 'brand',
  },
  {
    id: 'action-orders',
    type: 'action',
    title: 'Ordens de Serviço',
    subtitle: 'Ver todas as ordens e chamados ativos',
    href: '/dashboard/orders',
  },
  {
    id: 'action-clients',
    type: 'action',
    title: 'Clientes',
    subtitle: 'Listagem de pessoas físicas e jurídicas',
    href: '/dashboard/clients',
  },
  {
    id: 'action-inventory',
    type: 'action',
    title: 'Estoque de Peças',
    subtitle: 'Consultar peças de reposição e estoque mínimo',
    href: '/dashboard/inventory',
  },
  {
    id: 'action-finance',
    type: 'action',
    title: 'Financeiro',
    subtitle: 'Fluxo de caixa, recebimentos e contas',
    href: '/dashboard/financeiro',
  },
  {
    id: 'action-settings',
    type: 'action',
    title: 'Configurações',
    subtitle: 'Ajustes da empresa, equipe e perfil',
    href: '/dashboard/settings',
  },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const searchInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CommandItem[]>(STATIC_ACTIONS);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-foco ao abrir e reset de busca
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(STATIC_ACTIONS);
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Busca assíncrona ao digitar com debounce
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setResults(STATIC_ACTIONS);
      setSelectedIndex(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const foundItems: CommandItem[] = [];

        // 1. Ações estáticas que combinam
        const matchingActions = STATIC_ACTIONS.filter(
          (a) =>
            a.title.toLowerCase().includes(trimmed) ||
            a.subtitle?.toLowerCase().includes(trimmed)
        );
        foundItems.push(...matchingActions);

        // 2. Busca em Ordens de Serviço (Supabase + fallback)
        try {
          const { data: osData } = await supabase
            .from('service_orders')
            .select('id, codigo_os, equipment_details, reported_problem, status')
            .or(`codigo_os.ilike.%${trimmed}%,equipment_details.ilike.%${trimmed}%,reported_problem.ilike.%${trimmed}%`)
            .limit(5);

          if (osData && osData.length > 0) {
            osData.forEach((os) => {
              foundItems.push({
                id: `order-${os.id}`,
                type: 'order',
                title: os.codigo_os ? `OS #${os.codigo_os}` : `OS #${os.id.slice(0, 8)}`,
                subtitle: os.equipment_details || os.reported_problem || 'Ordem de Serviço',
                href: `/dashboard/orders/${os.id}`,
                badge: os.status,
                badgeTone: os.status === 'Finalizado' ? 'success' : 'neutral',
              });
            });
          } else {
            // Fallback localStorage
            const localOrders = JSON.parse(localStorage.getItem('mock-orders') || '[]');
            const matches = localOrders
              .filter((o: any) =>
                (o.codigo_os && String(o.codigo_os).toLowerCase().includes(trimmed)) ||
                (o.equipment_details && String(o.equipment_details).toLowerCase().includes(trimmed)) ||
                (o.reported_problem && String(o.reported_problem).toLowerCase().includes(trimmed))
              )
              .slice(0, 5);

            matches.forEach((os: any) => {
              foundItems.push({
                id: `order-${os.id}`,
                type: 'order',
                title: os.codigo_os ? `OS #${os.codigo_os}` : `OS #${os.id.slice(0, 8)}`,
                subtitle: os.equipment_details || 'Ordem de Serviço',
                href: `/dashboard/orders/${os.id}`,
                badge: os.status,
                badgeTone: 'neutral',
              });
            });
          }
        } catch {
          // Erro de rede silencioso no search
        }

        // 3. Busca em Clientes
        try {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id, name, document, phone')
            .or(`name.ilike.%${trimmed}%,document.ilike.%${trimmed}%`)
            .limit(4);

          if (clientData && clientData.length > 0) {
            clientData.forEach((c) => {
              foundItems.push({
                id: `client-${c.id}`,
                type: 'client',
                title: c.name,
                subtitle: c.document ? `Doc: ${c.document}` : c.phone || 'Cliente',
                href: `/dashboard/clients/${c.id}`,
                badge: 'Cliente',
                badgeTone: 'info',
              });
            });
          } else {
            const localClients = JSON.parse(localStorage.getItem('mock-clients') || '[]');
            const matches = localClients
              .filter((c: any) =>
                (c.name && String(c.name).toLowerCase().includes(trimmed)) ||
                (c.document && String(c.document).toLowerCase().includes(trimmed))
              )
              .slice(0, 4);

            matches.forEach((c: any) => {
              foundItems.push({
                id: `client-${c.id}`,
                type: 'client',
                title: c.name,
                subtitle: c.document ? `Doc: ${c.document}` : 'Cliente',
                href: `/dashboard/clients/${c.id}`,
                badge: 'Cliente',
                badgeTone: 'info',
              });
            });
          }
        } catch {
          // Fallback silencioso
        }

        // 4. Busca em Estoque
        try {
          const { data: invData } = await supabase
            .from('inventory')
            .select('id, name, sku, quantity, brand')
            .or(`name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%`)
            .limit(4);

          if (invData && invData.length > 0) {
            invData.forEach((p) => {
              foundItems.push({
                id: `product-${p.id}`,
                type: 'product',
                title: p.name,
                subtitle: `Qtd: ${p.quantity} un ${p.sku ? `• SKU: ${p.sku}` : ''}`,
                href: `/dashboard/inventory?search=${encodeURIComponent(p.name)}`,
                badge: 'Estoque',
                badgeTone: 'neutral',
              });
            });
          }
        } catch {
          // Fallback silencioso
        }

        setResults(foundItems);
        setSelectedIndex(0);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Atalhos de teclado dentro da modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        router.push(selected.href);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const renderIcon = (type: CommandItem['type']) => {
    switch (type) {
      case 'order':
        return <ClipboardList className="w-4 h-4 text-brand shrink-0" aria-hidden />;
      case 'client':
        return <Users className="w-4 h-4 text-info shrink-0" aria-hidden />;
      case 'product':
        return <Package className="w-4 h-4 text-warning shrink-0" aria-hidden />;
      default:
        return <ArrowRight className="w-4 h-4 text-text-subtle shrink-0" aria-hidden />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Busca Global e Atalhos Rápidos"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:pt-[15vh]"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop acessível */}
      <button
        type="button"
        aria-label="Fechar busca global"
        onClick={onClose}
        className="fixed inset-0 bg-surface/75 backdrop-blur-md border-none cursor-pointer"
      />

      {/* Caixa de diálogo da paleta de comandos */}
      <div className="relative w-full max-w-xl bg-surface-raised border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho da busca */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-surface-sunken">
          <Search className="w-5 h-5 text-text-subtle shrink-0" aria-hidden />
          <input
            ref={inputRef}
            id={searchInputId}
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="command-results"
            aria-label="Digite para buscar ordens, clientes ou peças"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código de OS, cliente, equipamento ou atalho..."
            className="flex-1 bg-transparent text-body text-text placeholder:text-text-subtle border-none outline-none"
          />
          {loading && <LoadingSpinner className="w-4 h-4 text-brand animate-spin shrink-0" />}
          {query && !loading && (
            <button
              type="button"
              aria-label="Limpar campo de busca"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-text-subtle hover:text-text hover:bg-surface-overlay transition-colors"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-caption font-mono px-2 py-0.5 bg-surface border border-border rounded text-text-subtle">
            ESC
          </kbd>
        </div>

        {/* Lista de Resultados */}
        <div id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-small text-text-muted">
              Nenhum resultado encontrado para &quot;{query}&quot;.
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-surface-overlay text-text border border-border-strong'
                      : 'text-text-muted hover:text-text border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {renderIcon(item.type)}
                    <div className="min-w-0">
                      <p className="text-small font-semibold text-text truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-caption text-text-subtle truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <Badge tone={item.badgeTone || 'neutral'} className="shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Rodapé com dicas de atalho */}
        <div className="border-t border-border px-4 py-2.5 bg-surface-sunken/60 flex items-center justify-between text-caption text-text-subtle">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-surface border border-border px-1 py-0.5 rounded">↑</kbd>{' '}
              <kbd className="font-mono bg-surface border border-border px-1 py-0.5 rounded">↓</kbd> navegar
            </span>
            <span>
              <kbd className="font-mono bg-surface border border-border px-1 py-0.5 rounded">↵</kbd> selecionar
            </span>
          </div>
          <span>Trust Care Global Search</span>
        </div>
      </div>
    </div>
  );
}
