'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  ClipboardList, 
  Users, 
  Package, 
  BarChart3, 
  LogOut, 
  Wrench, 
  Building,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Settings,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Banknote,
  CreditCard,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CompanyProvider, useCompany } from '@/lib/context/CompanyContext';
import { UserProvider, useUser } from '@/lib/context/UserContext';
import OnboardingModal from '@/components/OnboardingModal';
import Image from 'next/image';
import SubscriptionBlockedScreen from '@/components/SubscriptionBlockedScreen';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui';

/**
 * Aparência de um item de navegação. Os três tipos de item (grupo
 * colapsável, link normal, sub-link) tinham a classe reescrita inline
 * com divergências de cor e de estado ativo em cada cópia.
 */
function navItemClasses({
  active,
  nested = false,
  collapsed = false,
}: {
  active: boolean;
  nested?: boolean;
  collapsed?: boolean;
}) {
  return cn(
    'flex items-center transition-colors duration-150 rounded-xl',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
    nested ? 'py-2 text-small font-medium' : 'py-2.5 text-body font-medium',
    active
      ? 'bg-brand text-brand-contrast'
      : 'text-text-muted hover:text-text hover:bg-surface-overlay',
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProvider>
      <UserProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </UserProvider>
    </CompanyProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const getHeaderTitle = () => {
    if (pathname === '/dashboard') return 'Painel de Controle';
    if (pathname.startsWith('/dashboard/orders')) return 'Ordens de Serviço';
    if (pathname.startsWith('/dashboard/clients')) return 'Clientes';
    if (pathname.startsWith('/dashboard/inventory')) return 'Controle de Estoque';
    if (pathname.startsWith('/dashboard/settings')) return 'Configurações';
    if (pathname.startsWith('/dashboard/financial') || pathname.startsWith('/dashboard/financeiro')) return 'Financeiro & Relatórios';
    if (pathname.startsWith('/dashboard/leads')) return 'Funil de Leads';
    if (pathname.startsWith('/dashboard/agenda')) return 'Agenda & Prazos';
    if (pathname.startsWith('/dashboard/services')) return 'Serviços';
    if (pathname.startsWith('/dashboard/usuarios')) return 'Usuários';
    return 'Painel de Controle';
  };
  const router = useRouter();
  const { company, isReadOnly } = useCompany();
  const { user, role, isAdmin, loading: userLoading } = useUser();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/dashboard/settings'));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/dashboard/settings')) {
      const timer = setTimeout(() => {
        setSettingsOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('os-theme');
    const timer = setTimeout(() => {
      if (storedTheme === 'light') {
        setTheme('light');
      } else if (storedTheme === 'dark') {
        setTheme('dark');
      } else {
        const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        setTheme(systemPrefersLight ? 'light' : 'dark');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('os-theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };


  const userName = user?.full_name || 'Usuário';
  const userRole = role === 'admin' ? 'Administrador' : role === 'technician' ? 'Técnico' : 'Recepcionista';

  if (userLoading || isLoggingOut) {
    return (
      <div className="min-h-screen bg-surface flex" aria-busy="true" aria-label="Carregando painel">
        {/* Sidebar skeleton */}
        <div className="w-64 bg-surface-raised border-r border-border flex flex-col shrink-0">
          <div className="h-16 border-b border-border flex items-center px-4 gap-3">
            <div className="w-8 h-8 bg-surface-overlay animate-pulse" />
            <div className="h-4 w-28 bg-surface-overlay animate-pulse" />
          </div>
          <div className="p-4 space-y-2">
            <div className="h-10 bg-surface-overlay animate-pulse" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 bg-surface-overlay animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-border bg-surface" />
          <div className="p-8 space-y-6">
            <div className="h-7 w-48 bg-surface-overlay animate-pulse" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-surface-raised border border-border animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
            <div className="h-64 bg-surface-raised border border-border animate-pulse" />
          </div>
        </div>
      </div>
    );
  }


  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem('os-session');
    document.cookie = "os-session-mock=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard & Relatórios', href: '/dashboard', icon: BarChart3 },
    { name: 'Funil de Leads', href: '/dashboard/leads', icon: TrendingUp },
    { name: 'Ordens de Serviço', href: '/dashboard/orders', icon: ClipboardList },
    { name: 'Agenda & Prazos', href: '/dashboard/agenda', icon: Calendar },
    ...(isAdmin ? [{ name: 'Financeiro', href: '/dashboard/financeiro', icon: Banknote }] : []),
    { name: 'Clientes', href: '/dashboard/clients', icon: Users },
    { name: 'Estoque', href: '/dashboard/inventory', icon: Package },
    { name: 'Serviços', href: '/dashboard/services', icon: Wrench },
    ...(isAdmin ? [
      { name: 'Usuários', href: '/dashboard/usuarios', icon: Users },
      { 
        name: 'Configurações', 
        icon: Settings,
        subItems: [
          { name: 'Meu Perfil', href: '/dashboard/settings/profile', icon: Users },
          { name: 'Dados da Empresa', href: '/dashboard/settings/company', icon: Building },
          { name: 'Equipe e Acessos', href: '/dashboard/settings/team', icon: Users },
          { name: 'Templates de Checklist', href: '/dashboard/settings/checklists', icon: ClipboardList },
          { name: 'Assinatura e Faturamento', href: '/dashboard/settings/billing', icon: CreditCard }
        ]
      }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-surface text-text flex">
      <OnboardingModal />
      {/* Sidebar - Drawer Responsivo / Collapsible (Oculto na Impressão) */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-surface-raised border-r border-border transition-all duration-300 print:hidden',
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20',
      )}>
        {/* Brand Logo & Toggle */}
        <div className={cn("flex border-b border-border shrink-0 transition-all duration-300", sidebarOpen ? "h-16 items-center justify-between px-4" : "flex-col items-center py-4 gap-4")}>
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <div className="flex items-center justify-center w-8 h-8 shrink-0 overflow-hidden bg-surface-sunken p-1 rounded-lg">
              {company.logo_url ? (
                <Image src={company.logo_url} alt={company.name} width={32} height={32} className="w-full h-full object-contain" />
              ) : (
                <Image src="/logo.png" alt="Trust Care" width={32} height={32} className="w-full h-full object-contain" />
              )}
            </div>
            {sidebarOpen && (
              <span className="text-h3 text-text truncate">
                {company.name}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
            className="p-1.5 shrink-0 text-text-muted hover:text-text hover:bg-surface-overlay rounded-lg transition-colors cursor-pointer hidden lg:flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" aria-hidden /> : <PanelLeftOpen className="w-5 h-5" aria-hidden />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain thin-scrollbar px-3 space-y-1 py-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;

            if ('subItems' in item && item.subItems) {
              const isSubActive = item.subItems.some(sub => pathname === sub.href);
              const groupButton = (
                <button
                  type="button"
                  aria-expanded={settingsOpen}
                  onClick={() => {
                    if (!sidebarOpen) {
                      setSidebarOpen(true);
                    }
                    setSettingsOpen(!settingsOpen);
                  }}
                  className={cn(
                    navItemClasses({ active: false, collapsed: !sidebarOpen }),
                    'w-full justify-between cursor-pointer',
                    isSubActive && 'text-brand',
                  )}
                >
                  <span className={cn("flex items-center min-w-0", sidebarOpen ? "gap-3" : "justify-center w-full")}>
                    <Icon className="w-5 h-5 shrink-0" aria-hidden />
                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                  </span>
                  {sidebarOpen && (
                    settingsOpen
                      ? <ChevronDown className="w-4 h-4 shrink-0" aria-hidden />
                      : <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
                  )}
                </button>
              );

              return (
                <div key={`sub-group-${index}`} className="space-y-1 relative group">
                  {!sidebarOpen ? (
                    <Tooltip content={item.name}>
                      {groupButton}
                    </Tooltip>
                  ) : (
                    groupButton
                  )}
                  {settingsOpen && sidebarOpen && (
                    <div className="pl-6 space-y-1 mt-1">
                      {item.subItems.map((sub) => {
                        const isActive = pathname === sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setSidebarOpen(false);
                              }
                            }}
                            className={navItemClasses({ active: isActive, nested: true })}
                          >
                            <SubIcon className="w-4 h-4 shrink-0" aria-hidden />
                            <span className="truncate">{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Normal Link
            const isActive = pathname === item.href;
            const linkElement = (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (item.href === '/dashboard/inventory') {
                    window.dispatchEvent(new Event('nav-estoque-click'));
                  }
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={navItemClasses({ active: isActive, collapsed: !sidebarOpen })}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden />
                {sidebarOpen ? (
                  <span className="truncate">{item.name}</span>
                ) : (
                  <span className="sr-only">{item.name}</span>
                )}
              </Link>
            );

            return (
              <div key={item.href} className="relative group">
                {!sidebarOpen ? (
                  <Tooltip content={item.name}>
                    {linkElement}
                  </Tooltip>
                ) : (
                  linkElement
                )}
              </div>
            );
          })}
        </nav>

        {/* User profile moved to top header */}
      </aside>

      {/* Overlay Backdrop - Apenas Mobile (Oculto na Impressão) */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          aria-hidden
          className="fixed inset-0 bg-surface/70 backdrop-blur-sm z-40 md:hidden print:hidden"
        />
      )}

      {/* Main Content Wrap */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'md:pl-64' : 'md:pl-20'} print:pl-0`}>
        {/* Header/Top Bar (Oculto na Impressão) */}
        <header className="h-16 border-b border-border bg-surface sticky top-0 z-10 flex items-center justify-between gap-4 px-6 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              className="p-1.5 shrink-0 text-text-muted hover:text-text hover:bg-surface-overlay transition-colors cursor-pointer lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Menu className="w-5 h-5" aria-hidden />
            </button>
            <h2 className="text-h3 text-text truncate">{getHeaderTitle()}</h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
              title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
              className="p-2 shrink-0 flex items-center justify-center text-text-muted hover:text-text border border-border bg-surface-raised hover:border-border-strong transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-lg"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" aria-hidden /> : <Sun className="w-4 h-4" aria-hidden />}
            </button>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 p-1 pr-3 bg-surface hover:bg-surface-overlay border border-border rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="w-8 h-8 shrink-0 rounded-full bg-brand/10 border border-brand/25 flex items-center justify-center text-brand font-semibold uppercase text-small overflow-hidden">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.full_name?.charAt(0) || 'U'
                    )}
                </div>
                <div className="hidden sm:block text-left min-w-0 max-w-[140px]">
                  <p className="text-small font-semibold text-text truncate">{userName}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-text-subtle" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-surface-sunken border border-border shadow-2xl rounded-2xl overflow-hidden z-50">
                    <div className="p-4 border-b border-border bg-surface">
                      <p className="text-sm font-bold text-text truncate">{userName}</p>
                      <p className="text-xs text-text-subtle truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link 
                        href="/dashboard/settings" 
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text hover:bg-surface-overlay rounded-lg transition-colors font-medium"
                      >
                        <Settings className="w-4 h-4 text-text-muted" />
                        Meu perfil
                      </Link>
                    </div>
                    <div className="p-2 border-t border-border bg-surface-raised">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {isReadOnly && (
          <div
            role="alert"
            className="bg-danger/10 border-b border-danger/25 text-danger px-6 py-2.5 text-center text-small font-medium flex items-center justify-center gap-2 print:hidden"
          >
            <span className="w-2 h-2 bg-danger shrink-0" aria-hidden />
            <span>Assinatura atrasada: A conta entrou em modo de apenas-leitura. Regularize o faturamento para reabilitar novas OS e cadastros.</span>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto overflow-x-hidden min-w-0 print:p-0">
          {company.subscription_status === 'canceled' || isReadOnly ? (
            <SubscriptionBlockedScreen companyName={company.name} status={company.subscription_status || ''} />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
