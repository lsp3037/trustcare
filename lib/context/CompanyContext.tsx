'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export type SubscriptionPlan = 'basico' | 'profissional' | 'premium';
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
    subscription_plan: 'basico',
    subscription_status: 'trialing'
  });
  const [loading, setLoading] = useState(true);

  const fetchCompanyData = async (forceLoading = false) => {
    try {
      if (forceLoading) {
        setLoading(true);
      }
      // Busca a empresa associada ao usuário autenticado (a política RLS de select_company cuida do filtro automático por tenant)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
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
          subscription_plan: (data.subscription_plan || 'basico') as SubscriptionPlan,
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
          subscription_plan: 'basico' as SubscriptionPlan,
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
          subscription_plan: 'basico',
          subscription_status: 'trialing'
        });
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Determina se a empresa está em modo apenas-leitura (atraso de mais de 5 dias ou cancelado)
  const isReadOnly = React.useMemo(() => {
    if (!company.subscription_status) return false;
    if (company.subscription_status === 'canceled') return true;
    if (company.subscription_status === 'past_due') {
      if (!company.subscription_expires_at) return false;
      const expiresDate = new Date(company.subscription_expires_at);
      const gracePeriodEnd = new Date(expiresDate.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 dias
      return new Date() > gracePeriodEnd;
    }
    return false;
  }, [company.subscription_status, company.subscription_expires_at]);

  // Cotas operacionais baseadas no plano
  const maxTechnicians = React.useMemo(() => {
    const plan = company.subscription_plan || 'basico';
    if (plan === 'premium') return 20;
    if (plan === 'profissional') return 6;
    return 2; // Básico
  }, [company.subscription_plan]);

  const maxStorageBytes = React.useMemo(() => {
    const plan = company.subscription_plan || 'basico';
    if (plan === 'premium') return 21474836480n; // 20 GB
    if (plan === 'profissional') return 5368709120n; // 5 GB
    return 1073741824n; // 1 GB
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
