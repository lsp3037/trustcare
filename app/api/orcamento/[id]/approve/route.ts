import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SIGNATURE_LENGTH = 280000; // ~200 KB em base64

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Identificador de orçamento inválido.' }, { status: 400 });
    }

    // 1. Capturar IP e User-Agent de forma segura no servidor
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    const clientIp = realIp || cfIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 2. Throttle de aprovação por IP (fail-closed)
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: '/api/orcamento/approve',
    });
    if (rateLimitError || allowed !== true) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const clientName = typeof body?.client_name === 'string' ? body.client_name.trim() : '';
    const signatureBase64 = typeof body?.signature_base64 === 'string' ? body.signature_base64 : '';
    const termsVersion = typeof body?.terms_version === 'string' ? body.terms_version : 'v1';

    if (!clientName || clientName.length < 2) {
      return NextResponse.json({ error: 'Informe seu nome completo por extenso.' }, { status: 400 });
    }

    if (!signatureBase64 || !signatureBase64.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Formato de assinatura inválido (exige imagem PNG).' }, { status: 400 });
    }

    if (signatureBase64.length > MAX_SIGNATURE_LENGTH) {
      return NextResponse.json({ error: 'Assinatura excede o limite máximo permitido de 200 KB.' }, { status: 400 });
    }

    // 3. Executar aprovação atômica no banco de dados com snapshot e hash
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('approve_budget_by_client', {
      p_order_id: id,
      p_client_name: clientName,
      p_signature_base64: signatureBase64,
      p_client_ip: clientIp,
      p_user_agent: userAgent,
      p_terms_version: termsVersion,
    });

    if (rpcError) {
      console.error('[Approve Budget] Erro na RPC approve_budget_by_client:', rpcError);
      return NextResponse.json({ error: 'Erro interno ao processar a aprovação.' }, { status: 500 });
    }

    if (!result || !result.success) {
      return NextResponse.json({ 
        error: result?.error || 'Não foi possível aprovar este orçamento. Verifique se ele ainda está pendente.' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      clientIp,
      approvedTotal: result.approved_total,
      approvalHash: result.approval_hash,
    });
  } catch (err: any) {
    console.error('[Approve Budget] Erro inesperado:', err);
    return NextResponse.json({ error: 'Erro interno ao registrar aprovação.' }, { status: 500 });
  }
}
