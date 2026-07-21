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

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        {/* Sidebar skeleton */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="h-16 border-b border-slate-800 flex items-center px-4 gap-3">
            <div className="w-8 h-8 bg-slate-800 animate-pulse" />
            <div className="h-4 w-28 bg-slate-800 animate-pulse" />
          </div>
          <div className="p-4 space-y-2">
            <div className="h-10 bg-slate-800/60 animate-pulse" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 bg-slate-800/40 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-slate-900 bg-slate-950/40" />
          <div className="p-8 space-y-6">
            <div className="h-7 w-48 bg-slate-800 animate-pulse" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-900 border border-slate-800 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
            <div className="h-64 bg-slate-900 border border-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
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
          { name: 'Dados da Empresa', href: '/dashboard/settings/company', icon: Building },
          { name: 'Equipe e Acessos', href: '/dashboard/settings/team', icon: Users },
          { name: 'Templates de Checklist', href: '/dashboard/settings/checklists', icon: ClipboardList },
          { name: 'Assinatura e Faturamento', href: '/dashboard/settings/billing', icon: CreditCard }
        ]
      }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <OnboardingModal />
      {/* Sidebar - Drawer Responsivo / Collapsible (Oculto na Impressão) */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 print:hidden 
        ${sidebarOpen 
          ? 'translate-x-0 w-64' 
          : '-translate-x-full md:translate-x-0 md:w-20'
        }
      `}>
        {/* Brand Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg text-white">
            <div className="flex items-center justify-center w-8 h-8 rounded-none overflow-hidden bg-white/10 p-1">
              {company.logo_url ? (
                <Image src={company.logo_url} alt={company.name} width={32} height={32} className="w-full h-full object-contain" />
              ) : (
                <Image src="/logo.png" alt="Trust Care" width={32} height={32} className="w-full h-full object-contain" />
              )}
            </div>
            {sidebarOpen && (
              <span className="tracking-tight text-white font-bold truncate max-w-[150px]">
                {company.name}
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
            className="p-1 text-slate-400 hover:text-white rounded-none hidden lg:block"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 py-4">
          {navItems.map((item, index) => {
            const Icon = item.icon;

            if ('subItems' in item && item.subItems) {
              const isSubActive = item.subItems.some(sub => pathname === sub.href);
              return (
                <div key={`sub-group-${index}`} className="space-y-1">
                  <button
                    onClick={() => {
                      if (!sidebarOpen) {
                        setSidebarOpen(true);
                      }
                      setSettingsOpen(!settingsOpen);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-none text-sm font-medium transition-all duration-200 ease-out cursor-pointer ${
                      isSubActive 
                        ? 'text-emerald-400 bg-slate-800/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0" />
                      {sidebarOpen && <span>{item.name}</span>}
                    </div>
                    {sidebarOpen && (
                      settingsOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                  {settingsOpen && sidebarOpen && (
                    <div className="pl-6 space-y-1 mt-1 animate-in slide-in-from-top-1 duration-150">
                      {item.subItems.map((sub) => {
                        const isActive = pathname === sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setSidebarOpen(false);
                              }
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-none text-xs font-semibold transition-all duration-200 ${
                              isActive 
                                ? 'bg-emerald-600 text-white shadow shadow-emerald-600/10' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/25'
                            }`}
                          >
                            <SubIcon className="w-4 h-4 shrink-0" />
                            <span>{sub.name}</span>
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
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.href === '/dashboard/inventory') {
                    window.dispatchEvent(new Event('nav-estoque-click'));
                  }
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-none text-sm font-medium transition-all duration-200 ease-out ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15' 
                    : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/40">
          {sidebarOpen && (
            <div className="flex items-center gap-3 p-2 rounded-none bg-slate-950/30 border border-slate-800/50 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold uppercase text-sm">
                {userName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">{userRole}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-none text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Overlay Backdrop - Apenas Mobile (Oculto na Impressão) */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200 print:hidden"
        />
      )}

      {/* Main Content Wrap */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'md:pl-64' : 'md:pl-20'} print:pl-0`}>
        {/* Header/Top Bar (Oculto na Impressão) */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-none md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-slate-200">{getHeaderTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-none border border-slate-800 bg-slate-900/40 transition-all cursor-pointer flex items-center justify-center"
              title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

          </div>
        </header>

        {isReadOnly && (
          <div className="bg-rose-950/40 border-b border-rose-900/60 text-rose-200 px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2 print:hidden">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
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
