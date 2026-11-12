'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import s from './PricingSwitcher.module.css';

type Plan = {
  id: string;
  name: string;
  tagline: string;
  /** Parte inteira do preço; os centavos são sempre ",90". */
  price: number;
  features: string[];
  cta: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Para quem atende sozinho.',
    price: 29,
    features: ['1 usuário (admin)', 'O.S. ilimitadas', 'Cadastro de clientes', 'Orçamento em PDF'],
    cta: 'Assinar Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'O ponto de equilíbrio para crescer.',
    price: 69,
    features: ['Até 3 usuários', 'Painel de rastreio público', 'Módulo financeiro', 'Aviso automático de status', 'Controle de estoque'],
    cta: 'Iniciar teste grátis',
    featured: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Para assistências de alto volume.',
    price: 149,
    features: ['Usuários ilimitados', 'Tudo do plano Pro', 'API para integrações', 'Suporte prioritário'],
    cta: 'Assinar Premium',
  },
];

const DEFAULT_PLAN = PLANS.findIndex((p) => p.featured);

function Tabs({ items, value, onChange }: { items: string[]; value: number; onChange: (i: number) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const tab = bar.current?.querySelectorAll<HTMLElement>('[role="tab"]')[value];
      const p = pill.current;
      if (!tab || !p) return;
      const prev = p.style.transition;
      if (!animate) p.style.transition = 'none';
      p.style.transform = `translateX(${tab.offsetLeft}px)`;
      p.style.width = `${tab.offsetWidth}px`;
      if (!animate) {
        void p.offsetWidth;
        p.style.transition = prev;
      }
    };
    place(!first.current);
    first.current = false;
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [value]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (value + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    onChange(next);
    bar.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div className={s.tabs} role="tablist" aria-label="Planos" ref={bar} onKeyDown={onKeyDown}>
      <span className={s.pill} ref={pill} aria-hidden="true" />
      {items.map((t, i) => (
        <button
          key={t}
          type="button"
          role="tab"
          id={`plano-tab-${i}`}
          aria-controls={`plano-painel-${i}`}
          aria-selected={i === value}
          tabIndex={i === value ? 0 : -1}
          className={s.tab}
          onClick={() => onChange(i)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/** Dígitos do preço: entram em cascata sempre que o painel volta a ficar ativo. */
function Digits({ value, active }: { value: string; active: boolean }) {
  const [n, setN] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (active) setN((x) => x + 1);
  }, [active]);

  const chars = value.split('');
  return (
    <span className={s.digits} data-animating={n ? '' : undefined} key={n}>
      {chars.map((c, i) => (
        <span
          key={i}
          className={s.digit}
          data-stagger={i === chars.length - 2 ? '1' : i === chars.length - 1 ? '2' : undefined}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

/** Texto do botão: sai para cima com blur e o novo entra de baixo. */
function SwapText({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');

  useEffect(() => {
    if (text === shown) return;
    setPhase('exit');
    let raf1 = 0;
    let raf2 = 0;
    const t = setTimeout(() => {
      setShown(text);
      setPhase('enter');
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase('idle'));
      });
    }, 150);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // `shown` fica de fora de propósito: só reage a um texto novo.
  }, [text]);

  return (
    <span className={s.swap} data-phase={phase}>
      {shown}
    </span>
  );
}

export function PricingSwitcher() {
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const current = PLANS[plan];

  return (
    <div className={s.root}>
      <div className={s.head}>
        <h3 className={`${s.title} font-display`}>Escolha seu plano</h3>
        <span className={s.trial}>7 dias grátis · sem cartão</span>
      </div>

      <Tabs items={PLANS.map((p) => p.name)} value={plan} onChange={setPlan} />

      <div className={s.pages}>
        {PLANS.map((p, i) => (
          <section
            key={p.id}
            id={`plano-painel-${i}`}
            role="tabpanel"
            aria-labelledby={`plano-tab-${i}`}
            aria-hidden={i !== plan}
            className={s.page}
            data-on={i === plan ? '' : undefined}
            style={{ '--dir': i < plan ? -1 : 1 } as CSSProperties}
          >
            <div>
              <p className={s.meta}>{p.tagline}</p>
              <div className={s.priceRow}>
                <div className={`${s.price} font-display`}>
                  <span>
                    R$&nbsp;
                    <Digits value={String(p.price)} active={i === plan} />
                  </span>
                  <small>,90/mês</small>
                </div>
                {p.featured && <span className={s.badge}>Mais usado</span>}
              </div>
              <p className={s.meta}>Cobrado mensalmente · cancele quando quiser</p>
            </div>
            <div className={s.divider} />
            <ul className={s.feats}>
              {p.features.map((f) => (
                <li key={f}>
                  <svg className={s.check} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" aria-hidden="true">
                    <path d="M5.25 12.7033 9.40385 17.37 18.75 6.87" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Link href={`/register?plan=${current.id}`} className={s.cta}>
        <SwapText text={current.cta} />
      </Link>
    </div>
  );
}
