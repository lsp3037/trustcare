'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, BarChart3, Banknote, Camera, Check, ClipboardList, CreditCard, FileSignature,
  Lock, Mail, Package, Radar, ShieldCheck, Users, Webhook, Wrench, UserCog,
} from 'lucide-react';
import {
  OS, OUTRAS_PECAS, MES, DESPESAS_FIXAS, STATUS, PLANOS, FAQ,
  totalOS, totalPecasCusto, totalServicos, totalPecasVenda, lucroOS, margemOS,
  mesReceita, mesCustoPecas, mesDespesas, mesLucro, reais, pct,
} from './dados';
import { CENAS, TOTAL, iniciarLinhaDoTempo, irPara } from './motion';
import './v2.css';

const WHATSAPP = `https://wa.me/5565999620703?text=${encodeURIComponent('Oi! Vi o sistema da Trust Care e queria conversar.')}`;

const NAV = [
  { cena: 'painel', nome: 'Dashboard & Relatórios', icon: BarChart3 },
  { cena: 'clientes', nome: 'Clientes', icon: Users },
  { cena: 'os', nome: 'Ordens de Serviço', icon: ClipboardList },
  { cena: 'orcamento', nome: 'Orçamento', icon: FileSignature, cliente: true },
  { cena: 'estoque', nome: 'Estoque', icon: Package },
  { cena: 'rastreio', nome: 'Rastreio', icon: Radar, cliente: true },
  { cena: 'financeiro', nome: 'Financeiro', icon: Banknote },
  { cena: 'equipe', nome: 'Usuários e acesso', icon: UserCog },
  { cena: 'planos', nome: 'Assinatura', icon: CreditCard },
] as const;

/** Escudo oficial da Trust Care (recortado de public/logo.png). */
function Marca({ className = '', priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/landing/tc-escudo.png" alt="" width={364} height={389} className={className} priority={priority} aria-hidden="true" />;
}

/** Trilhas de circuito no desenho da logo: a placa onde o notebook está apoiado. */
const TRILHAS = [
  'M370 310H300L270 280H120', 'M370 350H260L230 380H60', 'M370 400H320L290 430V520', 'M380 440V480L350 510H200',
  'M630 310H700L730 280H880', 'M630 350H740L770 380H940', 'M630 400H680L710 430V520', 'M620 440V480L650 510H800',
  'M450 440V560', 'M550 440V540L580 570H700', 'M440 270V200L410 170H260', 'M560 270V180L590 150H760', 'M500 270V90',
  'M300 310V240L270 210H170', 'M700 350V420L740 460H900',
];
const PONTAS: [number, number][] = [
  [120, 280], [60, 380], [290, 520], [200, 510], [880, 280], [940, 380], [710, 520], [800, 510],
  [450, 560], [700, 570], [260, 170], [760, 150], [500, 90], [170, 210], [900, 460],
];
function Placa({ acesa = false }: { acesa?: boolean }) {
  return (
    <svg viewBox="0 0 1000 600" className={acesa ? 'tc-board__lit' : 'tc-board__base'} preserveAspectRatio="none">
      {TRILHAS.map((d) => <path key={d} d={d} />)}
      {PONTAS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={6} />)}
    </svg>
  );
}

function Guia({ titulo, texto, itens }: { titulo: string; texto: string; itens: string[] }) {
  return (
    <div className="tc-guide">
      <h2>{titulo}</h2>
      <p>{texto}</p>
      <ul>
        {itens.map((i, n) => (
          <li key={i} style={{ '--s': 0.18 + n * 0.08 } as React.CSSProperties}>
            <Check aria-hidden="true" /> {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

const s = (v: number, l?: number) => ({ '--s': v, ...(l ? { '--l': l } : {}) }) as React.CSSProperties;

export default function SistemaAberto() {
  const raiz = useRef<HTMLDivElement>(null);
  const [plano, setPlano] = useState<string>('pro');
  const [empresa, setEmpresa] = useState('');

  useEffect(() => {
    if (!raiz.current) return;
    return iniciarLinhaDoTempo(raiz.current);
  }, []);

  const cadastro = `/register?plan=${plano}${empresa.trim() ? `&empresa=${encodeURIComponent(empresa.trim())}` : ''}`;
  const planoAtual = PLANOS.find((p) => p.id === plano)!;

  return (
    <div className="tc" ref={raiz}>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.tcMotion='live'}catch(e){}`,
        }}
      />
      <div className="tc-track" style={{ '--tc-total': TOTAL } as React.CSSProperties}>
        {CENAS.map((c) => (
          <span key={c.id} id={c.id} className="tc-anchor" style={{ '--start': c.ancora } as React.CSSProperties} />
        ))}

        <div className="tc-stage">
          {/* ── Planos de fundo da abertura ── */}
          <div className="tc-bench" aria-hidden="true">
            <div className="tc-bench__lamp" />
            <div className="tc-bench__glow" />
            <div className="tc-bench__spill" />
          </div>

          <header className="tc-herobar">
            <Link href="/v2" className="tc-wordmark">
              <Marca className="tc-mark" priority />
              <span>Trust Care</span>
            </Link>
            <Link href="/login" className="tc-link">Entrar</Link>
          </header>

          <div className="tc-hero-scrim" aria-hidden="true" />
          <div className="tc-hero-copy">
            <h1>A bancada inteira num só sistema.</h1>
            <p>Ordem de serviço, estoque, orçamento assinado, rastreio e lucro real. Feito por quem vive a bancada.</p>
            <div className="tc-hero-ctas">
              <Link href="/register?plan=pro" className="tc-btn tc-btn--primary">
                Testar 7 dias grátis <ArrowRight aria-hidden="true" />
              </Link>
              <span className="tc-hero-note">Sem cartão de crédito</span>
            </div>
          </div>

          {/* ── O notebook ── */}
          <div className="tc-laptop" aria-hidden="true">
            <div className="tc-board">
              <Placa />
              <Placa acesa />
            </div>
            <div className="tc-lid">
              <div className="tc-lid__screen">
                <div className="tc-boot">
                  <Marca className="tc-boot__mark" />
                  <span className="tc-boot__bar"><i /></span>
                </div>
              </div>
              <div className="tc-lid__back">
                <span className="tc-lid__halo" />
                <Marca className="tc-lid__logo" priority />
              </div>
            </div>
            <div className="tc-deck">
              <div className="tc-deck__keys" />
              <div className="tc-deck__pad" />
            </div>
            <div className="tc-deck-edge" />
            <div className="tc-shadow" />
          </div>

          {/* Primeiro plano desfocado: ferramentas da bancada */}
          <div className="tc-fore" aria-hidden="true">
            <svg className="tc-fore__driver" viewBox="0 0 400 60">
              <rect x="0" y="18" width="150" height="24" rx="12" fill="#2b3036" />
              <rect x="20" y="18" width="6" height="24" fill="#22d3ee" opacity=".7" />
              <rect x="150" y="26" width="230" height="8" rx="3" fill="#8b939c" />
              <path d="M380 26h14l4 4-4 4h-14z" fill="#aab1b9" />
            </svg>
          </div>

          {/* ── O sistema ── */}
          <div className="tc-app">
            <div className="tc-app__inner">
              <aside className="tc-side">
                <div className="tc-side__brand">
                  <Marca className="tc-mark" />
                  <span>Trust Care</span>
                </div>
                <nav aria-label="Módulos do sistema">
                  <ul>
                    {NAV.map((n) => (
                      <li key={n.cena}>
                        <a href={`#${n.cena}`} data-nav={n.cena} onClick={(e) => irPara(e, n.cena)}>
                          <n.icon aria-hidden="true" />
                          <span>{n.nome}</span>
                          {'cliente' in n && <em>cliente</em>}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="tc-side__foot">
                  <Link href="/register?plan=pro" className="tc-btn tc-btn--primary tc-btn--block">
                    Testar 7 dias grátis
                  </Link>
                  <Link href="/login" className="tc-link tc-link--small">Já tenho conta</Link>
                </div>
              </aside>

              <div className="tc-main">
                <div className="tc-top">
                  <div className="tc-crumb">
                    <Marca className="tc-mark tc-mark--sm" />
                    <span>Trust Care</span>
                    <span className="tc-crumb__sep">/</span>
                    <strong data-crumb>Dashboard & Relatórios</strong>
                  </div>
                  <span className="tc-demo">Demonstração · dados de exemplo</span>
                </div>

                <nav className="tc-tabs" aria-label="Módulos">
                  {NAV.map((n) => (
                    <a key={n.cena} href={`#${n.cena}`} data-nav={n.cena} onClick={(e) => irPara(e, n.cena)}>
                      {n.nome.replace(' & Relatórios', '').replace(' do cliente', '').replace(' e avisos', '').replace(' e acesso', '')}
                    </a>
                  ))}
                </nav>

                <div className="tc-work">
                  {/* ─────────── PAINEL ─────────── */}
                  <section className="tc-scene" data-scene="painel" aria-label="Dashboard">
                    <Guia
                      titulo="Dashboard: o dia da bancada numa tela."
                      texto="Quanto entrou no período, quantas OS estão abertas, o ticket médio e as peças abaixo do mínimo. Tudo com filtro por data."
                      itens={['Faturamento por período', 'OS recentes com status', 'Alerta de estoque mínimo']}
                    />
                    <div className="tc-surface tc-dash" aria-hidden="true">
                      <div className="tc-kpis">
                        {[
                          { k: 'fat', l: 'Faturamento do mês', v: reais(mesReceita) },
                          { k: 'abertas', l: 'OS abertas', v: '7' },
                          { k: 'ticket', l: 'Ticket médio', v: reais(mesReceita / MES.length) },
                          { k: 'baixo', l: 'Estoque baixo', v: '1', alerta: true },
                        ].map((x, i) => (
                          <div key={x.k} className={`tc-kpi${x.alerta ? ' tc-kpi--warn' : ''}`} style={s(0.12 + i * 0.04, 0.14)}>
                            <span>{x.l}</span>
                            <strong data-count={x.k}>{x.v}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="tc-dash__row">
                        <div className="tc-panel tc-chart" style={s(0.2, 0.14)}>
                          <span className="tc-panel__title">Faturamento · últimos 14 dias</span>
                          <div className="tc-bars">
                            {[38, 62, 20, 74, 45, 0, 30, 88, 52, 66, 12, 95, 58, 80].map((h, i) => (
                              <i key={i} style={{ '--h': h / 100, '--s': 0.24 + i * 0.012, '--l': 0.12 } as React.CSSProperties} />
                            ))}
                          </div>
                        </div>
                        <div className="tc-panel tc-recent" style={s(0.24, 0.14)}>
                          <span className="tc-panel__title">OS recentes</span>
                          {[
                            { c: OS.codigo, e: 'Dell G15 5520', st: STATUS[0], destaque: true },
                            { c: 'TC-2026-0146', e: 'iPhone 13 · conector', st: STATUS[2] },
                            { c: 'TC-2026-0145', e: 'Positivo · placa-mãe', st: STATUS[8] },
                          ].map((r, i) => (
                            <div key={r.c} className={`tc-recent__row${r.destaque ? ' is-focus' : ''}`} style={s(0.28 + i * 0.04, 0.1)}>
                              <code>{r.c}</code>
                              <span>{r.e}</span>
                              <b style={{ '--c': r.st.cor } as React.CSSProperties}>{r.st.nome}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ─────────── CLIENTES ─────────── */}
                  <section className="tc-scene" data-scene="clientes" aria-label="Clientes">
                    <Guia
                      titulo="Clientes: a ficha que lembra de tudo."
                      texto="Cadastro PF ou PJ com os aparelhos de cada cliente: marca, modelo, número de série e configuração. O histórico mostra cada OS que o aparelho já teve."
                      itens={['CPF ou CNPJ, WhatsApp e endereço', 'Aparelhos com série e configuração', 'Cliente com OS não é apagado por engano']}
                    />
                    <div className="tc-surface tc-clients" aria-hidden="true">
                      <div className="tc-table-head"><span>Cliente</span><span>Documento</span><span>Aparelhos</span></div>
                      <div className="tc-client is-focus" style={s(0.04, 0.16)}>
                        <span><b>{OS.cliente}</b></span><span>{OS.documento}</span><span>2</span>
                      </div>
                      <div className="tc-client__detail">
                        <div className="tc-client__cols">
                          <div style={s(0.3, 0.12)}>
                            <span className="tc-label">Contato</span>
                            <p>WhatsApp {OS.telefone}</p>
                            <p>Cuiabá, MT</p>
                          </div>
                          <div className="tc-device" style={s(0.35, 0.12)}>
                            <span className="tc-label">Aparelho</span>
                            <p><b>{OS.equipamento}</b></p>
                            <p className="tc-mono">{OS.serie}</p>
                            <p className="tc-mono tc-soft">{OS.specs}</p>
                          </div>
                          <div style={s(0.4, 0.12)}>
                            <span className="tc-label">Histórico do aparelho</span>
                            <p><code>TC-2025-0311</code> Troca de teclado</p>
                            <p className="tc-soft">Finalizado · 14/03/2025</p>
                            <p className="tc-new"><code>{OS.codigo}</code> Nova entrada</p>
                          </div>
                        </div>
                      </div>
                      <div className="tc-client__rest">
                        {[
                          ['Oficina Mecânica Sol Ltda', 'CNPJ 12.***.***/0001-40', '4'],
                          ['Diego Arruda', 'CPF ***.117.***-52', '1'],
                          ['Clínica Vida Plena', 'CNPJ 33.***.***/0001-09', '9'],
                        ].map((r, i) => (
                          <div key={r[0]} className="tc-client" style={s(0.08 + i * 0.05, 0.16)}>
                            <span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* ─────────── ORDEM DE SERVIÇO ─────────── */}
                  <section className="tc-scene" data-scene="os" aria-label="Ordem de serviço">
                    <Guia
                      titulo="Ordem de serviço: a entrada com prova."
                      texto="Cada OS ganha código sequencial, checklist de entrada e fotos do aparelho. Ninguém discute depois se o risco na tampa já estava lá."
                      itens={['Código TC-ano-número automático', 'Checklist por tipo de equipamento', '10 status, do recebimento à retirada']}
                    />
                    <div className="tc-surface tc-order" aria-hidden="true">
                      <div className="tc-order__head">
                        <div>
                          <code className="tc-order__code">{OS.codigo}</code>
                          <p><b>{OS.equipamento}</b> · {OS.cliente}</p>
                        </div>
                        <b className="tc-pill" data-os-status>Aguardando Equipamento</b>
                      </div>
                      <div className="tc-order__body">
                        <div className="tc-order__left">
                          <span className="tc-label">Checklist de entrada</span>
                          <ul className="tc-check">
                            {[
                              ['Carcaça', 'Risco na tampa, canto superior'],
                              ['Carregador', 'Incluso, original'],
                              ['Liga', 'Sim, desliga sob carga'],
                              ['Teclado e touchpad', 'Funcionando'],
                            ].map((c, i) => (
                              <li key={c[0]} style={s(0.06 + i * 0.07, 0.08)}>
                                <i><Check /></i><b>{c[0]}</b><span>{c[1]}</span>
                              </li>
                            ))}
                          </ul>
                          <span className="tc-label">Fotos da entrada</span>
                          <div className="tc-photos">
                            {['Tampa', 'Teclado', 'Fundo', 'Etiqueta'].map((f, i) => (
                              <div key={f} style={s(0.3 + i * 0.05, 0.1)}><Camera /><span>{f}</span></div>
                            ))}
                          </div>
                        </div>
                        <div className="tc-order__right">
                          <span className="tc-label">Relato do cliente</span>
                          <p className="tc-quote">“{OS.defeito}”</p>
                          <span className="tc-label">Laudo técnico</span>
                          <p className="tc-laudo"><span data-type="laudo">{OS.laudo}</span><i className="tc-caret" /></p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ─────────── ORÇAMENTO ─────────── */}
                  <section className="tc-scene" data-scene="orcamento" aria-label="Orçamento do cliente">
                    <Guia
                      titulo="Orçamento: o cliente aprova pelo celular."
                      texto="Ele recebe o link, vê peças e mão de obra e assina na tela com o dedo. O sistema guarda a assinatura, o IP e o horário."
                      itens={['Acabou o “eu não autorizei”', 'Status muda para Aprovado sozinho', 'Orçamento em PDF para imprimir']}
                    />
                    <div className="tc-surface tc-quote-stage" aria-hidden="true">
                      <div className="tc-phone">
                        <div className="tc-phone__notch" />
                        <div className="tc-phone__screen">
                          <div className="tc-pq__head">
                            <Marca className="tc-mark tc-mark--sm" />
                            <span>Orçamento <code>{OS.codigo}</code></span>
                          </div>
                          <ul className="tc-pq__items">
                            {[...OS.pecas.map((p) => [p.nome, p.venda] as const), ...OS.servicos.map((x) => [x.nome, x.preco] as const)].map(([n, v], i) => (
                              <li key={n} style={s(0.08 + i * 0.05, 0.1)}><span>{n}</span><b>{reais(v)}</b></li>
                            ))}
                          </ul>
                          <div className="tc-pq__total"><span>Total</span><b>{reais(totalOS)}</b></div>
                          <div className="tc-pq__sign">
                            <svg viewBox="0 0 240 70">
                              <path
                                className="tc-sig"
                                pathLength={1}
                                d="M8 48c10-26 22-36 26-24s-10 34-2 30 16-38 24-34-6 30 2 28 12-20 18-18 0 16 8 14 10-14 18-12 2 10 10 8 14-10 22-10 6 6 14 4 20-8 30-6 20 2 34-4"
                              />
                            </svg>
                            <span>Assine aqui</span>
                          </div>
                          <div className="tc-pq__stamp">
                            <ShieldCheck />
                            <div>
                              <b>Aprovado por {OS.cliente}</b>
                              <span className="tc-mono">07/11/2026 14:32 · IP 177.37.***.12</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ─────────── ESTOQUE ─────────── */}
                  <section className="tc-scene" data-scene="estoque" aria-label="Estoque">
                    <Guia
                      titulo="Estoque: a peça sai quando entra na OS."
                      texto="Colocou o SSD na ordem de serviço, o estoque baixa na hora com o custo de compra registrado. Cancelou a OS, a peça volta sozinha."
                      itens={['SKU, custo e preço de venda', 'Alerta de estoque mínimo', 'Estorno automático no cancelamento']}
                    />
                    <div className="tc-surface tc-stock" aria-hidden="true">
                      <div className="tc-table-head tc-stock__grid"><span>Peça</span><span>Custo</span><span>Venda</span><span>Qtd.</span></div>
                      {[...OS.pecas, ...OUTRAS_PECAS].map((p, i) => {
                        const daOS = i < OS.pecas.length;
                        const baixo = p.estoque <= p.minimo;
                        return (
                          <div key={p.sku} className={`tc-stock__row tc-stock__grid${daOS ? ' is-focus' : ''}${baixo ? ' is-low' : ''}`} style={s(0.03 + i * 0.04, 0.12)}>
                            <span><code>{p.sku}</code>{p.nome}</span>
                            <span className="tc-mono">{reais(p.custo)}</span>
                            <span className="tc-mono">{reais(p.venda)}</span>
                            <span className="tc-qty">
                              {daOS ? (
                                <span className="tc-roll"><b>{p.estoque}</b><b>{p.estoque - 1}</b></span>
                              ) : (
                                <b>{p.estoque}</b>
                              )}
                              {baixo && <em>mínimo {p.minimo}</em>}
                            </span>
                          </div>
                        );
                      })}
                      <div className="tc-drawer">
                        <span className="tc-label">Movimentação · {OS.codigo}</span>
                        {OS.pecas.map((p, i) => (
                          <p key={p.sku} style={s(0.46 + i * 0.05, 0.08)}>
                            <b>Saída −1</b> {p.nome}<span className="tc-mono">custo {reais(p.custo)}</span>
                          </p>
                        ))}
                        <p className="tc-drawer__sum" style={s(0.56, 0.08)}>
                          Custo das peças desta OS <b className="tc-mono">{reais(totalPecasCusto)}</b>
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* ─────────── RASTREIO ─────────── */}
                  <section className="tc-scene" data-scene="rastreio" aria-label="Rastreio e avisos">
                    <Guia
                      titulo="Rastreio: o cliente para de ligar."
                      texto="Na página pública da sua assistência, o cliente acompanha a OS depois de digitar um código enviado por e-mail. Quando fica pronta, o aviso sai sozinho."
                      itens={['Código de 6 dígitos por e-mail', 'Valores e documentos ficam ocultos (LGPD)', 'Webhook para WhatsApp via n8n, Make ou API']}
                    />
                    <div className="tc-surface tc-track-stage" aria-hidden="true">
                      <div className="tc-public">
                        <div className="tc-public__url"><Lock /> trustcare.app/rastreio</div>
                        <div className="tc-otp">
                          <span className="tc-label">Código enviado para r****@gmail.com</span>
                          <div className="tc-otp__digits">
                            {'482913'.split('').map((d, i) => (
                              <b key={i} style={s(0.04 + i * 0.035, 0.05)}>{d}</b>
                            ))}
                          </div>
                        </div>
                        <div className="tc-public__body">
                          <p><b>{OS.equipamento}</b></p>
                          <p className="tc-soft">Cliente R. M. · valores ocultos</p>
                          <ol className="tc-timeline">
                            {['Recebido', 'Em análise', 'Aprovado', 'Em execução', 'Em testes', 'Pronto para retirada'].map((e, i) => (
                              <li key={e} style={s(0.28 + i * 0.06, 0.06)}><i />{e}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                      <div className="tc-notices">
                        <div className="tc-notice" style={s(0.62, 0.1)}>
                          <Mail /><div><b>E-mail enviado</b><span>“Seu Dell G15 está pronto para retirada.”</span></div>
                        </div>
                        <div className="tc-notice" style={s(0.72, 0.1)}>
                          <Webhook /><div><b>Webhook disparado</b><span className="tc-mono">status: pronto · {OS.codigo}</span></div>
                        </div>
                        <div className="tc-notice tc-notice--wa" style={s(0.82, 0.1)}>
                          <Wrench /><div><b>WhatsApp da sua integração</b><span>Mensagem de retirada para a cliente</span></div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ─────────── PAUSA ─────────── */}
                  <section className="tc-scene tc-scene--quiet" data-scene="pausa" aria-labelledby="h-pausa">
                    <div className="tc-pause">
                      <p style={s(0.02, 0.18)}>Pronto, entregue e pago.</p>
                      <h2 id="h-pausa" style={s(0.22, 0.22)}>E quanto disso ficou com você?</h2>
                    </div>
                  </section>

                  {/* ─────────── FINANCEIRO (pico) ─────────── */}
                  <section className="tc-scene" data-scene="financeiro" aria-label="Financeiro">
                    <Guia
                      titulo="Financeiro: o lucro de verdade, OS por OS."
                      texto="Faturamento não é lucro. O sistema tira o custo das peças de cada OS e as despesas fixas do mês, e mostra o que sobra."
                      itens={['Margem por OS e por período', 'Despesas fixas e recorrentes', 'Exportação em CSV']}
                    />
                    <div className="tc-surface tc-money" aria-hidden="true">
                      <div className="tc-money__os">
                        <div className="tc-money__label">
                          <code>{OS.codigo}</code>
                          <span>Recebido <b className="tc-mono">{reais(totalOS)}</b></span>
                        </div>
                        <div className="tc-split" style={{ '--wc': totalPecasCusto / totalOS, '--wp': lucroOS / totalOS } as React.CSSProperties}>
                          <div className="tc-split__seg tc-split__seg--cost">
                            <span>Custo das peças</span><b className="tc-mono">−{reais(totalPecasCusto)}</b>
                          </div>
                          <div className="tc-split__seg tc-split__seg--profit">
                            <span>Mão de obra {reais(totalServicos)} + margem das peças {reais(totalPecasVenda - totalPecasCusto)}</span>
                          </div>
                        </div>
                        <div className="tc-money__big">
                          <span>Ficou com você nesta OS</span>
                          <strong className="tc-mono" data-count="lucroOS">{reais(lucroOS)}</strong>
                          <em>margem {pct(margemOS)}</em>
                        </div>
                      </div>
                      <div className="tc-ledger">
                        <span className="tc-label">O mês inteiro</span>
                        {MES.map((o, i) => (
                          <div key={o.codigo} className={`tc-ledger__row${i === 0 ? ' is-focus' : ''}`} style={s(0.58 + i * 0.035, 0.06)}>
                            <code>{o.codigo}</code><span>{o.equip}</span>
                            <b className="tc-mono">{reais(o.receita - o.custoPecas)}</b>
                          </div>
                        ))}
                        {DESPESAS_FIXAS.map((d, i) => (
                          <div key={d.nome} className="tc-ledger__row tc-ledger__row--exp" style={s(0.8 + i * 0.04, 0.06)}>
                            <span /><span>{d.nome}</span><b className="tc-mono">−{reais(d.valor)}</b>
                          </div>
                        ))}
                        <div className="tc-ledger__total" style={s(0.9, 0.06)}>
                          <span>Faturou {reais(mesReceita)} · peças {reais(mesCustoPecas)} · fixas {reais(mesDespesas)}</span>
                          <span>Lucro líquido do mês <b className="tc-mono" data-count="mesLucro">{reais(mesLucro)}</b></span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ─────────── EQUIPE ─────────── */}
                  <section className="tc-scene" data-scene="equipe" aria-label="Equipe">
                    <Guia
                      titulo="Equipe: cada um no seu papel."
                      texto="O admin vê tudo. O técnico cuida da bancada sem ver o caixa. O atendente abre OS e consulta. E os dados da sua assistência ficam isolados das outras, no banco."
                      itens={['Convite por e-mail com papel definido', 'Atalho Ctrl+K para achar qualquer OS', 'Isolamento por empresa (Row Level Security)']}
                    />
                    <div className="tc-surface tc-team" aria-hidden="true">
                      <div className="tc-roles">
                        <div className="tc-table-head tc-roles__grid"><span>Permissão</span><span>Admin</span><span>Técnico</span><span>Atendente</span></div>
                        {[
                          ['Abrir e consultar OS', 1, 1, 1],
                          ['Laudo, peças e status', 1, 1, 0],
                          ['Estoque', 1, 1, 0],
                          ['Financeiro e despesas', 1, 0, 0],
                          ['Equipe e assinatura', 1, 0, 0],
                        ].map((r, i) => (
                          <div key={r[0] as string} className="tc-roles__grid tc-roles__row" style={s(0.05 + i * 0.06, 0.08)}>
                            <span>{r[0]}</span>
                            {[r[1], r[2], r[3]].map((v, j) => (
                              <i key={j} className={v ? 'is-on' : ''}>{v ? <Check /> : '·'}</i>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="tc-tenants">
                        <div className="tc-tenant tc-tenant--b">Outra assistência<span><Lock /> sem acesso</span></div>
                        <div className="tc-tenant tc-tenant--c">Outra assistência<span><Lock /> sem acesso</span></div>
                        <div className="tc-tenant tc-tenant--a">Sua assistência<span><ShieldCheck /> só a sua equipe</span></div>
                      </div>
                    </div>
                  </section>

                  {/* ─────────── PLANOS ─────────── */}
                  <section className="tc-scene" data-scene="planos" aria-label="Assinatura">
                    <Guia
                      titulo="Assinatura: três planos, o mesmo sistema."
                      texto="Comece com 7 dias grátis, sem cartão. O plano que você escolher aqui vai junto para o cadastro."
                      itens={['Cancele quando quiser', 'Troque de plano a qualquer momento', 'Suporte direto com quem fez o sistema']}
                    />
                    <div className="tc-surface tc-plans">
                      <span className="tc-label">Configurações / Assinatura e faturamento</span>
                      <div className="tc-plans__list" role="radiogroup" aria-label="Plano">
                        {PLANOS.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={plano === p.id}
                            className={`tc-plan${plano === p.id ? ' is-on' : ''}`}
                            style={s(0.05 + i * 0.08, 0.15)}
                            onClick={() => setPlano(p.id)}
                          >
                            <span className="tc-plan__name">{p.nome}</span>
                            <span className="tc-plan__price"><b>R$ {p.preco}</b>/mês</span>
                            <span className="tc-plan__for">{p.para}</span>
                            <span className="tc-plan__items">{p.itens.join(' · ')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* ─────────── COMEÇAR (fecho) ─────────── */}
                  <section className="tc-scene tc-scene--close" data-scene="comecar" aria-labelledby="h-comecar">
                    <div className="tc-first">
                      <span className="tc-label">Primeiro acesso · passo 1 de 3</span>
                      <h2 id="h-comecar">Como se chama a sua assistência?</h2>
                      <form
                        className="tc-first__form"
                        action="/register"
                        method="get"
                        onSubmit={(e) => {
                          e.preventDefault();
                          window.location.href = cadastro;
                        }}
                      >
                        <label htmlFor="tc-empresa" className="tc-sr">Nome da assistência</label>
                        <input
                          id="tc-empresa"
                          name="empresa"
                          autoComplete="organization"
                          placeholder="Ex.: Bancada do Zé Informática"
                          value={empresa}
                          onChange={(e) => setEmpresa(e.target.value)}
                        />
                        <input type="hidden" name="plan" value={plano} />
                        <button type="submit" className="tc-btn tc-btn--primary">
                          Testar 7 dias grátis <ArrowRight aria-hidden="true" />
                        </button>
                      </form>
                      <p className="tc-first__meta">
                        Plano {planoAtual.nome} · R$ {planoAtual.preco}/mês depois do teste · sem cartão · cancele quando quiser
                      </p>
                      <p className="tc-first__alt">
                        Prefere conversar antes? <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
                        {' · '}
                        <Link href="/login">Já tenho conta</Link>
                      </p>
                    </div>
                  </section>
                </div>

                {/* ── Assinatura da página: a OS que atravessa o sistema ── */}
                <footer className="tc-trace" aria-label={`Andamento da OS de exemplo ${OS.codigo}`}>
                  <div className="tc-trace__os">
                    <code>{OS.codigo}</code>
                    <span data-trace-status>{STATUS[0].nome}</span>
                  </div>
                  <ol className="tc-trace__rail">
                    {STATUS.map((st) => (
                      <li key={st.id} data-trace={st.id} style={{ '--c': st.cor } as React.CSSProperties} title={st.nome}>
                        <a href={`#${CENAS.find((c) => c.status?.includes(st.id))?.id ?? 'painel'}`} onClick={(e) => irPara(e, CENAS.find((c) => c.status?.includes(st.id))?.id ?? 'painel')}>
                          <span className="tc-sr">{st.nome}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                  <dl className="tc-trace__ledger">
                    <div data-ledger="total"><dt>Orçamento</dt><dd className="tc-mono">{reais(totalOS)}</dd></div>
                    <div data-ledger="custo"><dt>Peças</dt><dd className="tc-mono">−{reais(totalPecasCusto)}</dd></div>
                    <div data-ledger="lucro"><dt>Lucro</dt><dd className="tc-mono">{reais(lucroOS)}</dd></div>
                  </dl>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="tc-faq" aria-labelledby="h-faq">
        <h2 id="h-faq">Antes de testar</h2>
        <div>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="tc-foot">
        <div className="tc-wordmark"><Marca className="tc-mark" /><span>Trust Care</span></div>
        <p>Sistema para assistências técnicas. Os valores desta página são dados de exemplo.</p>
        <nav aria-label="Rodapé">
          <Link href="/">Versão anterior do site</Link>
          <Link href="/login">Entrar</Link>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </nav>
      </footer>
    </div>
  );
}
