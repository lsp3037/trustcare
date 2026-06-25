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
  User,
  Building,
  Menu,
  X,
  Sun,
  Moon,
  Settings,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CompanyProvider, useCompany } from '@/lib/context/CompanyContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </CompanyProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { company } = useCompany();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('Desenvolvedor');
  const [userRole, setUserRole] = useState('Admin');
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const storedTheme = localStorage.getItem('os-theme');
    if (storedTheme === 'light') {
      setTheme('light');
    } else if (storedTheme === 'dark') {
      setTheme('dark');
    } else {
      const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      setTheme(systemPrefersLight ? 'light' : 'dark');
    }
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

  useEffect(() => {
    const fetchUserData = async () => {
      // 1. Tenta obter sessão local (mock)
      const mockSession = localStorage.getItem('os-session');
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        setUserName(parsed.email.split('@')[0]);
        const role = parsed.role || 'admin';
        setIsAdmin(role === 'admin');
        setUserRole(role === 'admin' ? 'Administrador' : role === 'tecnico' ? 'Técnico' : 'Recepcionista');
      }

      // 2. Tenta do Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário');
        
        // Busca o profile no banco de dados para ver a role real
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          const role = profile.role || 'admin';
          setIsAdmin(role === 'admin');
          setUserRole(role === 'admin' ? 'Administrador' : role === 'technician' ? 'Técnico' : 'Recepcionista');
        }
      } else if (!mockSession) {
        // Redireciona para o login se não houver nenhuma sessão
        router.push('/login');
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('os-session');
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard & Relatórios', href: '/dashboard', icon: BarChart3 },
    { name: 'Funil de Leads', href: '/dashboard/leads', icon: TrendingUp },
    { name: 'Ordens de Serviço', href: '/dashboard/orders', icon: ClipboardList },
    { name: 'Clientes', href: '/dashboard/clients', icon: Users },
    { name: 'Estoque', href: '/dashboard/inventory', icon: Package },
    { name: 'Serviços', href: '/dashboard/services', icon: Wrench },
    ...(isAdmin ? [
      { name: 'Usuários', href: '/usuarios', icon: Users },
      { name: 'Sistema', href: '/dashboard/system', icon: Settings }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
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
            <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden bg-white/10 p-1">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
              ) : (
                <img src="/logo.png" alt="Trust Care" className="w-full h-full object-contain" />
              )}
            </div>
            {sidebarOpen && (
              <span className="tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate max-w-[150px]">
                {company.name}
              </span>
            )}
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-slate-400 hover:text-white rounded-md hidden lg:block">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant/Company Info Card */}
        {sidebarOpen && (
          <div className="mx-4 my-4 p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenant Ativo</p>
              <p className="text-sm font-bold text-slate-200 truncate">{company.name}</p>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.href === '/dashboard/inventory') {
                    window.dispatchEvent(new Event('nav-estoque-click'));
                  }
                  // Auto-fechamento do drawer se estiver em tela mobile (< 768px)
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out ${
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
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/30 border border-slate-800/50 mb-3">
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
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
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
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg md:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-slate-200">Painel de Controle</h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-455 hover:text-slate-200 hover:bg-slate-800/40 rounded-lg border border-slate-800 bg-slate-900/40 transition-all cursor-pointer flex items-center justify-center"
              title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-semibold bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              Conexão Supabase OK
            </span>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
