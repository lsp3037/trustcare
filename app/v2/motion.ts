/**
 * Linha do tempo da landing v2.
 *
 * O scroll é a única entrada: a posição vira `u` (em "telas"), suavizada por
 * lerp, e cada cena recebe o próprio progresso local em `--t`. O CSS deriva
 * quase toda a coreografia de `--t`; aqui ficam só a geometria do notebook,
 * contadores, a digitação do laudo e a máquina de status da OS de exemplo.
 */
import type { MouseEvent as RMouseEvent } from 'react';
import { MES, OS, STATUS, lucroOS, mesLucro, mesReceita, reais } from './dados';

type CenaBase = { id: string; span: number; status?: string[]; antes?: number; ancora?: number };

const BASE: CenaBase[] = [
  { id: 'abertura', span: 1.7 },
  // O painel começa a montar enquanto a câmera ainda entra na tela.
  { id: 'painel', span: 1.0, status: ['aguardando'], antes: 0.45 },
  { id: 'clientes', span: 1.0 },
  { id: 'os', span: 1.3, status: ['analise', 'aprovacao'] },
  { id: 'orcamento', span: 1.2, status: ['aprovado'] },
  { id: 'estoque', span: 1.0, status: ['pecas', 'execucao', 'testes'] },
  { id: 'rastreio', span: 1.1, status: ['pronto'] },
  { id: 'pausa', span: 0.6 },
  { id: 'financeiro', span: 2.0, status: ['finalizado'], ancora: 0.97 },
  { id: 'equipe', span: 0.9 },
  { id: 'planos', span: 0.9 },
  { id: 'comecar', span: 0.8, ancora: 1 },
];

export type Cena = CenaBase & { inicio: number; ancora: number };

let acc = 0;
export const CENAS: Cena[] = BASE.map((c) => {
  const inicio = acc - (c.antes ?? 0);
  const span = c.span + (c.antes ?? 0);
  acc += c.span;
  // Âncora = ponto onde o módulo já está montado, não o primeiro frame vazio.
  return { ...c, inicio, span, ancora: c.id === 'abertura' ? 0 : inicio + span * (c.ancora ?? 0.62) };
});
export const TOTAL = acc;
const cena = (id: string) => CENAS.find((c) => c.id === id)!;
const em = (id: string, t: number) => cena(id).inicio + cena(id).span * t;

/** Em que ponto da página cada status da OS acontece. */
const MARCOS: { u: number; status: string; pulado?: string }[] = [
  { u: 0, status: 'aguardando' },
  { u: em('os', 0.14), status: 'analise' },
  { u: em('os', 0.82), status: 'aprovacao' },
  { u: em('orcamento', 0.72), status: 'aprovado' },
  { u: em('estoque', 0.22), status: 'execucao', pulado: 'pecas' },
  { u: em('estoque', 0.86), status: 'testes' },
  { u: em('rastreio', 0.3), status: 'pronto' },
  { u: em('financeiro', 0.04), status: 'finalizado' },
];
const LEDGER = [
  { k: 'total', u: em('orcamento', 0.5) },
  { k: 'custo', u: em('estoque', 0.7) },
  { k: 'lucro', u: em('financeiro', 0.45) },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const out = (x: number) => 1 - Math.pow(1 - x, 3);

const COUNTERS: Record<string, { cena: string; de: number; ate: number; valor: number; fmt: (n: number) => string }> = {
  fat: { cena: 'painel', de: 0.16, ate: 0.42, valor: mesReceita, fmt: reais },
  abertas: { cena: 'painel', de: 0.2, ate: 0.36, valor: 7, fmt: (n) => String(Math.round(n)) },
  ticket: { cena: 'painel', de: 0.22, ate: 0.44, valor: mesReceita / MES.length, fmt: reais },
  baixo: { cena: 'painel', de: 0.26, ate: 0.36, valor: 1, fmt: (n) => String(Math.round(n)) },
  lucroOS: { cena: 'financeiro', de: 0.3, ate: 0.5, valor: lucroOS, fmt: reais },
  mesLucro: { cena: 'financeiro', de: 0.9, ate: 1, valor: mesLucro, fmt: reais },
};


/** Rola até o módulo. Sem JS, o href `#id` já leva à âncora. */
export function irPara(e: RMouseEvent, id: string) {
  const alvo = cena(id);
  const track = document.querySelector<HTMLElement>('.tc-track');
  if (!alvo || !track || document.documentElement.dataset.tcMotion !== 'live') return;
  e.preventDefault();
  const vh = document.querySelector<HTMLElement>('.tc-stage')!.clientHeight;
  const top = track.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top + alvo.ancora * vh, behavior: 'smooth' });
  history.replaceState(null, '', `#${id}`);
}

export function iniciarLinhaDoTempo(raiz: HTMLElement) {
  const html = document.documentElement;
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $ = (sel: string) => raiz.querySelector(sel) as HTMLElement;
  const $$ = (sel: string) => Array.from(raiz.querySelectorAll<HTMLElement>(sel));

  const track = $('.tc-track');
  const stage = $('.tc-stage');
  const laptop = $('.tc-laptop');
  const bench = $('.tc-bench');
  const herobar = $('.tc-herobar');
  const heroCopy = $('.tc-hero-copy');
  const heroScrim = $('.tc-hero-scrim');
  const fore = $('.tc-fore');
  const trace = $('.tc-trace');
  const app = $('.tc-app');
  const inner = $('.tc-app__inner');
  const crumb = $('[data-crumb]');
  const navs = $$('[data-nav]');
  const tabs = $('.tc-tabs');
  const cenas = new Map(CENAS.filter((c) => c.id !== 'abertura').map((c) => [c.id, $(`[data-scene="${c.id}"]`)]));
  const traceItems = new Map($$('[data-trace]').map((el) => [el.dataset.trace!, el]));
  const traceStatus = $('[data-trace-status]');
  const osPill = $('[data-os-status]');
  const ledger = $$('[data-ledger]');
  const laudo = $('[data-type="laudo"]');
  const counters = $$('[data-count]').map((el) => ({ el, cfg: COUNTERS[el.dataset.count!] }));

  track.style.setProperty('--tc-total', String(TOTAL));
  raiz.style.setProperty('--tc-total', String(TOTAL));
  for (const c of CENAS) raiz.querySelector<HTMLElement>(`.tc-anchor#${c.id}`)?.style.setProperty('--start', String(c.ancora));

  // ── Modo estático: movimento reduzido. Tudo no estado final, em fluxo. ──
  if (reduzido) {
    delete html.dataset.tcMotion;
    for (const el of cenas.values()) el?.style.setProperty('--t', '1');
    for (const { el, cfg } of counters) if (cfg) el.textContent = cfg.fmt(cfg.valor);
    return () => {};
  }
  html.dataset.tcMotion = 'live';

  // ── Geometria ──
  let W = 0, H = 0, vh = 0, trackTop = 0, desktop = true;
  let geo = { L: 0, Lh: 0, left: 0, top: 0, c0x: 0, c0y: 0, r0w: 0, r0h: 0, S: 1, lift: 0 };

  function medir() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    vh = H;
    trackTop = track.getBoundingClientRect().top + window.scrollY;
    desktop = W >= 1024;
    const L = desktop ? Math.min(W * 0.5, H * 1.12, 900) : Math.min(W * 0.88, 560, H * 0.72);
    const Lh = L * 0.63;
    const cx = desktop ? W * 0.655 : W / 2;
    const cy = desktop ? H * 0.44 : H * (W > 700 ? 0.6 : 0.6);
    const hinge = cy + Lh / 2;
    const b = L * 0.028;
    const left = cx - L / 2;
    const top = hinge - Lh;
    const r0w = L - 2 * b;
    const r0h = Lh - b - b * 1.5;
    const c0x = cx;
    const c0y = top + b + r0h / 2;
    const S = Math.max(W / r0w, H / r0h) * 1.002;
    // Fechado, o notebook é visto de cima: sobe para caber inteiro na tela.
    const lift = desktop ? H * 0.2 : H * (H < 700 ? 0.1 : 0.17);
    geo = { L, Lh, left, top, c0x, c0y, r0w, r0h, S, lift };
    laptop.style.cssText = `--L:${L}px;left:${left}px;top:${top}px;width:${L}px;height:${Lh}px;--ox:${c0x - left}px;--oy:${c0y - top}px`;
    // cssText apaga a transformação: o cache precisa esquecer o que já tinha escrito.
    cache.delete(laptop);
    stage.style.setProperty('--po', `${c0x}px ${c0y}px`);
  }

  // ── Estado ──
  let alvo = 0, atual = -1, mx = 0, my = 0, pmx = 0, pmy = 0;
  let rodando = false, ultimo = 0;
  let ativo = '';
  let statusAtual = '';

  // Só escreve no DOM quando o valor muda: cada escrita de variável CSS
  // invalida o estilo da subárvore inteira do elemento.
  const cache = new WeakMap<HTMLElement, Record<string, string>>();
  function por(el: HTMLElement, prop: string, valor: string) {
    let c = cache.get(el);
    if (!c) cache.set(el, (c = {}));
    if (c[prop] === valor) return;
    c[prop] = valor;
    if (prop.startsWith('--')) el.style.setProperty(prop, valor);
    else (el.style as unknown as Record<string, string>)[prop] = valor;
  }
  let heroFeito = false;

  function lerAlvo() {
    alvo = clamp((window.scrollY - trackTop) / vh, 0, TOTAL);
  }

  function hero(u: number) {
    const h = clamp(u / cena('abertura').span, 0, 1);
    // Depois da abertura, nada do hero muda: não escreve mais nada.
    if (h >= 1 && heroFeito) return;
    heroFeito = h >= 1;
    const abrir = ease(clamp((h - 0.08) / 0.46));
    const empurrar = ease(clamp((h - 0.58) / 0.42));
    const copia = clamp((h - 0.26) / 0.26);
    const { S, c0x, c0y, r0w, r0h, lift } = geo;

    const vCopia = (1 - copia).toFixed(3);
    por(herobar, '--hero-copy', vCopia);
    por(heroCopy, '--hero-copy', vCopia);
    por(heroScrim, '--hero-copy', vCopia);
    por(herobar, 'visibility', copia >= 0.98 ? 'hidden' : 'visible');
    por(heroCopy, 'visibility', copia >= 0.98 ? 'hidden' : 'visible');
    por(bench, '--hero-open', abrir.toFixed(3));
    por(laptop, '--hero-open', abrir.toFixed(3));
    por(bench, '--hero-h', h.toFixed(3));
    por(fore, '--hero-h', h.toFixed(3));
    por(fore, 'visibility', h > 0.4 ? 'hidden' : 'visible');
    if (fino && h < 0.6) {
      const mxs = pmx.toFixed(3), mys = pmy.toFixed(3);
      for (const el of [bench, heroCopy, fore]) { por(el, '--mx', mxs); por(el, '--my', mys); }
    }

    const s = Math.pow(S, empurrar);
    const dx = (W / 2 - c0x) * empurrar;
    const dy = (H / 2 - c0y) * empurrar - lift * (1 - abrir);
    const tilt = 50 * (1 - abrir);
    const pointer = h < 0.6 ? 1 - clamp((h - 0.4) / 0.2) : 0;
    const ry = pmx * 5 * pointer;
    const rx = -tilt + pmy * -3 * pointer;
    por(laptop, 'transform', `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(${s.toFixed(4)}) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`);
    por(laptop, '--lid', `${(-88 + 88 * abrir).toFixed(2)}deg`);
    por(laptop, 'visibility', h >= 1 ? 'hidden' : 'visible');

    const revelar = clamp((h - 0.55) / 0.07);
    if (h >= 1) {
      por(app, 'clipPath', 'none');
      por(inner, 'transform', 'none');
      por(app, 'opacity', '1');
      por(app, 'visibility', 'visible');
      app.classList.add('is-open');
    } else {
      app.classList.remove('is-open');
      por(app, 'visibility', revelar <= 0 ? 'hidden' : 'visible');
      por(app, 'opacity', revelar.toFixed(3));
      if (revelar <= 0) return;
      const w = r0w * s, hh = r0h * s;
      const cx = c0x + dx, cy = c0y + dy;
      const r = 10 * (1 - empurrar) * s;
      const f = (n: number) => Math.max(0, n).toFixed(1);
      por(app, 'clipPath', `inset(${f(cy - hh / 2)}px ${f(W - cx - w / 2)}px ${f(H - cy - hh / 2)}px ${f(cx - w / 2)}px round ${r.toFixed(1)}px)`);
      const k = Math.min(1, Math.max(w / W, hh / H));
      por(inner, 'transform', `translate3d(${(cx - W / 2).toFixed(1)}px,${(cy - H / 2).toFixed(1)}px,0) scale(${k.toFixed(4)})`);
    }
  }

  function render(u: number) {
    hero(u);

    let melhor = 'painel';
    for (const c of CENAS) {
      if (c.id === 'abertura') continue;
      const el = cenas.get(c.id);
      if (!el) continue;
      let t = (u - c.inicio) / c.span;
      if (c.id === 'comecar') t = Math.min(t, 1);
      const visivel = t > -0.16 && t < 1.14;
      if (visivel) {
        por(el, '--t', clamp(t, -0.2, 1.2).toFixed(3));
        if (!el.dataset.on) el.dataset.on = '1';
      } else if (el.dataset.on) {
        delete el.dataset.on;
      }
      if (u >= c.inicio - 0.05) melhor = c.id === 'pausa' ? melhor : c.id;
      if (c.id === 'pausa' && t >= 0 && t < 1) melhor = 'financeiro';
    }

    // Módulo ativo: barra lateral, abas e breadcrumb.
    if (melhor !== ativo) {
      ativo = melhor;
      for (const n of navs) n.toggleAttribute('aria-current', n.dataset.nav === ativo);
      const atualNav = navs.find((n) => n.dataset.nav === ativo && !n.closest('.tc-tabs'));
      crumb.textContent = ativo === 'comecar' ? 'Primeiro acesso' : atualNav?.querySelector('span')?.textContent ?? '';
      const aba = navs.find((n) => n.dataset.nav === ativo && n.closest('.tc-tabs'));
      if (aba && tabs) tabs.scrollTo({ left: aba.offsetLeft - tabs.clientWidth / 2 + aba.clientWidth / 2, behavior: 'smooth' });
    }

    // A OS que atravessa o sistema.
    let marco = MARCOS[0];
    for (const m of MARCOS) if (u >= m.u) marco = m;
    if (marco.status !== statusAtual) {
      statusAtual = marco.status;
      const idx = STATUS.findIndex((s) => s.id === statusAtual);
      const st = STATUS[idx];
      traceStatus.textContent = st.nome;
      osPill.textContent = st.nome;
      osPill.style.setProperty('--c', st.cor);
      trace.style.setProperty('--os-cor', st.cor);
      STATUS.forEach((s, i) => {
        const li = traceItems.get(s.id)!;
        const pulado = MARCOS.some((m) => m.pulado === s.id && u >= m.u);
        li.dataset.state = pulado ? 'skip' : i < idx ? 'done' : i === idx ? 'now' : '';
      });
    }
    for (const l of ledger) {
      const m = LEDGER.find((x) => x.k === l.dataset.ledger)!;
      if (l.classList.contains('is-on') !== u >= m.u) l.classList.toggle('is-on', u >= m.u);
    }

    // Números e texto que dependem do progresso.
    for (const { el, cfg } of counters) {
      if (!cfg) continue;
      const c = cena(cfg.cena);
      const t = (u - c.inicio) / c.span;
      const p = out(clamp((t - cfg.de) / (cfg.ate - cfg.de)));
      const txt = cfg.fmt(cfg.valor * p);
      if (el.textContent !== txt) el.textContent = txt;
    }
    if (laudo) {
      const c = cena('os');
      const t = (u - c.inicio) / c.span;
      const n = Math.round(OS.laudo.length * clamp((t - 0.42) / 0.36));
      const txt = OS.laudo.slice(0, n);
      if (laudo.textContent !== txt) laudo.textContent = txt;
      const digitando = n > 0 && n < OS.laudo.length;
      if (laudo.parentElement!.classList.contains('is-typing') !== digitando) laudo.parentElement!.classList.toggle('is-typing', digitando);
    }
  }

  function quadro(agora: number) {
    const dt = Math.min(0.05, (agora - (ultimo || agora)) / 1000);
    ultimo = agora;
    const k = 1 - Math.exp(-dt * (fino ? 15 : 20));
    if (atual < 0) atual = alvo;
    else atual += (alvo - atual) * k;
    if (Math.abs(alvo - atual) < 0.0006) atual = alvo;
    pmx += (mx - pmx) * k;
    pmy += (my - pmy) * k;
    if (Math.abs(mx - pmx) < 0.001) pmx = mx;
    if (Math.abs(my - pmy) < 0.001) pmy = my;
    render(atual);
    if (atual !== alvo || pmx !== mx || pmy !== my) requestAnimationFrame(quadro);
    else {
      rodando = false;
      ultimo = 0;
    }
  }
  function acordar() {
    if (rodando) return;
    rodando = true;
    requestAnimationFrame(quadro);
  }

  const onScroll = () => {
    lerAlvo();
    acordar();
  };
  const onResize = () => {
    medir();
    heroFeito = false;
    lerAlvo();
    atual = alvo;
    render(atual);
  };
  const onPointer = (e: PointerEvent) => {
    mx = (e.clientX / W) * 2 - 1;
    my = (e.clientY / H) * 2 - 1;
    acordar();
  };

  medir();
  lerAlvo();
  atual = alvo;
  render(atual);

  // Âncora na URL (#financeiro etc.): pula direto para o módulo.
  const hash = location.hash.slice(1);
  if (hash && cena(hash)) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: trackTop + cena(hash).ancora * vh });
      onResize();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  if (fino) window.addEventListener('pointermove', onPointer, { passive: true });
  const ro = new ResizeObserver(onResize);
  ro.observe(stage);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointer);
    ro.disconnect();
    delete html.dataset.tcMotion;
  };
}
