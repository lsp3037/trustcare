'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { isSubscriptionReadOnly, getTrialDaysRemaining } from '@/lib/utils/subscription';

export type SubscriptionPlan = 'starter' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Company {
  id?: string;
  name: string;
  phone: string;
  email: string;
  logo_url: string;
  whatsapp?: string;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  subscription_expires_at?: string;
  trial_ends_at?: string;
  subdomain?: string;
}

export interface CompanyContextType {
  company: Company;
  loading: boolean;
  isReadOnly: boolean;
  trialDaysRemaining: number | null;
  maxTechnicians: number;
  maxStorageBytes: bigint;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company>({
    name: 'Trust Care T.I.',
    phone: '(66) 99999-9999',
    email: 'contato@trustcare.com.br',
    logo_url: '',
    whatsapp: '',
    subscription_plan: 'starter',
    subscription_status: 'trialing'
  });
  const [loading, setLoading] = useState(true);

  const fetchCompanyData = async (forceLoading = false) => {
    try {
      if (forceLoading) {
        setLoading(true);
      }

      // 1. Tenta buscar direto do Supabase via RLS
      let companyData: any = null;
      const resWithTrial = await supabase
        .from('companies')
        .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, trial_ends_at, subdomain')
        .maybeSingle();

      if (!resWithTrial.error && resWithTrial.data) {
        companyData = resWithTrial.data;
      } else {
        // Fallback: se trial_ends_at não tiver permissão concedida ainda ou não existir na tabela
        const resBasic = await supabase
          .from('companies')
          .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, subdomain')
          .maybeSingle();

        if (!resBasic.error && resBasic.data) {
          companyData = resBasic.data;
        }
      }

      // 2. Se o usuário estiver autenticado no Supabase Auth mas não tiver empresa no RLS
      // (ex: conta criada no dashboard em localhost sem trigger disparado), auto-provisiona
      if (!companyData) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const ensureRes = await fetch('/api/company/ensure', { method: 'POST', headers });
            if (ensureRes.ok) {
              const json = await ensureRes.json();
              if (json.company) {
                companyData = json.company;
              }
            }
          }
        } catch (apiErr) {
          console.warn('[CompanyContext] Falha na auto-recuperação da empresa via ensure:', apiErr);
        }
      }

      if (companyData) {
        const companyObj = {
          id: companyData.id,
          name: companyData.name || 'Trust Care T.I.',
          phone: companyData.phone || '(66) 99999-9999',
          email: companyData.email || 'contato@trustcare.com.br',
          logo_url: companyData.logo_url || '',
          whatsapp: companyData.whatsapp || '',
          subscription_plan: (companyData.subscription_plan || 'starter') as SubscriptionPlan,
          subscription_status: (companyData.subscription_status || 'trialing') as SubscriptionStatus,
          subscription_expires_at: companyData.subscription_expires_at || '',
          trial_ends_at: companyData.trial_ends_at || '',
          subdomain: companyData.subdomain || ''
        };
        setCompany(companyObj);
        return;
      }

      throw new Error('Nenhuma empresa encontrada para o usuário.');
    } catch (err) {
      console.warn('Erro ao carregar dados da empresa do Supabase:', err);
      // Inicializa com dados padrão
      const defaultCompany = {
        name: 'Trust Care T.I.',
        phone: '(66) 99999-9999',
        email: 'contato@trustcare.com.br',
        logo_url: '',
        whatsapp: '',
        subscription_plan: 'starter' as SubscriptionPlan,
        subscription_status: 'trialing' as SubscriptionStatus,
      };
      setCompany(defaultCompany);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Escuta alterações de login/logout para recarregar dados
    // onAuthStateChange dispara INITIAL_SESSION imediatamente na montagem
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session) {
          await fetchCompanyData();
        } else {
          // Tenta carregar local se não houver sessão ativa
          const localCompany = localStorage.getItem('mock-company-settings');
          if (localCompany) {
            setCompany(JSON.parse(localCompany));
          }
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // Limpa se deslogar
        setCompany({
          name: 'Trust Care T.I.',
          phone: '(66) 99999-9999',
          email: 'contato@trustcare.com.br',
          logo_url: '',
          whatsapp: '',
          subscription_plan: 'starter',
          subscription_status: 'trialing'
        });
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Espelha `public.is_company_read_only` — se divergir, a tela libera ações
  // que a RLS recusa (ex.: trial vencido abria o formulário de OS e o insert falhava).
  const isReadOnly = React.useMemo(() => {
    // Sem `id` o objeto é o placeholder local (offline/carregando), não dado real.
    if (!company.id) return false;
    return isSubscriptionReadOnly(company);
  }, [company]);

  const trialDaysRemaining = React.useMemo(() => {
    if (!company.id) return null;
    return getTrialDaysRemaining(company);
  }, [company]);

  // Cotas operacionais baseadas no plano
  const maxTechnicians = React.useMemo(() => {
    const plan = company.subscription_plan || 'starter';
    if (plan === 'premium') return 99999;
    if (plan === 'pro') return 3;
    return 1; // starter
  }, [company.subscription_plan]);

  const maxStorageBytes = React.useMemo(() => {
    const plan = company.subscription_plan || 'starter';
    if (plan === 'premium') return BigInt(53687091200); // 50 GB
    if (plan === 'pro') return BigInt(5368709120); // 5 GB
    return BigInt(1073741824); // 1 GB (starter)
  }, [company.subscription_plan]);

  return (
    <CompanyContext.Provider value={{ 
      company, 
      loading, 
      isReadOnly, 
      trialDaysRemaining,
      maxTechnicians, 
      maxStorageBytes, 
      refreshCompany: () => fetchCompanyData(true) 
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany deve ser usado dentro de um CompanyProvider');
  }
  return context;
}
