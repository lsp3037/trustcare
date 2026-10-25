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
      
      // 1. Busca usuário do Supabase Auth
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
          .maybeSingle();

        let userProfile = profile;
        if (!userProfile) {
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
                if (json.profile) {
                  userProfile = json.profile;
                }
              }
            }
          } catch (e) {
            console.warn('[UserContext] Falha ao recuperar perfil via ensure:', e);
          }
        }

        if (userProfile) {
          setUser({
            id: userProfile.id,
            user_id: userProfile.user_id,
            role: (userProfile.role || 'viewer') as UserRole,
            full_name: userProfile.full_name || authUser.user_metadata?.full_name || 'Usuário',
            email: userProfile.email || authUser.email || '',
            whatsapp: userProfile.whatsapp || '',
            avatar_url: userProfile.avatar_url || ''
          });
        } else {
          // Sem perfil cadastrado na empresa = sem acesso (F-29)
          console.warn('[UserContext] Usuário autenticado sem perfil vinculado a empresa.');
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
