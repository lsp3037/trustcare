'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  CardTitle,
  Button,
  buttonClasses,
  Badge,
  StatusBadge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  SkeletonCards,
  SkeletonTable,
  useToast,
  useConfirm,
} from '@/components/ui';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Key,
  Plus,
  RefreshCw,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  ClipboardList,
  Wrench,
  BarChart3,
  Calendar,
  Settings,
  ChevronRight,
  MoreHorizontal,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Banknote,
} from 'lucide-react';
import Image from 'next/image';

export default function PublicDesignPreviewPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'harden' | 'tokens'>('overview');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
      localStorage.setItem('os-theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('os-theme', 'dark');
    }
  };

  const handleTestRevoke = async (keyName: string) => {
    const ok = await confirm({
      title: 'Revogar Chave de API',
      description: `Tem certeza que deseja revogar a chave "${keyName}"? Todas as integrações externas que a utilizam perderão o acesso imediatamente.`,
      confirmLabel: 'Revogar Chave',
      cancelLabel: 'Cancelar',
      destructive: true,
    });

    if (ok) {
      toast.success('Chave de API revogada com sucesso', {
        description: 'Nenhum diálogo nativo bloqueante (alert) foi disparado.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface text-text flex">
      {/* ── SIDEBAR LATERAL OFICIAL (Fiel à versão de produção) ── */}
      <aside className={`shrink-0 bg-surface-raised/70 backdrop-blur-2xl border-r border-border min-h-screen flex flex-col justify-between hidden lg:flex transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div>
          {/* Logo / Header da Sidebar */}
          <div className={`flex border-b border-border shrink-0 transition-all duration-300 ${sidebarOpen ? 'h-16 items-center justify-between px-4' : 'flex-col items-center py-4 gap-4'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 shrink-0 overflow-hidden bg-brand/15 text-brand p-1 rounded-lg font-bold text-small border border-brand/30">
                TC
              </div>
              {sidebarOpen && (
                <span className="text-h3 text-text truncate">
                  Trust Care
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
              className="p-1.5 shrink-0 text-text-muted hover:text-text hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer hidden lg:flex items-center justify-center"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
          </div>

          {/* Navegação Principal 100% idêntica ao layout.tsx oficial */}
          <nav className="px-3 space-y-1 py-4 text-small">
            {/* 1. Dashboard & Relatórios (Ativo) */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-brand/10 text-brand font-semibold border border-brand/40 shadow-xs cursor-pointer">
              <BarChart3 className="w-5 h-5 shrink-0 text-brand" />
              {sidebarOpen && <span className="truncate">Dashboard & Relatór...</span>}
            </div>

            {/* 2. Funil de Leads */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <TrendingUp className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Funil de Leads</span>}
            </div>

            {/* 3. Ordens de Serviço */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <ClipboardList className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Ordens de Serviço</span>}
            </div>

            {/* 4. Agenda & Prazos */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <Calendar className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Agenda & Prazos</span>}
            </div>

            {/* 5. Financeiro */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <Banknote className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Financeiro</span>}
            </div>

            {/* 6. Clientes */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <Users className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Clientes</span>}
            </div>

            {/* 7. Estoque */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <Package className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Estoque</span>}
            </div>

            {/* 8. Serviços */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <Wrench className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Serviços</span>}
            </div>

            {/* 9. Usuários */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <Users className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Usuários</span>}
            </div>

            {/* 10. Configurações */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer">
              <span className="flex items-center gap-3 min-w-0">
                <Settings className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="truncate">Configurações</span>}
              </span>
              {sidebarOpen && <ChevronRight className="w-4 h-4 text-text-subtle" />}
            </div>
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="p-3 rounded-xl bg-surface-sunken border border-border">
              <span className="text-caption font-mono uppercase text-brand font-semibold block">Plano Pro Ativo</span>
              <span className="text-caption text-text-muted">Licença para 5 técnicos</span>
            </div>
          </div>
        )}
      </aside>

      {/* ── CONTEÚDO PRINCIPAL (COM CONTROLE DE LARGURA) ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header/Top Bar Oficial (Idêntico ao da produção) */}
        <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-h3 text-text truncate">Dashboard</h2>
            <Badge tone="brand" className="hidden md:inline-flex text-caption">Oficial Preservado</Badge>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Search Trigger Oficial (⌘K) */}
            <div
              onClick={() => toast.info('Busca Global (⌘K)', { description: 'Atalho e modal de busca permanecem 100% como no sistema oficial.' })}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-small text-text-subtle bg-surface-sunken hover:bg-surface-overlay border border-border hover:border-border-strong rounded-xl transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-text-subtle" />
              <span>Buscar OS, clientes, peças...</span>
              <kbd className="text-caption font-mono bg-surface-raised border border-border px-1.5 py-0.5 rounded text-text-subtle ml-1">
                ⌘K
              </kbd>
            </div>

            {/* Alternador de Densidade */}
            <div className="hidden lg:flex items-center bg-surface-sunken border border-border rounded-full p-1">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2.5 py-0.5 rounded-full text-caption font-medium transition-all cursor-pointer ${
                  density === 'comfortable' ? 'bg-surface-raised text-text shadow-xs' : 'text-text-muted hover:text-text'
                }`}
              >
                Confortável
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2.5 py-0.5 rounded-full text-caption font-medium transition-all cursor-pointer ${
                  density === 'compact' ? 'bg-brand text-brand-contrast font-semibold shadow-xs' : 'text-text-muted hover:text-text'
                }`}
              >
                Compacto
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
              className="w-9 h-9 shrink-0 flex items-center justify-center text-text-muted hover:text-text border border-border bg-surface-raised hover:border-border-strong rounded-xl transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-info" />}
            </button>

            {/* User Profile Pill Oficial */}
            <div className="flex items-center gap-3 p-1 pr-3 bg-surface hover:bg-surface-overlay border border-border rounded-full transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-brand/20 text-brand flex items-center justify-center font-bold text-caption border border-brand/30">
                TC
              </div>
              <div className="text-left hidden md:block">
                <p className="text-caption font-semibold text-text leading-tight">Trust Care T.I.</p>
                <p className="text-caption text-text-muted leading-tight">Administrador</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </div>
          </div>
        </header>

        {/* Corpo da Página — Limite de Largura Compacto */}
        <main className="p-6 max-w-6xl w-full mx-auto space-y-6 pb-16">
          
          {/* Faixa de Confirmação e Preservação */}
          <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption text-text">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-brand shrink-0"></span>
              <span>
                <strong>Sidebar, Topo e Busca (⌘K) Preservados:</strong> O menu lateral retrátil e a busca superior acima são os mesmos da sua versão atual e <strong>não serão modificados</strong>. As melhorias aplicam-se apenas aos cartões de indicadores, ao alerta de OS e à bancada.
              </span>
            </div>
            <Badge tone="brand" className="shrink-0">100% Preservado</Badge>
          </div>
          
          {/* Header da Página */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
            <div>
              <h1 className="text-h1 text-text">Painel de Controle</h1>
              <p className="text-small text-text-muted mt-0.5">
                Indicadores operacionais e movimentação da assistência técnica.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-surface-sunken border border-border text-caption text-text font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand"></span>
                Últimos 30 dias
              </div>
              <Button size="sm" icon={<Plus className="w-4 h-4" />}>
                Nova Ordem de Serviço
              </Button>
            </div>
          </div>

          {/* Seletor de Abas da Prévia */}
          <div className="flex gap-2 border-b border-border pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 rounded-full text-small font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-brand text-brand-contrast shadow-sm'
                  : 'bg-surface-raised text-text-muted hover:text-text hover:bg-surface-overlay border border-border'
              }`}
            >
              1. Dashboard Equilibrado
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`px-4 py-1.5 rounded-full text-small font-semibold transition-all cursor-pointer ${
                activeTab === 'api'
                  ? 'bg-brand text-brand-contrast shadow-sm'
                  : 'bg-surface-raised text-text-muted hover:text-text hover:bg-surface-overlay border border-border'
              }`}
            >
              2. Chaves de API (Sem Alert)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('harden')}
              className={`px-4 py-1.5 rounded-full text-small font-semibold transition-all cursor-pointer ${
                activeTab === 'harden'
                  ? 'bg-brand text-brand-contrast shadow-sm'
                  : 'bg-surface-raised text-text-muted hover:text-text hover:bg-surface-overlay border border-border'
              }`}
            >
              3. Hardening & Resiliência
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tokens')}
              className={`px-4 py-1.5 rounded-full text-small font-semibold transition-all cursor-pointer ${
                activeTab === 'tokens'
                  ? 'bg-brand text-brand-contrast shadow-sm'
                  : 'bg-surface-raised text-text-muted hover:text-text hover:bg-surface-overlay border border-border'
              }`}
            >
              4. Regras de Formas & Tokens
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
               ABA 1: DASHBOARD COMPACTO E PROPORCIONAL
               ───────────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Alerta de SLA Compacto */}
              <div className="p-3.5 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-warning/20 text-warning shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-small font-semibold text-warning">
                      Atenção: 2 ordens com diagnóstico pendente há mais de 48h
                    </p>
                    <p className="text-caption text-text-muted">
                      OS #0041 (MacBook Air) e OS #0049 (Dell Latitude) precisam de laudo hoje.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => toast.info('Filtrando ordens críticas.')}>
                  Ver Fila
                </Button>
              </div>

              {/* 4 Cards de KPI Proporcionais (1:1:1:1 — Sem Esticar) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <Card padding="sm" className="flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-caption uppercase tracking-wider text-text-muted">Faturamento</span>
                    <div className="p-1.5 rounded-xl bg-brand/15 text-brand">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-h2 font-mono tabular-nums text-text">R$ 18.740,50</p>
                    <p className="text-caption text-brand mt-0.5 font-medium">+14.2% no período</p>
                  </div>
                </Card>

                <Card padding="sm" className="flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-caption uppercase tracking-wider text-text-muted">OS Abertas</span>
                    <div className="p-1.5 rounded-xl bg-info/15 text-info">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-h2 font-mono tabular-nums text-text">14</p>
                    <p className="text-caption text-text-subtle mt-0.5">6 aguardando peças</p>
                  </div>
                </Card>

                <Card padding="sm" className="flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-caption uppercase tracking-wider text-text-muted">Ticket Médio</span>
                    <div className="p-1.5 rounded-xl bg-brand/15 text-brand">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-h2 font-mono tabular-nums text-text">R$ 382,45</p>
                    <p className="text-caption text-text-subtle mt-0.5">Por OS concluída</p>
                  </div>
                </Card>

                <Card padding="sm" className="flex flex-col justify-between bg-danger/5 border-danger/25">
                  <div className="flex items-start justify-between">
                    <span className="text-caption uppercase tracking-wider text-danger font-semibold">Estoque Baixo</span>
                    <div className="p-1.5 rounded-xl bg-danger/15 text-danger">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-h2 font-mono tabular-nums text-danger">3 itens</p>
                    <p className="text-caption text-danger mt-0.5 font-medium">Repor fornecedor</p>
                  </div>
                </Card>
              </div>

              {/* Grid 2/3 Tabela + 1/3 Financeiro (Estrutura Proporcional Real) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* 2/3: Tabela de Ordens Recentes */}
                <Card padding="md" className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div>
                      <CardTitle>Ordens de Serviço Recentes</CardTitle>
                      <p className="text-caption text-text-muted">Movimentação recente da bancada.</p>
                    </div>
                    <Link
                      href="/dashboard/orders"
                      className="text-small font-semibold text-brand hover:text-brand-hover flex items-center gap-1"
                    >
                      Ver todas <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <Table density={density}>
                    <THead>
                      <TR>
                        <TH className="w-16">OS</TH>
                        <TH className="w-44">Cliente</TH>
                        <TH>Equipamento</TH>
                        <TH className="w-36">Status</TH>
                        <TH align="right" className="w-28">Valor</TH>
                        <TH align="right" className="w-16">Ação</TH>
                      </TR>
                    </THead>
                    <TBody>
                      <TR>
                        <TD numeric className="font-semibold text-brand">#0049</TD>
                        <TD className="font-medium text-text truncate max-w-[150px]" title="Hospital São Lucas (PJ)">
                          Hospital São Lucas
                        </TD>
                        <TD className="text-text-muted truncate max-w-[170px]" title="Dell Latitude 5420 i7 16GB">
                          Dell Latitude 5420
                        </TD>
                        <TD>
                          <StatusBadge status="Em Análise" dot />
                        </TD>
                        <TD align="right" numeric className="font-semibold text-text">
                          R$ 680,00
                        </TD>
                        <TD align="right">
                          <button
                            type="button"
                            onClick={() => toast.info('Abrir OS #0049')}
                            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </TD>
                      </TR>

                      <TR>
                        <TD numeric className="font-semibold text-brand">#0048</TD>
                        <TD className="font-medium text-text truncate max-w-[150px]" title="Mariana Santos">
                          Mariana Santos
                        </TD>
                        <TD className="text-text-muted truncate max-w-[170px]" title="iPhone 14 Pro 128GB Roxo">
                          iPhone 14 Pro
                        </TD>
                        <TD>
                          <StatusBadge status="Aguardando Peças" dot />
                        </TD>
                        <TD align="right" numeric className="font-semibold text-text">
                          R$ 1.250,00
                        </TD>
                        <TD align="right">
                          <button
                            type="button"
                            onClick={() => toast.info('Abrir OS #0048')}
                            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </TD>
                      </TR>

                      <TR>
                        <TD numeric className="font-semibold text-brand">#0047</TD>
                        <TD className="font-medium text-text truncate max-w-[150px]" title="Carlos Eduardo Lima">
                          Carlos Eduardo
                        </TD>
                        <TD className="text-text-muted truncate max-w-[170px]" title="PlayStation 5 Edição Digital">
                          PlayStation 5
                        </TD>
                        <TD>
                          <StatusBadge status="Pronto para Retirada" dot />
                        </TD>
                        <TD align="right" numeric className="font-semibold text-text">
                          R$ 420,00
                        </TD>
                        <TD align="right">
                          <button
                            type="button"
                            onClick={() => toast.info('Abrir OS #0047')}
                            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-overlay transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </TD>
                      </TR>
                    </TBody>
                  </Table>
                </Card>

                {/* 1/3: Formas de Pagamento & Resumo Financeiro */}
                <Card padding="md" className="space-y-4">
                  <div className="pb-2 border-b border-border">
                    <CardTitle>Recebimentos</CardTitle>
                    <p className="text-caption text-text-muted">Distribuição por método.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-caption mb-1">
                        <span className="text-text font-medium">Pix</span>
                        <span className="font-mono tabular-nums text-text-muted">64% (R$ 11.993)</span>
                      </div>
                      <div className="w-full bg-surface-sunken h-2 rounded-full border border-border overflow-hidden">
                        <div className="bg-brand h-full rounded-full" style={{ width: '64%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-caption mb-1">
                        <span className="text-text font-medium">Cartão</span>
                        <span className="font-mono tabular-nums text-text-muted">26% (R$ 4.872)</span>
                      </div>
                      <div className="w-full bg-surface-sunken h-2 rounded-full border border-border overflow-hidden">
                        <div className="bg-info h-full rounded-full" style={{ width: '26%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-caption mb-1">
                        <span className="text-text font-medium">Boleto (PJ)</span>
                        <span className="font-mono tabular-nums text-text-muted">10% (R$ 1.874)</span>
                      </div>
                      <div className="w-full bg-surface-sunken h-2 rounded-full border border-border overflow-hidden">
                        <div className="bg-warning h-full rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-caption text-text-muted">
                    <span>Inadimplência:</span>
                    <strong className="text-brand font-mono">0.0%</strong>
                  </div>
                </Card>
              </div>

            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
               ABA 2: CHAVES DE API
               ───────────────────────────────────────────────────────────── */}
          {activeTab === 'api' && (
            <Card padding="md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-brand" /> Chaves de API (v1)
                  </CardTitle>
                  <p className="text-small text-text-muted mt-1">
                    Revogação com useConfirm() e useToast() sem bloquear a interface.
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => toast.success('Nova chave gerada: tc_live_89cd...')}
                >
                  Nova Chave de API
                </Button>
              </div>

              <div className="mt-4">
                <Table density={density}>
                  <THead>
                    <TR>
                      <TH>Nome</TH>
                      <TH>Prefixo</TH>
                      <TH>Escopos</TH>
                      <TH>Criada em</TH>
                      <TH>Status</TH>
                      <TH align="right">Ação</TH>
                    </TR>
                  </THead>
                  <TBody>
                    <TR>
                      <TD className="font-semibold text-text">ERP Bling Integração</TD>
                      <TD numeric className="text-text-muted">tc_live_7a9f...</TD>
                      <TD>
                        <Badge tone="neutral">orders:read,write</Badge>
                      </TD>
                      <TD numeric className="text-text-muted">12/04/2026</TD>
                      <TD>
                        <Badge tone="success">Ativa</Badge>
                      </TD>
                      <TD align="right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleTestRevoke('ERP Bling Integração')}
                        >
                          Revogar
                        </Button>
                      </TD>
                    </TR>
                  </TBody>
                </Table>
              </div>
            </Card>
          )}

          {/* ─────────────────────────────────────────────────────────────
               ABA 3: HARDENING
               ───────────────────────────────────────────────────────────── */}
          {activeTab === 'harden' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card padding="md" className="space-y-3">
                <div className="flex justify-between items-center">
                  <CardTitle>1. Textos Longos sem Quebra</CardTitle>
                  <Badge tone="brand">Truncate + Tooltip</Badge>
                </div>
                <p className="text-caption text-text-muted">
                  Descrições longas não esticam as linhas da tabela.
                </p>
                <div className="p-3 rounded-xl bg-surface-sunken border border-border">
                  <span className="text-small text-text truncate block font-medium" title="Notebook Dell G15 5530 13ª Geração Intel Core i7 16GB DDR5 SSD 512GB RTX 3050 com arranhões">
                    Notebook Dell G15 5530 13ª Geração Intel Core i7 16GB DDR5...
                  </span>
                </div>
              </Card>

              <Card padding="md" className="space-y-3">
                <div className="flex justify-between items-center">
                  <CardTitle>2. Erro de Rede com Retry</CardTitle>
                  <Badge tone="danger">Fail-Graceful</Badge>
                </div>
                <p className="text-caption text-text-muted">
                  Feedback claro com botão de ação imediata.
                </p>
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center justify-between gap-3">
                  <span className="text-small font-semibold text-danger">Falha ao sincronizar</span>
                  <Button size="sm" variant="secondary" onClick={() => toast.success('Reconectado.')}>
                    Tentar Novamente
                  </Button>
                </div>
              </Card>

              <Card padding="md" className="md:col-span-2 space-y-3">
                <CardTitle>3. Skeleton Loaders com Zero Layout Shift (CLS)</CardTitle>
                <SkeletonTable rows={3} columns={5} />
              </Card>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
               ABA 4: TOKENS & REGRAS
               ───────────────────────────────────────────────────────────── */}
          {activeTab === 'tokens' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card padding="md" className="space-y-3">
                <CardTitle>Geometria das Formas</CardTitle>
                <div className="space-y-2 text-small">
                  <div className="flex justify-between pb-1 border-b border-border">
                    <span className="text-text-muted">Botões/Badges:</span>
                    <span className="font-mono text-brand">rounded-full</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-border">
                    <span className="text-text-muted">Cards/Painéis:</span>
                    <span className="font-mono text-info">rounded-[20px]</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-border">
                    <span className="text-text-muted">Inputs/Selects:</span>
                    <span className="font-mono text-warning">rounded-xl</span>
                  </div>
                </div>
              </Card>

              <Card padding="md" className="space-y-3">
                <CardTitle>Tipografia IBM Plex</CardTitle>
                <div className="space-y-2 text-small">
                  <div className="flex justify-between pb-1 border-b border-border">
                    <span className="text-text-muted">Display/Títulos:</span>
                    <span className="font-semibold text-text">IBM Plex Condensed</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-border">
                    <span className="text-text-muted">Corpo:</span>
                    <span className="text-text">IBM Plex Sans</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-border">
                    <span className="text-text-muted">Valores/Datas:</span>
                    <span className="font-mono text-brand">IBM Plex Mono</span>
                  </div>
                </div>
              </Card>

              <Card padding="md" className="space-y-3">
                <CardTitle>Controle de Densidade</CardTitle>
                <p className="text-caption text-text-muted">
                  Use o alternador no topo para alternar entre a densidade <strong>Confortável</strong> e <strong>Compacta</strong> (ideal para técnicos em bancada com muitas OS na tela).
                </p>
              </Card>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
