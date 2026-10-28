import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { signPortalToken } from '@/lib/utils/portalSession';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    const clientIp = realIp || cfIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    // 0. Rate limit por IP (fail-closed)
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: '/api/portal/verify-otp',
    });
    if (rateLimitError || allowed !== true) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const tempTokenId = typeof body?.tempTokenId === 'string' ? body.tempTokenId.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!UUID_REGEX.test(tempTokenId) || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Parâmetros de autenticação inválidos.' }, { status: 400 });
    }

    // 1. Calcular o hash seguro esperado do token
    const codeHash = createHash('sha256').update(`${tempTokenId}:${code}`).digest('hex');

    // 2. Chamar RPC atômica que incrementa tentativas e consome token
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('verify_portal_otp', {
      p_verification_id: tempTokenId,
      p_code_hash: codeHash,
      p_max_attempts: MAX_ATTEMPTS,
    });

    if (rpcError || !result) {
      console.error('[Portal Verify OTP] Erro na RPC verify_portal_otp:', rpcError);
      return NextResponse.json({ error: 'Erro ao validar o código.' }, { status: 500 });
    }

    if (!result.valid) {
      if (result.reason === 'MAX_ATTEMPTS_EXCEEDED') {
        return NextResponse.json({ 
          error: 'Número máximo de tentativas excedido. Solicite um novo código de acesso.' 
        }, { status: 429 });
      }
      if (result.reason === 'EXPIRED') {
        return NextResponse.json({ 
          error: 'O código de acesso expirou. Solicite um novo.' 
        }, { status: 400 });
      }
      // INVALID_CODE and unknown tokens share one message so decoy tokens from
      // request-otp are indistinguishable from real ones (anti-enumeration).
      return NextResponse.json({ 
        error: 'Código de acesso incorreto ou inválido.' 
      }, { status: 400 });
    }

    // 3. Gerar token de sessão assinado (HMAC-SHA256)
    const sessionToken = signPortalToken(result.email);

    // 4. Montar resposta e gravar cookie httpOnly assinado
    const res = NextResponse.json({
      success: true,
      email: result.email,
    });

    res.cookies.set('portal-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    // Limpar cookies legados mock
    res.cookies.delete('portal-session-mock');
    res.cookies.delete('portal-client-id');

    return res;
  } catch (err: any) {
    console.error('[Portal Verify OTP] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao validar o código.' }, { status: 500 });
  }
}
