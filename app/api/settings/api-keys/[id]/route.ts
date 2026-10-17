import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * DELETE /api/settings/api-keys/[id]
 * Revoga uma chave de API (soft-delete registrando revoked_at).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authData = await getAdminUser();
    if (!authData) {
      return NextResponse.json({ error: 'Não autorizado. Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'ID de chave inválido.' }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', authData.profile.company_id)
      .select('id, name, revoked_at')
      .maybeSingle();

    if (error) {
      console.warn('[API Keys] Erro ao revogar chave:', error.message);
      return NextResponse.json({ error: 'Erro ao revogar chave de API.' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Chave não encontrada ou já excluída.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, key: updated });
  } catch (err: any) {
    console.error('[API Keys] Erro interno ao revogar chave:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
