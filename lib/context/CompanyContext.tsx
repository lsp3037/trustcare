'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Company {
  id?: string;
  name: string;
  phone: string;
  email: string;
  logo_url: string;
}

interface CompanyContextType {
  company: Company;
  loading: boolean;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company>({
    name: 'Trust Care T.I.',
    phone: '(66) 99999-9999',
    email: 'contato@trustcare.com.br',
    logo_url: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
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
          logo_url: data.logo_url || ''
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
          logo_url: ''
        };
        localStorage.setItem('mock-company-settings', JSON.stringify(defaultCompany));
        setCompany(defaultCompany);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só faz o fetch se houver um usuário logado
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
    };

    checkUser();

    // Escuta alterações de login/logout para recarregar dados
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchCompanyData();
      } else {
        // Limpa se deslogar
        setCompany({
          name: 'Trust Care T.I.',
          phone: '(66) 99999-9999',
          email: 'contato@trustcare.com.br',
          logo_url: ''
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <CompanyContext.Provider value={{ company, loading, refreshCompany: fetchCompanyData }}>
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
