import { ReactNode } from 'react';
import { Building2, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isPlatformAdmin, logPlatformAudit } from '@/lib/auth/platformAdmin';

export const metadata = {
  title: 'God Mode | Trust Care',
  description: 'Painel Administrativo da Plataforma',
};

export default async function BackofficeLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa em profundidade no servidor: valida super-admin diretamente no layout (F-32)
  if (!user || !isPlatformAdmin(user)) {
    redirect('/dashboard');
  }

  // Registra acesso de auditoria
  const headerList = await headers();
  const clientIp =
    headerList.get('x-real-ip') ||
    headerList.get('cf-connecting-ip') ||
    headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';

  await logPlatformAudit({
    userId: user.id,
    email: user.email,
    action: 'backoffice.access',
    ipAddress: clientIp,
  });

  return (
    <div className="flex h-screen bg-surface text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col justify-between border-r border-border bg-surface-raised z-10 hidden md:flex">
        <div>
          <div className="p-6 flex items-center space-x-3">
            <ShieldAlert className="w-8 h-8 text-danger" />
            <h1 className="text-h2 text-white uppercase">God Mode</h1>
          </div>
          <nav className="mt-6 px-4 space-y-2">
            <Link
              href="/backoffice"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-danger/10 text-danger hover:bg-danger/20"
            >
              <Building2 className="w-5 h-5" />
              <span>Tenants (Empresas)</span>
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-border">
          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-surface-overlay text-text hover:bg-surface-overlay"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Modo Deus</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-surface-raised">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-danger" />
            <h1 className="text-h3">God Mode</h1>
          </div>
          <Link
            href="/dashboard"
            className="p-2 text-text-muted hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </Link>
        </header>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
