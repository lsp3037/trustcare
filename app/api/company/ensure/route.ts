import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function getAuthUser(request: Request) {
  // 1. Tenta Bearer token do header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) return user;
    } catch (err) {
      console.warn('[company/ensure] Erro ao validar token Bearer:', err);
    }
  }

  // 2. Tenta cookies da sessão SSR
  try {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (err) {
    console.warn('[company/ensure] Erro ao ler cookies de auth:', err);
  }

  return null;
}

/**
 * POST /api/company/ensure
 * Garante que o usuário autenticado possua uma empresa e um perfil admin vinculados.
 * Se já possuir, devolve os dados atuais. Se não possuir (comum em dev/localhost),
 * cria a empresa e o perfil com segurança usando supabaseAdmin.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY ausente no ambiente do servidor (.env.local).' },
        { status: 500 }
      );
    }

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body é opcional
    }

    // 1. Verifica se já existe perfil para este usuário
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, company_id, role, full_name, email, phone')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Se já tiver profile com company_id, busca a empresa
    if (profile?.company_id) {
      let company: any = null;
      const { data: cData, error: compErr } = await supabaseAdmin
        .from('companies')
        .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, trial_ends_at, subdomain')
        .eq('id', profile.company_id)
        .maybeSingle();

      company = cData;

      if (compErr && compErr.message?.includes('trial_ends_at')) {
        const fallback = await supabaseAdmin
          .from('companies')
          .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, subdomain')
          .eq('id', profile.company_id)
          .maybeSingle();
        company = fallback.data;
      }

      if (company) {
        return NextResponse.json({ company, profile });
      }
    }

    // 3. Usuário autenticado sem empresa/perfil -> provisiona nova empresa e perfil admin
    const companyName = body.name?.trim() || user.user_metadata?.company_name || 'Minha Empresa';
    const trialDays = 14;
    const expiry = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const newCompanyPayload: any = {
      name: companyName,
      phone: body.phone?.trim() || user.user_metadata?.phone || '',
      email: body.email?.trim() || user.email || '',
      whatsapp: body.whatsapp?.trim() || user.user_metadata?.whatsapp || '',
      subscription_status: 'trialing',
      subscription_plan: 'starter',
      subscription_expires_at: expiry,
      trial_ends_at: expiry,
    };

    let newCompany: any = null;
    const { data: initialNewCompany, error: insertCompErr } = await supabaseAdmin
      .from('companies')
      .insert(newCompanyPayload)
      .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, trial_ends_at, subdomain')
      .single();

    newCompany = initialNewCompany;

    if (insertCompErr) {
      // Se der erro por trial_ends_at n�o existir no schema do banco ainda
      delete newCompanyPayload.trial_ends_at;
      const retryInsert = await supabaseAdmin
        .from('companies')
        .insert(newCompanyPayload)
        .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, subdomain')
        .single();

      if (retryInsert.error) {
        console.error('[company/ensure] Erro ao criar empresa:', retryInsert.error);
        return NextResponse.json({ error: retryInsert.error.message }, { status: 500 });
      }
      newCompany = retryInsert.data;
    }

    if (!newCompany?.id) {
      return NextResponse.json({ error: 'Falha ao instanciar empresa para o usu�rio.' }, { status: 500 });
    }

    // 4. Cria ou atualiza o perfil do usuário vinculado à nova empresa como admin
    const profilePayload = {
      user_id: user.id,
      company_id: newCompany.id,
      role: profile?.role || 'admin',
      full_name: user.user_metadata?.full_name || body.name || user.email?.split('@')[0] || 'Administrador',
      email: user.email,
      phone: body.phone?.trim() || user.user_metadata?.phone || null,
    };

    const { data: newProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'user_id' })
      .select('id, user_id, company_id, role, full_name, email, phone')
      .single();

    if (profileErr) {
      console.error('[company/ensure] Erro ao criar perfil:', profileErr);
    }

    return NextResponse.json({
      company: newCompany,
      profile: newProfile || profilePayload
    });
  } catch (err) {
    const error = err as Error;
    console.error('[company/ensure] Erro inesperado:', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

/**
 * PATCH /api/company/ensure
 * Atualiza os dados da empresa do administrador autenticado como fallback para o cliente.
 */
export async function PATCH(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY ausente no ambiente do servidor (.env.local).' },
        { status: 500 }
      );
    }

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await request.json();

    // 1. Obtém perfil do usuário para validar se é admin e de qual empresa
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile || !profile.company_id || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores da empresa.' }, { status: 403 });
    }

    // 2. Filtra estritamente as colunas permitidas
    const allowedUpdate: Record<string, string> = {};
    if (typeof body.name === 'string') allowedUpdate.name = body.name.trim();
    if (typeof body.phone === 'string') allowedUpdate.phone = body.phone.trim();
    if (typeof body.email === 'string') allowedUpdate.email = body.email.trim();
    if (typeof body.whatsapp === 'string') allowedUpdate.whatsapp = body.whatsapp.trim();
    if (typeof body.logo_url === 'string') allowedUpdate.logo_url = body.logo_url.trim();

    const { data: updatedCompany, error: updateErr } = await supabaseAdmin
      .from('companies')
      .update(allowedUpdate)
      .eq('id', profile.company_id)
      .select('id, name, phone, email, logo_url, whatsapp, subscription_plan, subscription_status, subscription_expires_at, subdomain')
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, company: updatedCompany });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
