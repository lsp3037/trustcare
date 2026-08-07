'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Radar,
  FileSignature,
  Package,
  BarChart3,
  Users,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  Wallet,
  ShieldAlert,
  Laptop,
  Search,
  Wrench,
  PackageCheck,
  DollarSign,
  TrendingUp,
  Check,
} from 'lucide-react';

/* ─── Data ─── */

const WHATSAPP_NUMBER = '65999620703';
const WHATSAPP_MESSAGE = 'Oi! Vi o Trust Care e queria ver o sistema funcionando antes de testar.';
const whatsappLink = `https://wa.me/55${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const dores = [
  {
    icon: ClipboardList,
    title: 'Controle total da sua bancada',
    desc: 'Sem um painel central, gabinetes, notebooks e componentes se misturam. Saiba exatamente qual máquina está aguardando peça, qual está em testes de estabilidade e o que já pode ser entregue.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: MessageCircle,
    title: 'Fim das mensagens "Meu PC já tá pronto?"',
    desc: 'Cada vez que você para uma montagem complexa ou limpeza térmica para responder o WhatsApp, perde foco. Automatize os avisos de status e deixe o cliente acompanhar o processo sozinho.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Controle de garantias de hardware',
    desc: 'Entregar um upgrade e não registrar os prazos das peças novas (como memórias, SSDs ou processadores) é prejuízo na certa. Registre prazos de peças e serviços direto na O.S.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Wallet,
    title: 'Você está pagando para consertar?',
    desc: 'O dinheiro entra, você repassa para fornecedores de peças, mas sobra quanto? Separe rapidamente o que é custo de hardware do que é o lucro real da sua mão de obra especializada.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
];

const steps = [
  { n: '01', icon: Laptop, title: 'Aguardando Equipamento', desc: 'Cliente traz o aparelho, você abre o protocolo em segundos.' },
  { n: '02', icon: Search, title: 'Em Análise', desc: 'Técnico registra o diagnóstico direto na ordem de serviço.' },
  { n: '03', icon: FileSignature, title: 'Aguardando Aprovação', desc: 'Cliente recebe o link, revisa o valor e assina pelo celular.' },
  { n: '04', icon: Wrench, title: 'Em Execução', desc: 'Peças saem do estoque sozinhas, sem planilha paralela.' },
  { n: '05', icon: PackageCheck, title: 'Pronto p/ Retirada', desc: 'Aviso automático dispara e o cliente já sabe que pode buscar.' },
];

const provas = [
  { label: 'Faturamento Realizado', value: 'R$ 18.700', icon: DollarSign, subtitle: 'Soma de OS concluídas', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Lucro Líquido', value: 'R$ 8.200', icon: CheckCircle2, subtitle: 'Descontando peças e fixos', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Ticket Médio', value: 'R$ 340', icon: TrendingUp, subtitle: 'Valor médio por OS paga', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { label: 'OS em Andamento', value: '27', icon: ClipboardList, subtitle: 'Aguardando aprovação ou peças', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

const manifest = [
  { icon: ClipboardList, title: 'Painel Kanban da bancada', desc: 'Arraste ordens entre status e veja em um só lugar quantos aparelhos estão parados e em qual etapa.' },
  { icon: Radar, title: 'Rastreio automático do cliente', desc: 'Seu cliente acompanha o reparo pelo número do protocolo e recebe aviso quando o status muda.' },
  { icon: ShieldAlert, title: 'Garantia documentada, não prometida', desc: 'Prazo de garantia sai automático em cada orçamento e PDF, com os termos do CDC.' },
  { icon: FileSignature, title: 'Orçamento com assinatura digital', desc: 'Cliente aprova e assina pelo celular, com IP e horário registrados.' },
  { icon: Package, title: 'Controle de estoque', desc: 'Peças usadas na ordem descontam do estoque sozinhas — sem planilha paralela.' },
  { icon: BarChart3, title: 'Financeiro com lucro líquido real', desc: 'Custo de peça, despesa fixa e faturamento entram automaticamente.' },
  { icon: Users, title: 'Funil de leads com follow-up', desc: 'Orçamento que demora esfria o lead. O funil mostra quem tá esperando resposta.' },
  { icon: Users, title: 'Multiusuário com permissões', desc: 'Técnicos e atendentes com acessos próprios. Você sabe quem mexeu em quê.' },
];

/* ─── Shared Styles (Apple HIG) ─── */

// Material: translucent frosted glass surface
const materialCard = 'bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-[20px]';
const materialCardHover = `${materialCard} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 hover:border-white/[0.12] transition-all duration-300`;

// Capsule button (primary)
const btnPrimary = 'inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-7 py-3 rounded-full active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer';

// Ghost button
const btnGhost = 'inline-flex items-center justify-center gap-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.15] text-white/80 hover:text-white font-medium text-sm px-7 py-3 rounded-full active:scale-[0.97] transition-all duration-200 cursor-pointer';

export default function PreviewLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white/90 antialiased selection:bg-emerald-500/30">

      {/* ── PREVIEW BANNER ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-black text-center text-xs font-semibold py-1.5 tracking-wide">
        ⚠️ PREVIEW — Versão temporária com Apple HIG. <Link href="/" className="underline underline-offset-2">Voltar para a versão atual</Link>
      </div>

      {/* ── Navigation (Material: translucent) ── */}
      <nav className="fixed top-6 w-full z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.06] rounded-full px-5 shadow-lg shadow-black/10">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Trust Care" width={24} height={24} className="object-contain" />
              <span className="text-sm font-semibold tracking-wide">Trust Care</span>
            </div>
            <div className="hidden md:flex items-center gap-7">
              <Link href="#dores" className="text-[13px] text-white/50 hover:text-white transition-colors duration-200">O Problema</Link>
              <Link href="#como-funciona" className="text-[13px] text-white/50 hover:text-white transition-colors duration-200">Como Funciona</Link>
              <Link href="#recursos" className="text-[13px] text-white/50 hover:text-white transition-colors duration-200">Recursos</Link>
              <Link href="#planos" className="text-[13px] text-white/50 hover:text-white transition-colors duration-200">Planos</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-[13px] text-white/50 hover:text-white transition-colors duration-200">
                Entrar
              </Link>
              <Link href="/register" className="bg-emerald-500 hover:bg-emerald-400 text-black text-[13px] font-semibold px-5 py-2 rounded-full active:scale-[0.97] transition-all duration-200 cursor-pointer">
                Testar Grátis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-44 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/[0.07] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-3 bg-white/[0.04] backdrop-blur-md border border-white/[0.06] text-white/60 text-[13px] px-5 py-2.5 rounded-full mb-8">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Feito em Cuiabá-MT, dentro de uma assistência técnica real
            </div>

            <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-6">
              Sua bancada sob controle.{' '}
              <span className="text-emerald-400">Seu cliente parou de ligar.</span>
            </h1>

            <p className="max-w-lg text-[17px] text-white/50 leading-relaxed mb-10">
              O Trust Care organiza cada aparelho que entra na sua assistência técnica — do diagnóstico até a entrega — com aviso automático de status, garantia documentada e financeiro fechando sozinho.
            </p>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link href="/register" className={btnPrimary}>
                  Testar Grátis <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="#como-funciona" className={btnGhost}>
                  Como Funciona
                </Link>
              </div>
              <p className="text-[13px] text-white/30">7 dias grátis · Sem cartão de crédito · Cancele quando quiser</p>
            </div>
          </div>

          {/* Ticket Card (Material/Depth) */}
          <div className="relative flex justify-center lg:justify-end select-none">
            {/* Shadow card behind */}
            <div className="hidden sm:block absolute w-[280px] h-[340px] bg-white/[0.02] border border-white/[0.04] rounded-[24px] rotate-[7deg] translate-x-6 translate-y-4" />

            <div className={`relative w-full max-w-[320px] bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-[24px] -rotate-2 shadow-2xl shadow-black/30 font-mono overflow-hidden`}>
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] text-white/30 uppercase tracking-widest">Ordem de Serviço</p>
                    <p className="text-sm font-bold text-white mt-1">#TC-2026-0842</p>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full">
                    Aprovado
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4 text-[13px]">
                <div className="flex justify-between"><span className="text-white/30">Cliente</span><span className="text-white/70">J. Ferreira</span></div>
                <div className="flex justify-between gap-4"><span className="text-white/30 shrink-0">Aparelho</span><span className="text-white/70 text-right">Notebook Acer Aspire 5 — Upgrade SSD</span></div>
                <div className="flex justify-between"><span className="text-white/30">Técnico</span><span className="text-white/70">R. Almeida</span></div>
                <div className="flex justify-between"><span className="text-white/30">Entrega</span><span className="text-white/70">3 dias úteis</span></div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

              <div className="p-6 flex justify-between items-center">
                <span className="text-[11px] text-white/30 uppercase tracking-widest">Valor Total</span>
                <span className="text-xl font-bold text-emerald-400">R$ 380,00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent max-w-4xl mx-auto" />

      {/* ── O Problema (Pain Points) ── */}
      <section id="dores" className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-emerald-400 text-[13px] font-medium mb-3 tracking-wide">O Problema</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              O caos não é falta de organização sua. É rodar uma assistência técnica sem sistema feito pra ela.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dores.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={materialCardHover + ' p-7 flex flex-col group'}
                >
                  <div className="mb-5">
                    <div className={`inline-flex p-3 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                  </div>
                  <h3 className="text-[17px] font-semibold text-white mb-2 leading-snug">{item.title}</h3>
                  <p className="text-[15px] text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent max-w-4xl mx-auto" />

      {/* ── Como Funciona ── */}
      <section id="como-funciona" className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-emerald-400 text-[13px] font-medium mb-3 tracking-wide">Ciclo da Ordem de Serviço</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              O mesmo fluxo que já acontece na sua bancada, só que rastreável do início ao fim.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={step.n} className={`${materialCardHover} p-6 flex flex-col items-center text-center group`}>
                  <div className="relative mb-4">
                    <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                      <StepIcon className="w-6 h-6" strokeWidth={1.8} />
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-white/[0.06] border border-white/[0.1] rounded-full flex items-center justify-center text-[10px] font-semibold text-white/50">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-white mb-1.5 leading-snug">{step.title}</h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Screenshots */}
          <div className="mt-24">
            <h3 className="text-2xl font-bold mb-4">
              Isto é o painel que a Trust Care usa na própria operação, agora — não uma tela de demonstração.
            </h3>

            <div className="space-y-16 mt-12">
              {/* Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className={`${materialCard} p-2 overflow-hidden order-1`}>
                  <Image src="/marketing/dashboard.png" alt="Dashboard Trust Care" width={1260} height={623} className="w-full h-auto rounded-[14px]" />
                </div>
                <div className="order-2">
                  <h4 className="text-xl font-semibold mb-3">Controle da bancada num painel só</h4>
                  <p className="text-[15px] text-white/40 leading-relaxed mb-5">
                    Quantas OS estão em análise, qual o ticket médio, quanto já faturou no mês — tudo num só lugar, sem abrir três planilhas pra descobrir.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['R$ 4.106,00 faturados', '5 OS em andamento', 'Ticket médio R$ 456,22'].map((tag) => (
                      <span key={tag} className="text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financeiro */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="order-2 lg:order-1">
                  <h4 className="text-xl font-semibold mb-3">Saiba se deu lucro, não só se girou dinheiro</h4>
                  <p className="text-[15px] text-white/40 leading-relaxed mb-5">
                    Custo de peça e despesa fixa entram automaticamente quando a OS fecha. O resultado é lucro líquido real.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Custos R$ 1.982,00', 'Lucro líquido R$ 2.124,00'].map((tag) => (
                      <span key={tag} className="text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className={`${materialCard} p-2 overflow-hidden order-1 lg:order-2`}>
                  <Image src="/marketing/financeiro.png" alt="Financeiro Trust Care" width={1261} height={657} className="w-full h-auto rounded-[14px]" />
                </div>
              </div>

              {/* Estoque */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className={`${materialCard} p-2 overflow-hidden order-1`}>
                  <Image src="/marketing/estoque.png" alt="Estoque Trust Care" width={1266} height={680} className="w-full h-auto rounded-[14px]" />
                </div>
                <div className="order-2">
                  <h4 className="text-xl font-semibold mb-3">Peça sob controle, sem depender de memória</h4>
                  <p className="text-[15px] text-white/40 leading-relaxed">
                    Peça usada numa OS desconta do estoque sozinha. Você sabe o que tem na prateleira antes de prometer prazo pro cliente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent max-w-4xl mx-auto" />

      {/* ── Confiança ── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-5">
              Isso não nasceu numa reunião de startup. Nasceu numa bancada em Cuiabá-MT.
            </h2>
            <p className="text-[15px] text-white/40 leading-relaxed">
              A Trust Care começou como uma assistência técnica de verdade — manutenção de PC, upgrade de hardware, suporte técnico pro cliente que só quer o computador funcionando. O sistema que você viu acima foi construído pra resolver o caos da nossa própria operação.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {provas.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className={materialCardHover + ' p-6 group'}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-2xl ${p.bg} ${p.color} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-4 h-4" strokeWidth={1.8} />
                    </div>
                  </div>
                  <p className="text-white/40 text-[13px] font-medium">{p.label}</p>
                  <h3 className="text-2xl font-bold text-white mt-1 mb-1 font-mono tabular-nums">{p.value}</h3>
                  <p className="text-[12px] text-white/25">{p.subtitle}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[12px] text-white/20 mt-4">Faturamento, lucro e ticket médio calculados automaticamente pelo sistema.</p>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent max-w-4xl mx-auto" />

      {/* ── Recursos ── */}
      <section id="recursos" className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-16">
            <p className="text-emerald-400 text-[13px] font-medium mb-3 tracking-wide">Recursos</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Só o que resolve o caos que você já conhece. Nada de lista solta de feature.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {manifest.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={materialCardHover + ' p-6 group'}>
                  <div className="mb-4">
                    <div className="inline-flex p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-2 leading-snug">{item.title}</h3>
                  <p className="text-[13px] text-white/35 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent max-w-4xl mx-auto" />

      {/* ── Pricing ── */}
      <section id="planos" className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-emerald-400 text-[13px] font-medium mb-3 tracking-wide">Planos</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              O preço de um lanche para profissionalizar sua oficina inteira.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {/* Starter */}
            <div className={`${materialCard} p-8 flex flex-col`}>
              <div className="mb-6">
                <h3 className="text-[15px] font-semibold text-white mb-1">Starter</h3>
                <p className="text-white/30 text-[13px]">Para assistências de um homem só.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">R$ 29</span>
                <span className="text-white/30 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {['1 usuário (admin)', 'O.S. ilimitadas', 'Cadastro de clientes', 'Orçamento em PDF'].map((f) => (
                  <li key={f} className="flex gap-3 text-white/50 text-[14px]"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=starter" className={btnGhost + ' w-full justify-center'}>
                Assinar Starter
              </Link>
            </div>

            {/* Pro (featured) */}
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-b from-emerald-500/30 to-transparent rounded-[21px] pointer-events-none" />
              <div className={`${materialCard} p-8 flex flex-col relative`}>
                <div className="absolute top-6 right-6">
                  <span className="bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold px-3 py-1.5 rounded-full">
                    Mais Usado
                  </span>
                </div>
                <div className="mb-6">
                  <h3 className="text-[15px] font-semibold text-emerald-400 mb-1">Pro</h3>
                  <p className="text-white/30 text-[13px]">O ponto de equilíbrio para crescer.</p>
                </div>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">R$ 69</span>
                  <span className="text-white/30 text-sm">,90/mês</span>
                </div>
                <ul className="space-y-3 mb-10 flex-1">
                  {['Até 3 usuários', 'Painel de rastreio público', 'Módulo financeiro', 'Aviso automático de status', 'Controle de estoque'].map((f) => (
                    <li key={f} className="flex gap-3 text-white/60 text-[14px]"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} /> {f}</li>
                  ))}
                </ul>
                <Link href="/register?plan=pro" className={btnPrimary + ' w-full justify-center'}>
                  Iniciar Teste Grátis
                </Link>
              </div>
            </div>

            {/* Premium */}
            <div className={`${materialCard} p-8 flex flex-col`}>
              <div className="mb-6">
                <h3 className="text-[15px] font-semibold text-white mb-1">Premium</h3>
                <p className="text-white/30 text-[13px]">Para assistências de alto volume.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">R$ 149</span>
                <span className="text-white/30 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {['Usuários ilimitados', 'Tudo do plano Pro', 'API para integrações', 'Suporte prioritário'].map((f) => (
                  <li key={f} className="flex gap-3 text-white/50 text-[14px]"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=premium" className={btnGhost + ' w-full justify-center'}>
                Assinar Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.04] to-transparent pointer-events-none" />
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-xl mx-auto mb-4">
            Sua bancada sob controle. Seu cliente parou de ligar.
          </h2>
          <p className="text-white/30 text-[14px] mb-8">Sem cartão de crédito · Cancele quando quiser</p>
          <Link href="/register" className={btnPrimary}>
            Testar Grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Trust Care" width={20} height={20} className="object-contain opacity-40" />
            <span className="text-[13px] text-white/30">Trust Care</span>
          </div>
          <div className="text-white/20 text-[12px]">
            © {new Date().getFullYear()} Trust Care T.I. — Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
