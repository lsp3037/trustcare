import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { tempTokenId, code } = await req.json();

    if (!tempTokenId || !code) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // 0. Throttle por IP para dificultar automação/força bruta distribuída
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const { data: allowed } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: '/api/rastreio/verify-token',
    });
    if (allowed === false) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }, { status: 429 });
    }

    // 1. Buscar o registro do token (sem filtrar pelo código, para poder
    // controlar o número de tentativas mesmo quando o código está errado)
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('os_verifications')
      .select('*')
      .eq('id', tempTokenId)
      .single();

    if (verifyError || !verification) {
      return NextResponse.json({ error: 'Código de verificação incorreto ou inválido.' }, { status: 400 });
    }

    // 2. Verificar se o token expirou
    const now = new Date();
    const expiresAt = new Date(verification.expires_at);
    if (now > expiresAt) {
      // Deletar o token expirado para limpeza
      await supabaseAdmin.from('os_verifications').delete().eq('id', tempTokenId);
      return NextResponse.json({ error: 'O código de verificação expirou. Solicite um novo.' }, { status: 400 });
    }

    // 2b. Bloquear após muitas tentativas incorretas (proteção contra força bruta do código de 6 dígitos)
    if (verification.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin.from('os_verifications').delete().eq('id', tempTokenId);
      return NextResponse.json({ error: 'Número máximo de tentativas excedido. Solicite um novo código.' }, { status: 429 });
    }

    if (verification.code !== code.trim()) {
      await supabaseAdmin
        .from('os_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', tempTokenId);
      return NextResponse.json({ error: 'Código de verificação incorreto ou inválido.' }, { status: 400 });
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
      .eq('id', verification.os_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Não foi possível encontrar a ordem de serviço.' }, { status: 404 });
    }

    // 4. Limpar o token utilizado
    await supabaseAdmin.from('os_verifications').delete().eq('id', tempTokenId);

    // Formata o retorno para corresponder ao que a tela de rastreio espera
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
