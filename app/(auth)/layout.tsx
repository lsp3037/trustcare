import React from 'react';
import { ClipboardList, Users, Package, BarChart3, ShieldCheck } from 'lucide-react';

const features = [
  { icon: ClipboardList, text: 'Ordens de Serviço com timeline e rastreio público' },
  { icon: Users,         text: 'Gestão completa de clientes PF e PJ' },
  { icon: Package,       text: 'Controle de estoque com alertas de nível baixo' },
  { icon: BarChart3,     text: 'Dashboard de faturamento e relatórios por período' },
  { icon: ShieldCheck,   text: 'Multi-tenant seguro com isolamento por empresa' },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Painel Esquerdo — Marca e Proposta de Valor ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative p-12 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-500/8 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/8 blur-[120px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgb(148 163 184) 1px, transparent 1px),
              linear-gradient(90deg, rgb(148 163 184) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Trust Care Platform</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight mt-6">
            Gestão inteligente<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
              para assistências técnicas.
            </span>
          </h1>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-sm">
            Controle suas ordens de serviço, clientes e estoque em uma plataforma moderna, segura e multi-tenant.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3 group">
              <div className="mt-0.5 p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-slate-700">
            © {new Date().getFullYear()} Trust Care T.I. · Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ── Divisor vertical ── */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-slate-800 to-transparent shrink-0" />

      {/* ── Painel Direito — Formulário ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile ambient glow */}
        <div className="lg:hidden absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="lg:hidden absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/8 blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>

    </div>
  );
}
