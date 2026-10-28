import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Validação segura em tempo constante do token do cron (fail-closed).
 */
function verifyCronSecret(authHeader: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;

  const expected = `Bearer ${cronSecret}`;
  const headerBuffer = Buffer.from(authHeader);
  const expectedBuffer = Buffer.from(expected);

  if (headerBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
}

/**
 * GET /api/cron/expire-trials
 * Job periódico para expirar trials vencidos automaticamente (F-08 / Security Audit).
 * Autenticado obrigatoriamente via cabeçalho Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');

    // Validação fail-closed: exige CRON_SECRET configurada e token idêntico em tempo constante
    if (!verifyCronSecret(authHeader)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: expiredCount, error } = await supabaseAdmin.rpc('expire_overdue_trials');

    if (error) {
      console.error('[Cron Expire Trials] Erro ao executar RPC:', error.message);
      return NextResponse.json({ error: 'Falha ao processar expiração de trials.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expired: expiredCount ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Cron Expire Trials] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
