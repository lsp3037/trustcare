'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export type UserRole = 'admin' | 'technician' | 'viewer';

interface UserProfile {
  id?: string;
  user_id?: string;
  role: UserRole;
  full_name: string;
  email: string;
}

interface UserContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (sessionUser?: any, forceLoading = false) => {
    try {
      if (!user || forceLoading) {
        setLoading(true);
      }
      
      // 1. Tenta pegar sessão local/mock
      const mockSession = localStorage.getItem('os-session');
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        const rawRole = parsed.role || 'admin';
        // Normaliza roles mockadas para os valores do Supabase
        const normalizedRole: UserRole = 
          rawRole === 'tecnico' ? 'technician' : 
          rawRole === 'recepcionista' ? 'viewer' : 
          rawRole as UserRole;

        const mockProfile: UserProfile = {
          role: normalizedRole,
          full_name: parsed.email ? parsed.email.split('@')[0] : 'Usuário Mock',
          email: parsed.email || 'mock@trustcare.com.br'
        };
        setUser(mockProfile);
        setLoading(false);
        return;
      }

      // 2. Tenta do Supabase Auth
      let authUser = sessionUser;
      if (!authUser) {
        const { data } = await supabase.auth.getUser();
        authUser = data?.user;
      }

      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, role, full_name, email')
          .eq('user_id', authUser.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            user_id: profile.user_id,
            role: (profile.role || 'admin') as UserRole,
            full_name: profile.full_name || authUser.user_metadata?.full_name || 'Usuário',
            email: profile.email || authUser.email || ''
          });
        } else {
          // Fallback se não houver profile mas houver usuário
          setUser({
            id: authUser.id,
            user_id: authUser.id,
            role: 'admin',
            full_name: authUser.user_metadata?.full_name || 'Usuário',
            email: authUser.email || ''
          });
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do usuário:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Escuta alterações de autenticação (dispara INITIAL_SESSION imediatamente)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          await fetchUserData(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: UserContextType = {
    user,
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    loading,
    refreshUser: () => fetchUserData(undefined, true)
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
}
