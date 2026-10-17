import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Route handler server-side para verificação de rate limit (F-33).
 * Executa em modo fail-closed para rotas críticas e utiliza extração confiável de IP.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPath = typeof body?.path === 'string' ? body.path.trim() : '/';
    // Sanitiza o path para evitar payload bloating
    const path = rawPath.replace(/[^a-zA-Z0-9_\-\/:]/g, '').substring(0, 100) || '/';

    // Extrai o IP real do cliente com suporte a Vercel, Cloudflare e proxies reversos
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = realIp || cfIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    // Executa a RPC segura do Supabase (acessível exclusivamente pelo service role)
    const { data: allowed, error } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: path,
    });

    if (error) {
      console.warn('[RateLimit] Erro na RPC:', error.message);
      // Fail-closed para garantir segurança da aplicação
      return NextResponse.json(
        { allowed: false, message: 'Serviço temporariamente indisponível. Tente novamente em instantes.' },
        { status: 503 }
      );
    }

    if (allowed !== true) {
      return NextResponse.json(
        { allowed: false, message: 'Muitas requisições. Aguarde um minuto e tente novamente.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ allowed: true });
  } catch (err: any) {
    console.error('[RateLimit] Erro interno:', err);
    return NextResponse.json(
      { allowed: false, message: 'Erro ao validar limites de requisição.' },
      { status: 500 }
    );
  }
}
