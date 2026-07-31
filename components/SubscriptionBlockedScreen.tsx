'use client';

import React, { useState } from 'react';
import { ShieldAlert, CreditCard, MessageSquare, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Badge, Button, buttonClasses } from '@/components/ui';

interface SubscriptionBlockedScreenProps {
  companyName: string;
  status: 'canceled' | 'past_due' | 'trialing' | string;
}

const BLOCK_COPY: Record<string, { badge: string; body: string; cta: string }> = {
  canceled: {
    badge: 'Acesso Suspenso',
    body: 'Sua assinatura do Trust Care foi cancelada. Para continuar utilizando a plataforma e gerenciar suas ordens de serviço, é necessário reativar seu plano.',
    cta: 'Falar com Suporte (Reativar)',
  },
  trialing: {
    badge: 'Período de Testes Encerrado',
    body: 'Seus 7 dias de teste do Trust Care chegaram ao fim. Escolha um plano para voltar a criar ordens de serviço, clientes e lançamentos financeiros.',
    cta: 'Escolher um Plano',
  },
  past_due: {
    badge: 'Acesso Suspenso',
    body: 'Identificamos uma pendência no pagamento da sua assinatura. Para evitar a perda definitiva de acesso e garantir a continuidade dos seus serviços, regularize seu plano.',
    cta: 'Falar com Suporte (Regularizar)',
  },
};

export default function SubscriptionBlockedScreen({ companyName, status }: SubscriptionBlockedScreenProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem('os-session');
    router.push('/login');
  };

  const copy = BLOCK_COPY[status] ?? BLOCK_COPY.past_due;
  const isTrialExpired = status === 'trialing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface p-4 overflow-y-auto">
      <div
        role="alert"
        className="w-full max-w-lg bg-surface-raised border border-border p-8 text-center space-y-6 shadow-2xl"
      >
        {/* Top visual warning */}
        <div className="flex justify-center">
          <div className="p-4 bg-danger/10 text-danger border border-danger/25" aria-hidden>
            <ShieldAlert className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-3">
          <Badge tone="danger" className="uppercase tracking-wider">
            {copy.badge}
          </Badge>
          <h1 className="text-h1 text-text">{companyName}</h1>
          <p className="text-body text-text-muted max-w-md mx-auto">{copy.body}</p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-surface-sunken border border-border text-left space-y-3">
          <h2 className="text-caption uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-text-subtle" aria-hidden />
            Informações sobre o plano
          </h2>
          <p className="text-small text-text-muted">
            Seus dados cadastrados, clientes e histórico de ordens de serviço continuam armazenados com total segurança. Assim que a assinatura for restabelecida, o acesso total será liberado instantaneamente.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {isTrialExpired ? (
            <a href="/dashboard/settings/billing" className={buttonClasses({ className: 'flex-1' })}>
              <CreditCard className="w-4 h-4" aria-hidden /> {copy.cta}
            </a>
          ) : (
            <a
              href="https://wa.me/5565999620703?text=Ol%C3%A1!%20Gostaria%20de%20reativar%20minha%20assinatura%20do%20Trust%20Care%20para%20a%20empresa%20"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ className: 'flex-1' })}
            >
              <MessageSquare className="w-4 h-4" aria-hidden /> {copy.cta}
            </a>
          )}

          <Button
            variant="secondary"
            icon={<LogOut className="w-4 h-4" />}
            loading={loggingOut}
            onClick={handleLogout}
          >
            Sair da Conta
          </Button>
        </div>

        <p className="text-caption uppercase tracking-wider text-text-subtle">
          Trust Care — Gestão Inteligente de Assistências
        </p>
      </div>
    </div>
  );
}
