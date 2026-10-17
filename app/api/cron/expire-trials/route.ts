import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/cron/expire-trials
 * Job periódico para expirar trials vencidos automaticamente (F-08).
 * Autenticado via cabeçalho Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Se CRON_SECRET estiver configurada em produção, exige validação estrita
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
