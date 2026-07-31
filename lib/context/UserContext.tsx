'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

export type UserRole = 'admin' | 'technician' | 'viewer';

interface UserProfile {
  id?: string;
  user_id?: string;
  role: UserRole;
  full_name: string;
  email: string;
  whatsapp?: string;
  avatar_url?: string;
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
  const userRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchUserData = async (sessionUser?: any, forceLoading = false) => {
    try {
      if (!userRef.current || forceLoading) {
        setLoading(true);
      }
      
      let authUser = sessionUser;
      if (!authUser) {
        const { data } = await supabase.auth.getUser();
        authUser = data?.user;
      }

      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_id, role, full_name, email, whatsapp, avatar_url')
          .eq('user_id', authUser.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            user_id: profile.user_id,
            role: (profile.role || 'admin') as UserRole,
            full_name: profile.full_name || authUser.user_metadata?.full_name || 'Usuário',
            email: profile.email || authUser.email || '',
            whatsapp: profile.whatsapp || '',
            avatar_url: profile.avatar_url || ''
          });
        } else {
          // Sessão válida sem profile = cliente do Portal ou conta órfã.
          // Nunca assumir 'admin' aqui: o papel vem do banco ou não vem.
          setUser(null);
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
