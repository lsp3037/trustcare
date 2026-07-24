import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  LayoutDashboard,
  Radar,
  FileSignature,
  Package,
  BarChart3,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const metadata = {
  title: 'Trust Care | Plataforma de Gestão para Assistências Técnicas',
  description: 'Diga adeus às planilhas. Automatize suas ordens de serviço, orçamentos e controle de estoque com a Trust Care.',
};

const perforation = {
  backgroundImage:
    'radial-gradient(circle at 6px 6px, transparent 3px, currentColor 3.5px)',
  backgroundSize: '12px 16px',
  backgroundRepeat: 'repeat-x',
};

const steps = [
  { n: '01', title: 'Aguardando Equipamento', desc: 'Cliente traz o aparelho, você abre o protocolo em segundos.' },
  { n: '02', title: 'Em Análise', desc: 'Técnico registra o diagnóstico direto na ordem de serviço.' },
  { n: '03', title: 'Aguardando Aprovação', desc: 'Cliente recebe o link, revisa o valor e assina pelo celular.' },
  { n: '04', title: 'Em Execução', desc: 'Peças saem do estoque sozinhas, sem planilha paralela.' },
  { n: '05', title: 'Pronto p/ Retirada', desc: 'Aviso automático dispara e o cliente já sabe que pode buscar.' },
];

const manifest = [
  {
    code: '01',
    icon: LayoutDashboard,
    title: 'Painel Kanban',
    desc: 'Arraste ordens entre status e veja a fila da bancada em tempo real.',
  },
  {
    code: '02',
    icon: Radar,
    title: 'Rastreio do cliente',
    desc: 'Seu cliente acompanha o reparo pelo número do protocolo, sem te ligar toda hora.',
  },
  {
    code: '03',
    icon: FileSignature,
    title: 'Orçamento com assinatura',
    desc: 'Aprovação e assinatura digital do cliente, com IP e horário registrados.',
  },
  {
    code: '04',
    icon: Package,
    title: 'Controle de estoque',
    desc: 'Peças usadas na ordem descontam do estoque automaticamente.',
  },
  {
    code: '05',
    icon: BarChart3,
    title: 'Financeiro & relatórios',
    desc: 'Receita, despesas e exportação em CSV e PDF — sem planilha paralela.',
  },
  {
    code: '06',
    icon: Users,
    title: 'Multiusuário',
    desc: 'Técnicos e atendentes com permissões próprias. Saiba quem mexeu em quê.',
  },
];

const ctaButton =
  'inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider text-xs font-jetbrains px-6 py-3.5 rounded-none border-b-4 border-emerald-800 hover:border-emerald-600 active:border-b-0 active:translate-y-[2px] transition-all cursor-pointer';

const ghostButton =
  'inline-flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold uppercase tracking-wider text-xs font-jetbrains px-6 py-3.5 rounded-none transition-colors cursor-pointer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-zinc-900 bg-black/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Trust Care" width={28} height={28} className="object-contain" />
              <span className="font-jetbrains text-sm font-bold tracking-widest uppercase">Trust Care</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#bancada" className="text-xs font-jetbrains uppercase tracking-wider text-zinc-500 hover:text-emerald-400 transition-colors">Recursos</Link>
              <Link href="#como-funciona" className="text-xs font-jetbrains uppercase tracking-wider text-zinc-500 hover:text-emerald-400 transition-colors">Como Funciona</Link>
              <Link href="#planos" className="text-xs font-jetbrains uppercase tracking-wider text-zinc-500 hover:text-emerald-400 transition-colors">Planos</Link>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/login" className="text-xs font-jetbrains uppercase tracking-wider text-zinc-400 hover:text-white transition-colors">
                Entrar
              </Link>
              <Link href="/register" className={ctaButton + ' !px-4 !py-2.5'}>
                Testar Grátis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Pitch */}
          <div>
            <div className="inline-flex items-center gap-2 border border-zinc-800 text-zinc-400 text-[10px] font-jetbrains uppercase tracking-widest px-3 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Sistema de Ordem de Serviço
            </div>

            <h1 className="font-jetbrains text-4xl md:text-5xl font-bold tracking-tight leading-[1.15] mb-6 uppercase">
              Saia da planilha.<br />
              <span className="text-emerald-400">Entre no protocolo.</span>
            </h1>

            <p className="max-w-lg text-base md:text-lg text-zinc-400 leading-relaxed mb-10">
              Abra, diagnostique, orce e entregue cada reparo com um sistema que gera protocolo, rastreio online e assinatura digital do cliente — sem planilha, sem grupo de WhatsApp perdido.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/register" className={ctaButton}>
                Abrir Conta Grátis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="#como-funciona" className={ghostButton}>
                Como Funciona
              </Link>
            </div>
            <p className="mt-5 text-xs text-zinc-600 font-jetbrains uppercase tracking-wider">7 dias grátis · Sem cartão de crédito</p>
          </div>

          {/* Ticket artifact */}
          <div className="relative flex justify-center lg:justify-end select-none">
            {/* Duplicate stub peeking behind */}
            <div className="hidden sm:block absolute w-[280px] h-[340px] bg-zinc-950 border border-zinc-800 rotate-[7deg] translate-x-6 translate-y-4" />

            {/* Main ticket */}
            <div className="relative w-full max-w-[320px] bg-zinc-950 border border-zinc-800 -rotate-2 shadow-2xl font-mono">
              <div className="p-5 border-b border-dashed border-zinc-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Ordem de Serviço</p>
                    <p className="text-sm font-bold text-white mt-0.5">#TC-2026-0842</p>
                  </div>
                  <span className="border-2 border-dashed border-emerald-500 text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rotate-[-6deg]">
                    Aprovado
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600 uppercase tracking-wider">Cliente</span>
                  <span className="text-zinc-300">J. Ferreira</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600 uppercase tracking-wider shrink-0">Aparelho</span>
                  <span className="text-zinc-300 text-right">iPhone 13 Pro — Tela</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600 uppercase tracking-wider">Técnico</span>
                  <span className="text-zinc-300">R. Almeida</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-600 uppercase tracking-wider shrink-0">Entrega</span>
                  <span className="text-zinc-300">3 dias úteis</span>
                </div>
              </div>

              <div className="relative h-4 text-zinc-950">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 text-black" style={perforation} />
              </div>

              <div className="p-5 pt-1 flex justify-between items-center">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Valor Total</span>
                <span className="text-lg font-bold text-emerald-400">R$ 380,00</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Como Funciona (real status pipeline) ── */}
      <section id="como-funciona" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-[10px] font-jetbrains text-emerald-500 uppercase tracking-widest mb-3">Ciclo da Ordem de Serviço</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white max-w-xl">O mesmo fluxo que já acontece na sua bancada, só que rastreável do início ao fim.</h2>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-5 left-0 right-0 h-px bg-zinc-800" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-4">
              {steps.map((step) => (
                <div key={step.n} className="relative flex md:flex-col items-start md:items-center gap-4 md:gap-3 md:text-center">
                  <div className="relative z-10 shrink-0 w-10 h-10 flex items-center justify-center bg-black border border-zinc-700 text-emerald-400 font-jetbrains text-xs font-bold">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-xs font-jetbrains font-bold text-white uppercase tracking-wide">{step.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed max-w-[180px] md:mx-auto">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Manifesto de Recursos ── */}
      <section id="bancada" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900 bg-zinc-950/40">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-[10px] font-jetbrains text-emerald-500 uppercase tracking-widest mb-3">O Que Vai Na Bancada</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white max-w-xl">Um sistema por trás de cada ticket, do balcão ao financeiro.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {manifest.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.code}
                  className={`flex items-start gap-5 py-6 border-t border-zinc-900 ${idx % 2 === 0 ? 'md:pr-10' : 'md:pl-10 md:border-l'} ${idx >= manifest.length - 2 ? '' : ''}`}
                >
                  <span className="font-jetbrains text-[10px] text-zinc-600 border border-zinc-800 w-8 h-8 shrink-0 flex items-center justify-center mt-0.5">
                    {item.code}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-[10px] font-jetbrains text-emerald-500 uppercase tracking-widest mb-3">Planos</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">O preço de um lanche para profissionalizar sua oficina inteira.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-900 max-w-5xl mx-auto border border-zinc-900">
            {/* Starter */}
            <div className="bg-black p-8 flex flex-col relative">
              <div className="mb-6">
                <h3 className="font-jetbrains text-sm font-bold uppercase tracking-wide text-white mb-1.5">Starter</h3>
                <p className="text-zinc-500 text-xs">Para assistências de um homem só.</p>
              </div>
              <div className="mb-8 font-jetbrains">
                <span className="text-3xl font-bold text-white">R$ 29</span>
                <span className="text-zinc-500 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['1 usuário (admin)', 'O.S. ilimitadas', 'Cadastro de clientes', 'Orçamento em PDF'].map((f) => (
                  <li key={f} className="flex gap-3 text-zinc-400 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=starter" className={ghostButton + ' w-full !py-3'}>
                Assinar Starter
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-black p-8 flex flex-col relative">
              <span className="absolute top-6 right-6 border-2 border-dashed border-emerald-500 text-emerald-400 text-[9px] font-jetbrains font-bold uppercase tracking-widest px-2 py-1 rotate-[-4deg]">
                Mais Usado
              </span>
              <div className="mb-6">
                <h3 className="font-jetbrains text-sm font-bold uppercase tracking-wide text-emerald-400 mb-1.5">Pro</h3>
                <p className="text-zinc-500 text-xs">O ponto de equilíbrio para crescer.</p>
              </div>
              <div className="mb-8 font-jetbrains">
                <span className="text-3xl font-bold text-white">R$ 69</span>
                <span className="text-zinc-500 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['Até 3 usuários', 'Painel de rastreio público', 'Módulo financeiro', 'Aviso automático de status', 'Controle de estoque'].map((f) => (
                  <li key={f} className="flex gap-3 text-zinc-300 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=pro" className={ctaButton + ' w-full'}>
                Iniciar Teste Grátis
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-black p-8 flex flex-col relative">
              <div className="mb-6">
                <h3 className="font-jetbrains text-sm font-bold uppercase tracking-wide text-white mb-1.5">Premium</h3>
                <p className="text-zinc-500 text-xs">Para assistências de alto volume.</p>
              </div>
              <div className="mb-8 font-jetbrains">
                <span className="text-3xl font-bold text-white">R$ 149</span>
                <span className="text-zinc-500 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['Usuários ilimitados', 'Tudo do plano Pro', 'API para integrações', 'Suporte prioritário'].map((f) => (
                  <li key={f} className="flex gap-3 text-zinc-400 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=premium" className={ghostButton + ' w-full !py-3'}>
                Assinar Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-jetbrains text-2xl md:text-3xl font-bold text-white uppercase tracking-tight max-w-xl mx-auto mb-8">
          Pronto pra tirar a oficina da planilha?
        </h2>
        <Link href="/register" className={ctaButton}>
          Abrir Conta Grátis <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-900 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Trust Care" width={22} height={22} className="object-contain grayscale opacity-60" />
            <span className="font-jetbrains text-xs text-zinc-500 uppercase tracking-widest">Trust Care</span>
          </div>
          <div className="text-zinc-700 text-xs font-jetbrains">
            © {new Date().getFullYear()} Trust Care T.I. — Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
