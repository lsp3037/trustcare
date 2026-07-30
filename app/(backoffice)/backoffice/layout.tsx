import { ReactNode } from 'react';
import { Building2, Settings, Users, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'God Mode | Trust Care',
  description: 'Painel Administrativo da Plataforma',
};

export default function BackofficeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col justify-between border-r border-slate-800 bg-slate-900 z-10 hidden md:flex">
        <div>
          <div className="p-6 flex items-center space-x-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <h1 className="text-h2 text-white uppercase">God Mode</h1>
          </div>
          <nav className="mt-6 px-4 space-y-2">
            <Link
              href="/backoffice"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20"
            >
              <Building2 className="w-5 h-5" />
              <span>Tenants (Empresas)</span>
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Modo Deus</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <h1 className="text-h3">God Mode</h1>
          </div>
          <Link href="/dashboard" className="text-slate-400">
            <LogOut className="w-5 h-5" />
          </Link>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
