'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { isSubscriptionReadOnly } from '@/lib/utils/subscription';

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
  subdomain?: string;
}

export interface CompanyContextType {
  company: Company;
  loading: boolean;
  isReadOnly: boolean;
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
      // Busca a empresa associada ao usuário autenticado (a política RLS de select_company cuida do filtro automático por tenant)
      // Colunas explícitas: `api_key` e ids do Asaas não são legíveis pelo front.
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, subdomain')
        .single();

      if (error) throw error;

      if (data) {
        const companyObj = {
          id: data.id,
          name: data.name || 'Trust Care T.I.',
          phone: data.phone || '(66) 99999-9999',
          email: data.email || 'contato@trustcare.com.br',
          logo_url: data.logo_url || '',
          whatsapp: data.whatsapp || '',
          subscription_plan: (data.subscription_plan || 'starter') as SubscriptionPlan,
          subscription_status: (data.subscription_status || 'trialing') as SubscriptionStatus,
          subscription_expires_at: data.subscription_expires_at || '',
          subdomain: data.subdomain || ''
        };
        setCompany(companyObj);
        // Salva localmente para uso offline também
        localStorage.setItem('mock-company-settings', JSON.stringify(companyObj));
      }
    } catch (err) {
      console.warn('Erro ao carregar dados da empresa do Supabase, carregando local:', err);
      // Carrega localmente
      const localCompany = localStorage.getItem('mock-company-settings');
      if (localCompany) {
        setCompany(JSON.parse(localCompany));
      } else {
        // Inicializa com dados padrão
        const defaultCompany = {
          name: 'Trust Care T.I.',
          phone: '(66) 99999-9999',
          email: 'contato@trustcare.com.br',
          logo_url: '',
          whatsapp: '',
          subscription_plan: 'starter' as SubscriptionPlan,
          subscription_status: 'trialing' as SubscriptionStatus
        };
        localStorage.setItem('mock-company-settings', JSON.stringify(defaultCompany));
        setCompany(defaultCompany);
      }
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
