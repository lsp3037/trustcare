import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Plus } from 'lucide-react';
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
    title: 'Gabinetes e notebooks se misturam na bancada',
    desc: 'Sem um painel central, você não sabe qual máquina está aguardando peça, qual está em testes de estabilidade e o que já pode ser entregue.',
  },
  {
    title: 'Todo cliente pergunta "Meu PC já tá pronto?"',
    desc: 'Cada vez que você para uma montagem complexa ou limpeza térmica para responder o WhatsApp, perde foco. Com aviso automático de status, o cliente acompanha o processo sozinho.',
  },
  {
    title: 'Upgrade entregue sem prazo de garantia registrado',
    desc: 'Entregar memórias, SSDs ou processadores novos e não anotar os prazos é prejuízo na certa. Registre prazos de peças e serviços direto na O.S.',
  },
  {
    title: 'Você está pagando para consertar?',
    desc: 'O dinheiro entra, você repassa para fornecedores de peças, mas sobra quanto? Separe o que é custo de hardware do que é o lucro real da sua mão de obra especializada.',
  },
];

const steps = [
  { n: '01', title: 'Aguardando Equipamento', desc: 'Cliente traz o aparelho, você abre o protocolo em segundos.' },
  { n: '02', title: 'Em Análise', desc: 'Técnico registra o diagnóstico direto na ordem de serviço.' },
  { n: '03', title: 'Aguardando Aprovação', desc: 'Cliente recebe o link, revisa o valor e assina pelo celular.' },
  { n: '04', title: 'Em Execução', desc: 'Peças saem do estoque sozinhas, sem planilha paralela.' },
  { n: '05', title: 'Pronto p/ Retirada', desc: 'Aviso automático dispara e o cliente já sabe que pode buscar.' },
];

// Mesmos valores dos prints de /marketing: faturamento − custos = lucro líquido.
const provas = [
  { label: 'Faturamento realizado', value: 'R$ 4.106,00', note: 'Soma de OS concluídas / entregues' },
  { label: 'Custos', value: 'R$ 1.982,00', note: 'Peças e despesas fixas' },
  { label: 'Lucro líquido', value: 'R$ 2.124,00', note: 'Já descontando custo de peças e fixos' },
  { label: 'Ticket médio', value: 'R$ 456,22', note: 'Valor médio por OS paga' },
  { label: 'OS em andamento', value: '5', note: 'Aguardando aprovação ou peças' },
];

const manifest = [
  {
    title: 'Painel Kanban da bancada',
    desc: 'Arraste ordens entre status e veja em um só lugar quantos aparelhos estão parados e em qual etapa. Resolve o "onde tá cada aparelho".',
  },
  {
    title: 'Rastreio automático do cliente',
    desc: 'Seu cliente acompanha o reparo pelo número do protocolo e recebe aviso quando o status muda. Resolve o "e aí, ficou pronto?".',
  },
  {
    title: 'Garantia documentada, não prometida',
    desc: 'Prazo de garantia sai automático em cada orçamento e PDF, com os termos do CDC — em vez de ficar só na palavra.',
  },
  {
    title: 'Orçamento com assinatura digital',
    desc: 'Cliente aprova e assina pelo celular, com IP e horário registrados. Orçamento não emperra esperando confirmação por WhatsApp.',
  },
  {
    title: 'Controle de estoque',
    desc: 'Peças usadas na ordem descontam do estoque sozinhas — sem planilha paralela pra saber o que ainda tem na prateleira.',
  },
  {
    title: 'Financeiro com lucro líquido real',
    desc: 'Custo de peça, despesa fixa e faturamento entram automaticamente. No fim do mês você sabe se deu lucro, não só se girou dinheiro.',
  },
  {
    title: 'Funil de leads com follow-up',
    desc: 'Orçamento que demora esfria o lead. O funil mostra quem tá esperando resposta antes que vire cliente do concorrente.',
  },
  {
    title: 'Multiusuário com permissões',
    desc: 'Técnicos e atendentes com acessos próprios. Você sabe quem mexeu em quê, sem dividir uma senha só.',
  },
];

const faqs = [
  {
    q: 'Os dados da minha assistência ficam separados dos de outras empresas?',
    a: 'Sim. Cada empresa tem seus dados isolados no banco: nenhum usuário de outra assistência enxerga seus clientes, ordens ou financeiro.',
  },
  {
    q: 'O teste grátis pede cartão de crédito?',
    a: 'Não. São 7 dias para testar, sem cartão de crédito, e você pode cancelar quando quiser.',
  },
  {
    q: 'Como o cliente acompanha o aparelho?',
    a: 'Pelo número do protocolo, na página de rastreio, confirmando com um código de 6 dígitos. Quando o status muda, ele recebe o aviso.',
  },
  {
    q: 'O que fica registrado quando o cliente aprova o orçamento?',
    a: 'Ele assina pelo celular e o sistema guarda o IP e o horário da aprovação, deixando o aceite documentado na própria O.S.',
  },
];

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300';

const ctaButton =
  `inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm px-6 py-3 rounded-full transition-colors active:scale-[0.97] cursor-pointer ${focusRing}`;

const ghostButton =
  `inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-200 hover:text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors active:scale-[0.97] cursor-pointer ${focusRing}`;

const whatsappTextLink =
  `inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 text-sm underline-offset-4 hover:underline transition-colors cursor-pointer ${focusRing}`;

const navLink =
  'text-sm text-slate-400 hover:text-emerald-400 transition-colors';

export default function LandingPage() {
  // `theme-dark`: a landing tem visual próprio e fixo, sem alternador. Sem
  // o escopo, a preferência clara salva no dashboard invertia as escalas
  // `slate-*` que esta página usa e a landing aparecia às avessas.
  return (
    <div className="landing-root theme-dark min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-800 bg-slate-950/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Trust Care" width={28} height={28} className="object-contain" />
              <span className="font-display text-lg font-bold tracking-wide">Trust Care</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#dores" className={navLink}>O Problema</Link>
              <Link href="#como-funciona" className={navLink}>Como Funciona</Link>
              <Link href="#bancada" className={navLink}>Recursos</Link>
              <Link href="#planos" className={navLink}>Planos</Link>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
                Entrar
              </Link>
              <Link href="/register" className={ctaButton + ' !px-4 !py-2'}>
                Testar Grátis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-28 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Pitch */}
          <div>
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-balance mb-6">
              Sua bancada sob controle.{' '}
              <span className="text-emerald-400">Seu cliente parou de ligar.</span>
            </h1>

            <p className="max-w-xl text-base md:text-lg text-slate-300 leading-relaxed mb-10">
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
              <p className="text-sm text-slate-400">7 dias grátis · Sem cartão de crédito · Cancele quando quiser</p>
              <p className="text-sm text-slate-400">Feito em Cuiabá-MT, dentro de uma assistência técnica de verdade.</p>

              <Link href={whatsappLink} target="_blank" rel="noopener noreferrer" className={whatsappTextLink + ' mt-2'}>
                <WhatsAppIcon className="w-4 h-4" />
                Prefere ver funcionando antes? Fale com nossa equipe no WhatsApp
              </Link>
            </div>
          </div>

          {/* Produto real, com o ticket de OS sobreposto */}
          <div className="relative select-none">
            <div className="border border-slate-700 bg-slate-950 rounded-lg overflow-hidden shadow-2xl">
              <Image
                src="/marketing/dashboard.png"
                alt="Painel da Trust Care mostrando faturamento, OS em andamento e ticket médio"
                width={1260}
                height={623}
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="w-full h-auto"
              />
            </div>

            <div className="relative -mt-10 ml-4 sm:ml-0 sm:absolute sm:-bottom-44 sm:-left-8 sm:mt-0 w-[300px] max-w-[calc(100%-2rem)] bg-slate-950 border border-slate-600 -rotate-2 shadow-2xl font-mono">
              <div className="p-5 border-b border-dashed border-slate-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Ordem de Serviço</p>
                    <p className="text-sm font-bold text-white mt-0.5">#TC-2026-0842</p>
                  </div>
                  <span className="border-2 border-dashed border-emerald-500 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest px-3 py-1 rotate-[-6deg]">
                    Aprovado
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400 uppercase tracking-wider">Cliente</span>
                  <span className="text-slate-200">J. Ferreira</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400 uppercase tracking-wider shrink-0">Aparelho</span>
                  <span className="text-slate-200 text-right">Notebook Acer Aspire 5 — Upgrade SSD</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400 uppercase tracking-wider">Técnico</span>
                  <span className="text-slate-200">R. Almeida</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400 uppercase tracking-wider shrink-0">Entrega</span>
                  <span className="text-slate-200">3 dias úteis</span>
                </div>
              </div>

              <div className="relative h-4 text-slate-950">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 text-black" style={perforation} />
              </div>

              <div className="p-5 pt-1 flex justify-between items-center">
                <span className="text-xs text-slate-400 uppercase tracking-widest">Valor Total</span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">R$ 380,00</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── O Problema ── */}
      <section id="dores" className="scroll-mt-16 py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-h1 text-text text-balance max-w-2xl mb-12">O caos não é falta de organização sua. É rodar uma assistência técnica sem sistema feito pra ela.</h2>

          <ul className="divide-y divide-slate-800 border-y border-slate-800">
            {dores.map((item) => (
              <li key={item.title} className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-2 md:gap-12 py-7">
                <h3 className="font-display text-xl font-bold text-white text-balance">{item.title}</h3>
                <p className="text-base text-slate-300 leading-relaxed max-w-prose">{item.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Como Funciona (real status pipeline) ── */}
      <section id="como-funciona" className="scroll-mt-16 py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-h1 text-text text-balance max-w-2xl mb-16">O mesmo fluxo que já acontece na sua bancada, só que rastreável do início ao fim.</h2>

          <ol className="grid grid-cols-1 lg:grid-cols-5 gap-y-10 lg:gap-x-8 mb-24 border-l border-dashed border-slate-600 pl-8 lg:border-l-0 lg:pl-0 lg:border-t lg:pt-8">
            {steps.map((step) => (
              <li key={step.n} className="relative">
                <span aria-hidden className="absolute -left-[37px] top-1.5 lg:left-0 lg:-top-[38px] w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <p className="inline-block border border-dashed border-emerald-500 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-400 tabular-nums mb-3">{step.n}</p>
                <h3 className="font-display text-lg font-bold text-white mb-1.5 text-balance">{step.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{step.desc}</p>
              </li>
            ))}
          </ol>

          {/* Prints reais da operação */}
          <h3 className="text-h2 text-text max-w-xl mb-14">Isto é o painel que a Trust Care usa na própria operação, agora — não uma tela de demonstração.</h3>

          <div className="space-y-20">
            {/* Bloco 1 — Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="relative lg:col-span-7 border border-slate-700 bg-slate-950 rounded-lg overflow-hidden shadow-xl order-1">
                <Image src="/marketing/dashboard.png" alt="Painel de dashboard da Trust Care mostrando faturamento, OS em andamento e ticket médio reais" width={1260} height={623} sizes="(min-width: 1024px) 58vw, 100vw" className="w-full h-auto" />
              </div>
              <div className="order-2 lg:col-span-5">
                <h4 className="text-h3 text-text mb-3">Controle da bancada num painel só</h4>
                <p className="text-base text-slate-300 leading-relaxed mb-5 max-w-prose">
                  Quantas OS estão em análise, qual o ticket médio, quanto já faturou no mês — tudo num só lugar, sem abrir três planilhas pra descobrir. Resolve o &ldquo;onde tá cada aparelho&rdquo;.
                </p>
                <p className="font-mono text-sm text-emerald-400 tabular-nums">R$ 4.106,00 faturados · 5 OS em andamento · ticket médio R$ 456,22</p>
              </div>
            </div>

            {/* Bloco 2 — Financeiro */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="order-2 lg:order-1 lg:col-span-5">
                <h4 className="text-h3 text-text mb-3">Saiba se deu lucro, não só se girou dinheiro</h4>
                <p className="text-base text-slate-300 leading-relaxed mb-5 max-w-prose">
                  Custo de peça e despesa fixa entram automaticamente quando a OS fecha. O resultado é lucro líquido real — não uma estimativa de cabeça no fim do mês.
                </p>
                <p className="font-mono text-sm text-emerald-400 tabular-nums">Custos R$ 1.982,00 · lucro líquido R$ 2.124,00</p>
              </div>
              <div className="relative lg:col-span-7 border border-slate-700 bg-slate-950 rounded-lg overflow-hidden shadow-xl order-1 lg:order-2">
                <Image src="/marketing/financeiro.png" alt="Painel financeiro da Trust Care mostrando faturamento, custos operacionais e lucro líquido reais" width={1261} height={657} sizes="(min-width: 1024px) 58vw, 100vw" className="w-full h-auto" />
              </div>
            </div>

            {/* Bloco 3 — Estoque */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="relative lg:col-span-7 border border-slate-700 bg-slate-950 rounded-lg overflow-hidden shadow-xl order-1">
                <Image src="/marketing/estoque.png" alt="Painel de controle de estoque da Trust Care com produtos, SKU e status de disponibilidade" width={1266} height={680} sizes="(min-width: 1024px) 58vw, 100vw" className="w-full h-auto" />
              </div>
              <div className="order-2 lg:col-span-5">
                <h4 className="text-h3 text-text mb-3">Peça sob controle, sem depender de memória</h4>
                <p className="text-base text-slate-300 leading-relaxed max-w-prose">
                  Peça usada numa OS desconta do estoque sozinha. Você sabe o que tem na prateleira antes de prometer prazo pro cliente — e antes de perder venda por falta de peça.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Por Que Confiar (origem) ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <h2 className="text-h1 text-text text-balance mb-5">Isso não nasceu numa reunião de startup. Nasceu numa bancada em Cuiabá-MT.</h2>
            <p className="text-base text-slate-300 leading-relaxed max-w-prose">
              A Trust Care começou como uma assistência técnica de verdade — manutenção de PC, upgrade de hardware, suporte técnico pro cliente que só quer o computador funcionando. O sistema que você viu acima foi construído pra resolver o caos da nossa própria operação. Só depois de rodar isso na prática, todos os dias, com cliente de verdade, é que abrimos pra outras assistências técnicas usarem.
            </p>
          </div>

          <div>
            <dl className="border border-dashed border-slate-600 rounded-xl px-6 py-3">
              {provas.map((p) => {
                const total = p.label === 'Lucro líquido';
                return (
                  <div
                    key={p.label}
                    className={`py-3 last:border-b-0 ${total ? 'border-y-2 border-dashed border-slate-500 my-2' : 'border-b border-dotted border-slate-700'}`}
                  >
                    <div className="flex items-baseline gap-3">
                      <dt className={total ? 'text-base font-bold text-white' : 'text-sm font-medium text-slate-200'}>{p.label}</dt>
                      <span aria-hidden className="flex-1 border-b border-dotted border-slate-600" />
                      <dd className={`font-mono font-bold tabular-nums ${total ? 'text-2xl text-emerald-400' : 'text-lg text-white'}`}>{p.value}</dd>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{p.note}</p>
                  </div>
                );
              })}
            </dl>
            <p className="text-sm text-slate-400 mt-3">Faturamento, lucro líquido e ticket médio calculados automaticamente pelo sistema — sem planilha, sem calculadora.</p>
          </div>
        </div>
      </section>

      {/* ── Manifesto de Recursos ── */}
      <section id="bancada" className="scroll-mt-16 py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-h1 text-text text-balance max-w-2xl mb-12">Só o que resolve o caos que você já conhece. Nada de lista solta de feature.</h2>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 border-b border-slate-800">
            {manifest.map((item) => (
              <li key={item.title} className="py-6 border-t border-slate-800">
                <h3 className="font-display text-xl font-bold text-white mb-2 text-balance">{item.title}</h3>
                <p className="text-base text-slate-300 leading-relaxed max-w-prose">{item.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="planos" className="scroll-mt-16 py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-h1 text-text text-balance text-center max-w-2xl mx-auto mb-16">Planos para a assistência de qualquer tamanho.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-800 max-w-5xl mx-auto border border-slate-800 rounded-2xl overflow-hidden">
            {/* Starter */}
            <div className="bg-slate-950 p-8 flex flex-col relative">
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1.5">Starter</h3>
                <p className="text-slate-300 text-sm">Para quem atende sozinho.</p>
              </div>
              <div className="mb-8 tabular-nums">
                <span className="font-display text-4xl font-bold text-white">R$ 29</span>
                <span className="text-slate-400 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['1 usuário (admin)', 'O.S. ilimitadas', 'Cadastro de clientes', 'Orçamento em PDF'].map((f) => (
                  <li key={f} className="flex gap-3 text-slate-300 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=starter" className={ghostButton + ' w-full'}>
                Assinar Starter
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-900 p-8 flex flex-col relative">
              <span className="absolute top-6 right-6 border-2 border-dashed border-emerald-500 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rotate-[-4deg]">
                Mais Usado
              </span>
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-emerald-400 mb-1.5">Pro</h3>
                <p className="text-slate-300 text-sm">O ponto de equilíbrio para crescer.</p>
              </div>
              <div className="mb-8 tabular-nums">
                <span className="font-display text-4xl font-bold text-white">R$ 69</span>
                <span className="text-slate-400 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['Até 3 usuários', 'Painel de rastreio público', 'Módulo financeiro', 'Aviso automático de status', 'Controle de estoque'].map((f) => (
                  <li key={f} className="flex gap-3 text-slate-200 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=pro" className={ctaButton + ' w-full'}>
                Iniciar Teste Grátis
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-slate-950 p-8 flex flex-col relative">
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1.5">Premium</h3>
                <p className="text-slate-300 text-sm">Para assistências de alto volume.</p>
              </div>
              <div className="mb-8 tabular-nums">
                <span className="font-display text-4xl font-bold text-white">R$ 149</span>
                <span className="text-slate-400 text-sm">,90/mês</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {['Usuários ilimitados', 'Tudo do plano Pro', 'API para integrações', 'Suporte prioritário'].map((f) => (
                  <li key={f} className="flex gap-3 text-slate-300 text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <Link href="/register?plan=premium" className={ghostButton + ' w-full'}>
                Assinar Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dúvidas ── */}
      <section id="duvidas" className="scroll-mt-16 py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-h1 text-text text-balance mb-10">Dúvidas antes de testar</h2>
          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className={`flex items-start justify-between gap-6 cursor-pointer list-none font-display text-lg font-bold text-white [&::-webkit-details-marker]:hidden ${focusRing}`}>
                  {f.q}
                  <Plus aria-hidden className="w-5 h-5 shrink-0 mt-1 text-emerald-400 transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-base text-slate-300 leading-relaxed max-w-prose">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance max-w-xl mx-auto mb-4">
          Teste na sua bancada por 7 dias.
        </h2>
        <p className="text-slate-300 text-base mb-8">Sem cartão de crédito · Cancele quando quiser</p>
        <Link href="/register" className={ctaButton}>
          Testar Grátis <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="mt-6">
          <Link href={whatsappLink} target="_blank" rel="noopener noreferrer" className={whatsappTextLink}>
            <WhatsAppIcon className="w-4 h-4" />
            Ainda não decidiu? Fale com nossa equipe no WhatsApp
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Trust Care" width={22} height={22} className="object-contain grayscale opacity-70" />
            <span className="font-display text-base font-bold text-slate-300">Trust Care</span>
          </div>
          <div className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Trust Care T.I. — Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
