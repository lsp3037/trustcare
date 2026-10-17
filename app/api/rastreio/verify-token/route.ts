import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MAX_ATTEMPTS = 5;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const tempTokenId = typeof body?.tempTokenId === 'string' ? body.tempTokenId.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!UUID_REGEX.test(tempTokenId) || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // 0. Throttle por IP (fail-closed)
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    const clientIp = realIp || cfIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: '/api/rastreio/verify-token',
    });
    if (rateLimitError || allowed !== true) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }, { status: 429 });
    }

    // 1. Calcular o hash seguro esperado do token
    const codeHash = createHash('sha256').update(`${tempTokenId}:${code}`).digest('hex');

    // 2. Chamar RPC atômica que incrementa tentativas e consome token
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('verify_tracking_otp', {
      p_verification_id: tempTokenId,
      p_code_hash: codeHash,
      p_max_attempts: MAX_ATTEMPTS,
    });

    if (rpcError || !result) {
      console.error('[Verify Token] Erro na RPC verify_tracking_otp:', rpcError);
      return NextResponse.json({ error: 'Erro ao validar o código.' }, { status: 500 });
    }

    if (!result.valid) {
      if (result.reason === 'MAX_ATTEMPTS_EXCEEDED') {
        return NextResponse.json({ 
          error: 'Número máximo de tentativas excedido. Solicite um novo código.' 
        }, { status: 429 });
      }
      if (result.reason === 'EXPIRED') {
        return NextResponse.json({ 
          error: 'O código de verificação expirou. Solicite um novo.' 
        }, { status: 400 });
      }
      if (result.reason === 'INVALID_CODE') {
        return NextResponse.json({ 
          error: `Código de verificação incorreto. Tentativas restantes: ${result.remaining_attempts}.` 
        }, { status: 400 });
      }
      return NextResponse.json({ 
        error: 'Código de verificação incorreto ou inválido.' 
      }, { status: 400 });
    }

    // 3. Buscar os detalhes da Ordem de Serviço
    const { data: order, error: orderError } = await supabaseAdmin
      .from('service_orders')
      .select(`
        id,
        status,
        reported_problem,
        technical_report,
        created_at,
        delivery_prediction,
        codigo_os,
        media,
        client_equipments (
          name,
          brand,
          model,
          serial_number
        )
      `)
      .eq('id', result.os_id)
      .is('deleted_at', null)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Não foi possível encontrar a ordem de serviço.' }, { status: 404 });
    }

    // 4. Formata o retorno para a tela de rastreio
    const clientEquip = order.client_equipments as any;
    const formattedOrder = {
      id: order.id,
      status: order.status,
      equipment_name: clientEquip?.name || 'Aparelho',
      equipment_brand: clientEquip?.brand || '',
      equipment_model: clientEquip?.model || '',
      reported_problem: order.reported_problem,
      technical_report: order.technical_report,
      created_at: order.created_at,
      delivery_prediction: order.delivery_prediction,
      codigo_os: order.codigo_os,
      media: order.media
    };

    return NextResponse.json({ success: true, order: formattedOrder });
  } catch (err: any) {
    console.error('[Verify Token] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao validar o código.' }, { status: 500 });
  }
}
