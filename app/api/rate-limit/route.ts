import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * Rate Limit API — usada pelas rotas públicas (/rastreio, /orcamento)
 * Chama a RPC do Supabase que:
 *   1. Limpa hits com mais de 1 minuto
 *   2. Insere o hit atual
 *   3. Retorna false se o IP fez mais de 30 requisições no último minuto
 */
export async function POST(req: Request) {
  try {
    const { path } = await req.json();

    // Extrai o IP real do cliente
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const { data, error } = await supabase.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: path ?? '/',
    });

    if (error) {
      // Em caso de erro de DB (ex: tabela não existe ainda), deixa passar
      console.warn('[RateLimit] Erro na RPC:', error.message);
      return NextResponse.json({ allowed: true });
    }

    if (data === false) {
      return NextResponse.json(
        { allowed: false, message: 'Muitas requisições. Tente novamente em instantes.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ allowed: true });
  } catch (err: any) {
    console.error('[RateLimit] Erro interno:', err.message);
    // Fail-open: em caso de falha inesperada, não bloqueia o usuário
    return NextResponse.json({ allowed: true });
  }
}
