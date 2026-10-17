import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateApiKey } from '@/lib/services/apiKey';

async function getAdminUser() {
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
    .select('company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin' || !profile.company_id) {
    return null;
  }

  return { user, profile };
}

/**
 * GET /api/settings/api-keys
 * Lista as chaves de API da empresa (apenas para admins).
 */
export async function GET() {
  try {
    const authData = await getAdminUser();
    if (!authData) {
      return NextResponse.json({ error: 'Não autorizado. Acesso restrito a administradores.' }, { status: 403 });
    }

    const { data: keys, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, prefix, scopes, created_at, last_used_at, revoked_at')
      .eq('company_id', authData.profile.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[API Keys] Erro ao listar chaves:', error.message);
      return NextResponse.json({ error: 'Erro ao buscar chaves de API.' }, { status: 500 });
    }

    return NextResponse.json({ keys: keys || [] });
  } catch (err: any) {
    console.error('[API Keys] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * POST /api/settings/api-keys
 * Gera uma nova chave de API para a empresa.
 * A chave em texto puro é retornada apenas uma única vez nesta resposta.
 */
export async function POST(req: Request) {
  try {
    const authData = await getAdminUser();
    if (!authData) {
      return NextResponse.json({ error: 'Não autorizado. Acesso restrito a administradores.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim().substring(0, 100) : 'Chave de API';
    const scopes = Array.isArray(body?.scopes) && body.scopes.length > 0 ? body.scopes : ['orders:read', 'orders:write'];

    const newKey = generateApiKey();

    const { data: inserted, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        company_id: authData.profile.company_id,
        name,
        key_hash: newKey.keyHash,
        prefix: newKey.prefix,
        scopes,
        created_by: authData.user.id,
      })
      .select('id, name, prefix, scopes, created_at')
      .single();

    if (error) {
      console.warn('[API Keys] Erro ao criar chave:', error.message);
      return NextResponse.json({ error: 'Erro ao registrar chave de API.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        key: inserted,
        rawKey: newKey.rawKey, // Exibida apenas uma vez
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API Keys] Erro interno ao criar chave:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
