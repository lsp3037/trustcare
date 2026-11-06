import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthenticatedSession {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    company_id: string;
    role: 'admin' | 'technician' | 'viewer';
    full_name?: string | null;
  };
}

export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || !profile.company_id) {
    return null;
  }

  return {
    user: { id: user.id, email: user.email },
    profile: {
      company_id: profile.company_id,
      role: profile.role as 'admin' | 'technician' | 'viewer',
      full_name: profile.full_name,
    },
  };
}

export async function getAdminSession(): Promise<AuthenticatedSession | null> {
  const session = await getAuthenticatedSession();
  if (!session || session.profile.role !== 'admin') {
    return null;
  }
  return session;
}
