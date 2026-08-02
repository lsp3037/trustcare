import Link from 'next/link';
import Image from 'next/image';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import {
  ArrowRight,
  Radar,
  FileSignature,
  Package,
  BarChart3,
  Users,
  CheckCircle2,
  ClipboardList,
  PhoneCall,
  MessageCircle,
  ShieldCheck,
  Wallet,
  ShieldAlert,
  TrendingDown,
  Laptop,
  Search,
  Wrench,
  PackageCheck,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/WhatsAppButton';

export const metadata = {
  title: 'Trust Care | Sistema de Gestão para Assistências Técnicas',
  description: 'O sistema de ordem de serviço nascido dentro de uma assistência técnica de verdade. Bancada organizada, cliente avisado sozinho e financeiro com lucro real — não estimado.',
};

const WHATSAPP_NUMBER = '65999620703';
const WHATSAPP_MESSAGE = 'Oi! Vi o Trust Care e queria ver o sistema funcionando antes de testar.';
const whatsappLink = `https://wa.me/55${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const perforation = {
  backgroundImage:
    'radial-gradient(circle at 6px 6px, transparent 3px, currentColor 3.5px)',
  backgroundSize: '12px 16px',
  backgroundRepeat: 'repeat-x',
};

const dores = [
  {
    code: '01',
    icon: ClipboardList,
    title: 'Controle total da sua bancada',
    desc: 'Sem um painel central, gabinetes, notebooks e componentes se misturam. Saiba exatamente qual máquina está aguardando peça, qual está em testes de estabilidade e o que já pode ser entregue.',
  },
  {
    code: '02',
    icon: MessageCircle,
    title: 'Fim das mensagens "Meu PC já tá pronto?"',
    desc: 'Cada vez que você para uma montagem complexa ou limpeza térmica para responder o WhatsApp, perde foco. Automatize os avisos de status e deixe o cliente acompanhar o processo sozinho.',
  },
  {
    code: '03',
    icon: ShieldCheck,
    title: 'Controle de garantias de hardware',
    desc: 'Entregar um upgrade e não registrar os prazos das peças novas (como memórias, SSDs ou processadores) é prejuízo na certa. Registre prazos de peças e serviços direto na O.S.',
  },
  {
    code: '04',
    icon: Wallet,
    title: 'Você está pagando para consertar?',
    desc: 'O dinheiro entra, você repassa para fornecedores de peças, mas sobra quanto? Separe rapidamente o que é custo de hardware do que é o lucro real da sua mão de obra especializada.',
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
  {
    label: 'Faturamento Realizado',
    value: 'R$ 18.700,00',
    icon: DollarSign,
    tag: 'No período',
    subtitle: 'Soma de OS concluídas / entregues',
    iconClass: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    label: 'Lucro Líquido',
    value: 'R$ 8.200,00',
    icon: CheckCircle2,
    tag: 'Livre',
    subtitle: 'Já descontando custo de peças e fixos',
    iconClass: 'bg-blue-500/15 text-blue-400',
  },
  {
    label: 'Ticket Médio',
    value: 'R$ 340,00',
    icon: TrendingUp,
    tag: 'Caixa',
    subtitle: 'Valor médio por OS paga',
    iconClass: 'bg-indigo-500/15 text-indigo-400',
  },
  {
    label: 'OS em Andamento',
    value: '27',
    icon: ClipboardList,
    tag: 'Em progresso',
    subtitle: 'Aguardando aprovação ou peças',
    iconClass: 'bg-amber-500/15 text-amber-400',
  },
];

const manifest = [
  {
    code: '01',
    icon: ClipboardList,
    title: 'Painel Kanban da bancada',
    desc: 'Arraste ordens entre status e veja em um só lugar quantos aparelhos estão parados e em qual etapa. Resolve o "onde tá cada aparelho".',
  },
  {
    code: '02',
    icon: Radar,
    title: 'Rastreio automático do cliente',
    desc: 'Seu cliente acompanha o reparo pelo número do protocolo e recebe aviso quando o status muda. Resolve o "e aí, ficou pronto?".',
  },
  {
    code: '03',
    icon: ShieldAlert,
    title: 'Garantia documentada, não prometida',
    desc: 'Prazo de garantia sai automático em cada orçamento e PDF, com os termos do CDC — em vez de ficar só na palavra.',
  },
  {
    code: '04',
    icon: FileSignature,
    title: 'Orçamento com assinatura digital',
    desc: 'Cliente aprova e assina pelo celular, com IP e horário registrados. Orçamento não emperra esperando confirmação por WhatsApp.',
  },
  {
    code: '05',
    icon: Package,
    title: 'Controle de estoque',
    desc: 'Peças usadas na ordem descontam do estoque sozinhas — sem planilha paralela pra saber o que ainda tem na prateleira.',
  },
  {
    code: '06',
    icon: BarChart3,
    title: 'Financeiro com lucro líquido real',
    desc: 'Custo de peça, despesa fixa e faturamento entram automaticamente. No fim do mês você sabe se deu lucro, não só se girou dinheiro.',
  },
  {
    code: '07',
    icon: Users,
    title: 'Funil de leads com follow-up',
    desc: 'Orçamento que demora esfria o lead. O funil mostra quem tá esperando resposta antes que vire cliente do concorrente.',
  },
  {
    code: '08',
    icon: Users,
    title: 'Multiusuário com permissões',
    desc: 'Técnicos e atendentes com acessos próprios. Você sabe quem mexeu em quê, sem dividir uma senha só.',
  },
];

const ctaButton =
  'inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider text-xs font-jetbrains px-6 py-2.5 rounded-full border-b-4 border-emerald-800 active:border-b-0 active:translate-y-[2px] hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer';

const ghostButton =
  'inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-bold uppercase tracking-wider text-xs font-jetbrains px-6 py-2.5 rounded-full hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer';

const whatsappTextLink =
  'inline-flex items-center gap-2 text-slate-500 hover:text-emerald-400 text-xs font-jetbrains uppercase tracking-wider transition-colors cursor-pointer';

export default function LandingPage() {
  return (
    <ReactLenis root options={{ lerp: 0.1, anchors: true }}>
    {/* `theme-dark`: a landing tem visual próprio e fixo, sem alternador. Sem
        o escopo, a preferência clara salva no dashboard invertia as escalas
        `slate-*` que esta página usa e a landing aparecia às avessas. */}
    <div className="theme-dark min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-900 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Trust Care" width={28} height={28} className="object-contain" />
              <span className="font-jetbrains text-sm font-bold tracking-widest uppercase">Trust Care</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#dores" className="text-xs font-jetbrains uppercase tracking-wider text-slate-500 hover:text-emerald-400 transition-colors">O Problema</Link>
              <Link href="#como-funciona" className="text-xs font-jetbrains uppercase tracking-wider text-slate-500 hover:text-emerald-400 transition-colors">Como Funciona</Link>
              <Link href="#bancada" className="text-xs font-jetbrains uppercase tracking-wider text-slate-500 hover:text-emerald-400 transition-colors">Recursos</Link>
              <Link href="#planos" className="text-xs font-jetbrains uppercase tracking-wider text-slate-500 hover:text-emerald-400 transition-colors">Planos</Link>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/login" className="text-xs font-jetbrains uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
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
      <section className="relative pt-40 pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Pitch */}
          <div>
            <div className="inline-flex items-center gap-3 bg-slate-800/40 backdrop-blur-md border border-white/10 text-slate-300 text-[10px] font-jetbrains uppercase tracking-widest px-8 py-3 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Feito em Cuiabá-MT, dentro de uma assistência técnica de verdade
            </div>

            <h1 className="font-jetbrains text-4xl md:text-5xl font-bold tracking-tight leading-[1.15] mb-6 uppercase">
              Sua bancada sob controle.<br />
              <span className="text-emerald-400">Seu cliente parou de ligar.</span>
            </h1>

            <p className="max-w-lg text-base md:text-lg text-slate-400 leading-relaxed mb-10">
              O Trust Care organiza cada aparelho que entra na sua assistência técnica — do diagnóstico até a entrega — com aviso automático de status, garantia documentada e financeiro fechando sozinho. É o mesmo sistema que rodamos na nossa própria operação, todos os dias.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link href="/register" className={ctaButton}>
                  Testar Grátis <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="#como-funciona" className={ghostButton}>
                  Como Funciona
                </Link>
              </div>
              <p className="text-xs text-slate-600 font-jetbrains uppercase tracking-wider">7 dias grátis · Sem cartão de crédito · Cancele quando quiser</p>

              <Link href={whatsappLink} target="_blank" rel="noopener noreferrer" className={whatsappTextLink + ' mt-2'}>
                <WhatsAppIcon className="w-3.5 h-3.5" />
                Prefere ver funcionando antes? Fale com nossa equipe no WhatsApp
              </Link>
            </div>
          </div>

          {/* Ticket artifact */}
          <div className="relative flex justify-center lg:justify-end select-none">
            {/* Duplicate stub peeking behind */}
            <div className="hidden sm:block absolute w-[280px] h-[340px] bg-slate-950 border border-slate-800 rotate-[7deg] translate-x-6 translate-y-4" />

            {/* Main ticket */}
            <div className="relative w-full max-w-[320px] bg-slate-950 border border-slate-800 -rotate-2 shadow-2xl font-mono">
              <div className="p-5 border-b border-dashed border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest">Ordem de Serviço</p>
                    <p className="text-sm font-bold text-white mt-0.5">#TC-2026-0842</p>
                  </div>
                  <span className="border-2 border-dashed border-emerald-500 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rotate-[-6deg]">
                    Aprovado
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600 uppercase tracking-wider">Cliente</span>
                  <span className="text-slate-300">J. Ferreira</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600 uppercase tracking-wider shrink-0">Aparelho</span>
                  <span className="text-slate-300 text-right">Notebook Acer Aspire 5 — Upgrade SSD</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600 uppercase tracking-wider">Técnico</span>
                  <span className="text-slate-300">R. Almeida</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600 uppercase tracking-wider shrink-0">Entrega</span>
                  <span className="text-slate-300">3 dias úteis</span>
                </div>
              </div>

              <div className="relative h-4 text-slate-950">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 text-black" style={perforation} />
              </div>

              <div className="p-5 pt-1 flex justify-between items-center">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest">Valor Total</span>
                <span className="text-lg font-bold text-emerald-400">R$ 380,00</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── O Problema ── */}
      <section id="dores" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-900 bg-slate-950/40">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <h2 className="text-h1 text-text max-w-xl">O caos não é falta de organização sua. É rodar uma assistência técnica sem sistema feito pra ela.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {dores.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.code}
                  className="bg-slate-950 border border-slate-900 rounded-2xl p-6 flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all group"
                >
                  <div className="mb-5">
                    <div className="inline-flex p-3 rounded-full backdrop-blur-md border border-white/5 bg-rose-500/15 text-rose-500 group-hover:bg-rose-500/25 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Como Funciona (real status pipeline) ── */}
      <section id="como-funciona" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-[10px] font-jetbrains text-emerald-500 uppercase tracking-widest mb-3">Ciclo da Ordem de Serviço</p>
            <h2 className="text-h1 text-text max-w-xl">O mesmo fluxo que já acontece na sua bancada, só que rastreável do início ao fim.</h2>
          </div>

          <div className="relative mb-32 lg:mt-16 lg:mb-40">
            {/* SVG Flow Line */}
            <div className="hidden lg:block absolute inset-0 z-0 pointer-events-none">
              <svg className="w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 1000 400">
                <path 
                  d="M 166,80 C 50,150 50,250 166,320 C 333,320 333,200 500,200 C 666,200 666,80 833,80 C 950,150 950,250 833,320" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3" 
                  strokeDasharray="10 10" 
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              {/* Coluna 1: Passos 1 e 2 */}
              <div className="flex flex-col gap-6 lg:gap-24 lg:pt-8">
                {[steps[0], steps[1]].map(step => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.n} className="relative flex items-center gap-4 bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-full p-3 pr-8 shadow-2xl hover:scale-105 hover:bg-slate-800/60 hover:border-white/20 transition-all duration-300 w-full lg:max-w-[340px]">
                      <div className="shrink-0 w-14 h-14 flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 py-1">
                        <h3 className="text-[11px] font-jetbrains font-bold text-white uppercase tracking-widest mb-1 leading-tight">{step.title}</h3>
                        <p className="text-[11px] text-slate-400 leading-snug">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coluna 2: Passo 3 */}
              <div className="flex flex-col justify-center gap-6 lg:gap-24">
                {[steps[2]].map(step => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.n} className="relative flex items-center gap-4 bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-full p-3 pr-8 shadow-2xl hover:scale-105 hover:bg-slate-800/60 hover:border-white/20 transition-all duration-300 w-full lg:max-w-[340px] lg:mx-auto">
                      <div className="shrink-0 w-14 h-14 flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 py-1">
                        <h3 className="text-[11px] font-jetbrains font-bold text-white uppercase tracking-widest mb-1 leading-tight">{step.title}</h3>
                        <p className="text-[11px] text-slate-400 leading-snug">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coluna 3: Passos 4 e 5 */}
              <div className="flex flex-col gap-6 lg:gap-24 lg:pt-8">
                {[steps[3], steps[4]].map(step => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.n} className="relative flex items-center gap-4 bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-full p-3 pr-8 shadow-2xl hover:scale-105 hover:bg-slate-800/60 hover:border-white/20 transition-all duration-300 w-full lg:max-w-[340px] lg:ml-auto">
                      <div className="shrink-0 w-14 h-14 flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                        <StepIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 py-1">
                        <h3 className="text-[11px] font-jetbrains font-bold text-white uppercase tracking-widest mb-1 leading-tight">{step.title}</h3>
                        <p className="text-[11px] text-slate-400 leading-snug">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prints reais da operação */}
          <div className="mb-14">
            <h3 className="text-h2 text-text max-w-xl">Isto é o painel que a Trust Care usa na própria operação, agora — não uma tela de demonstração.</h3>
          </div>

          <div className="space-y-20">
            {/* Bloco 1 — Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="relative border border-slate-800 bg-slate-950 order-1">
                <Image src="/marketing/dashboard.png" alt="Painel de dashboard da Trust Care mostrando faturamento, OS em andamento e ticket médio reais" width={1260} height={623} className="w-full h-auto" />
              </div>
              <div className="order-2">
                <h4 className="text-h3 text-text mb-3">Controle da bancada num painel só</h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">
                  Quantas OS estão em análise, qual o ticket médio, quanto já faturou no mês — tudo num só lugar, sem abrir três planilhas pra descobrir. Resolve o &ldquo;onde tá cada aparelho&rdquo;.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-jetbrains text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">R$ 4.106,00 faturados</span>
                  <span className="text-[10px] font-jetbrains text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">5 OS em andamento</span>
                  <span className="text-[10px] font-jetbrains text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Ticket médio R$ 456,22</span>
                </div>
              </div>
            </div>

            {/* Bloco 2 — Financeiro */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="order-2 lg:order-1">
                <h4 className="text-h3 text-text mb-3">Saiba se deu lucro, não só se girou dinheiro</h4>
                <p className="text-sm text-slate-500 leading-relaxed mb-5">
                  Custo de peça e despesa fixa entram automaticamente quando a OS fecha. O resultado é lucro líquido real — não uma estimativa de cabeça no fim do mês.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-jetbrains text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Custos R$ 1.982,00</span>
                  <span className="text-[10px] font-jetbrains text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Lucro líquido R$ 2.124,00</span>
                </div>
              </div>
              <div className="relative border border-slate-800 bg-slate-950 order-1 lg:order-2">
                <Image src="/marketing/financeiro.png" alt="Painel financeiro da Trust Care mostrando faturamento, custos operacionais e lucro líquido reais" width={1261} height={657} className="w-full h-auto" />
              </div>
            </div>

            {/* Bloco 3 — Estoque */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="relative border border-slate-800 bg-slate-950 order-1">
                <Image src="/marketing/estoque.png" alt="Painel de controle de estoque da Trust Care com produtos, SKU e status de disponibilidade" width={1266} height={680} className="w-full h-auto" />
              </div>
              <div className="order-2">
                <h4 className="text-h3 text-text mb-3">Peça sob controle, sem depender de memória</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Peça usada numa OS desconta do estoque sozinha. Você sabe o que tem na prateleira antes de prometer prazo pro cliente — e antes de perder venda por falta de peça.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Por Que Confiar (origem) ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-900 bg-slate-950/40">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <h2 className="text-h1 text-text mb-5">Isso não nasceu numa reunião de startup. Nasceu numa bancada em Cuiabá-MT.</h2>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed">
              A Trust Care começou como uma assistência técnica de verdade — manutenção de PC, upgrade de hardware, suporte técnico pro cliente que só quer o computador funcionando. O sistema que você viu acima foi construído pra resolver o caos da nossa própria operação. Só depois de rodar isso na prática, todos os dias, com cliente de verdade, é que abrimos pra outras assistências técnicas usarem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {provas.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-full backdrop-blur-md border border-white/5 ${p.iconClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {p.tag && (
                      <span className="border border-slate-800 text-slate-500 text-[10px] uppercase font-jetbrains tracking-wider px-2.5 py-1 rounded-full group-hover:border-slate-700 transition-colors">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm font-medium">{p.label}</p>
                  <h3 className="text-2xl font-bold text-white mt-1 mb-2 font-mono">{p.value}</h3>
                  {p.subtitle && (
                    <p className="text-xs text-slate-500">{p.subtitle}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-600 mt-3 font-jetbrains uppercase tracking-wider">Faturamento, lucro líquido e ticket médio calculados automaticamente pelo sistema — sem planilha, sem calculadora.</p>
        </div>
      </section>

      {/* ── Manifesto de Recursos ── */}
      <section id="bancada" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <h2 className="text-h1 text-text max-w-xl">Só o que resolve o caos que você já conhece. Nada de lista solta de feature.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {manifest.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.code}
                  className="bg-slate-950 border border-slate-900 rounded-2xl p-6 flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all group"
                >
                  <div className="mb-5">
                    <div className="inline-flex p-2.5 rounded-full backdrop-blur-md border border-white/5 bg-emerald-500/15 text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-[10px] font-jetbrains text-emerald-500 uppercase tracking-widest mb-3">Planos</p>
            <h2 className="text-h1 text-text mb-3">O preço de um lanche para profissionalizar sua oficina inteira.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-900 max-w-5xl mx-auto border border-slate-900 rounded-2xl shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all">
            {/* Starter */}
            <div className="bg-slate-950 p-8 flex flex-col relative">
              <div className="mb-6">
                <h3 className="font-jetbrains text-sm font-bold uppercase tracking-wide text-white mb-1.5">Starter</h3>
                <p className="text-slate-500 text-xs">Para assistências de um homem só.</p>
              </div>
              <div className="mb-8 font-jetbrains">
                <span className="text-3xl font-bold text-white">R$ 29</span>
                <span className="text-slate-500 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['1 usuário (admin)', 'O.S. ilimitadas', 'Cadastro de clientes', 'Orçamento em PDF'].map((f) => (
                  <li key={f} className="flex gap-3 text-slate-400 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=starter" className={ghostButton + ' w-full !py-3'}>
                Assinar Starter
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-950 p-8 flex flex-col relative group">
              <span className="absolute top-6 right-6 border-2 border-dashed border-emerald-500 rounded-full text-emerald-400 text-[9px] font-jetbrains font-bold uppercase tracking-widest px-3 py-1.5 rotate-[-4deg]">
                Mais Usado
              </span>
              <div className="mb-6">
                <h3 className="font-jetbrains text-sm font-bold uppercase tracking-wide text-emerald-400 mb-1.5">Pro</h3>
                <p className="text-slate-500 text-xs">O ponto de equilíbrio para crescer.</p>
              </div>
              <div className="mb-8 font-jetbrains">
                <span className="text-3xl font-bold text-white">R$ 69</span>
                <span className="text-slate-500 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['Até 3 usuários', 'Painel de rastreio público', 'Módulo financeiro', 'Aviso automático de status', 'Controle de estoque'].map((f) => (
                  <li key={f} className="flex gap-3 text-slate-300 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=pro" className={ctaButton + ' w-full'}>
                Iniciar Teste Grátis
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-slate-950 p-8 flex flex-col relative">
              <div className="mb-6">
                <h3 className="font-jetbrains text-sm font-bold uppercase tracking-wide text-white mb-1.5">Premium</h3>
                <p className="text-slate-500 text-xs">Para assistências de alto volume.</p>
              </div>
              <div className="mb-8 font-jetbrains">
                <span className="text-3xl font-bold text-white">R$ 149</span>
                <span className="text-slate-500 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['Usuários ilimitados', 'Tudo do plano Pro', 'API para integrações', 'Suporte prioritário'].map((f) => (
                  <li key={f} className="flex gap-3 text-slate-400 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
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
        <h2 className="text-h1 text-text uppercase tracking-tight max-w-xl mx-auto mb-4">
          Sua bancada sob controle. Seu cliente parou de ligar.
        </h2>
        <p className="text-slate-500 text-sm mb-8">Sem cartão de crédito · Cancele quando quiser</p>
        <Link href="/register" className={ctaButton}>
          Testar Grátis <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <Link href={whatsappLink} target="_blank" rel="noopener noreferrer" className={whatsappTextLink + ' mt-6'}>
            <WhatsAppIcon className="w-3.5 h-3.5" />
            Ainda não decidiu? Fale com nossa equipe no WhatsApp
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-900 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Trust Care" width={22} height={22} className="object-contain grayscale opacity-60" />
            <span className="font-jetbrains text-xs text-slate-500 uppercase tracking-widest">Trust Care</span>
          </div>
          <div className="text-slate-700 text-xs font-jetbrains">
            © {new Date().getFullYear()} Trust Care T.I. — Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
    </ReactLenis>
  );
}
