import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

function maskEmail(email: string): string {
  if (!email) return 'E-mail não cadastrado';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.substring(0, 2)}***${local.substring(local.length - 2)}@${domain}`;
}

export async function POST(req: Request) {
  try {
    // Throttle por IP para dificultar automação/spam de e-mails de código
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const { data: allowed } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: '/api/rastreio/request-token',
    });
    if (allowed === false) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }, { status: 429 });
    }

    const { searchId, subdomain } = await req.json();
    const cleanId = String(searchId ?? '').trim().replace(/^#/, '');

    if (!cleanId || cleanId.length < 8 || cleanId.length > 40) {
      return NextResponse.json({ error: 'Código de OS inválido.' }, { status: 400 });
    }

    // A busca roda numa RPC (find_orders_for_tracking) em vez de montar o
    // filtro do PostgREST concatenando o texto digitado pelo usuário.
    const { data: orders, error: dbError } = await supabaseAdmin.rpc(
      'find_orders_for_tracking',
      { p_query: cleanId, p_subdomain: subdomain || null }
    );

    if (dbError) {
      console.error('[Request Token] Erro na busca:', dbError.message);
      return NextResponse.json({ error: 'Erro ao localizar a ordem de serviço.' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
    }

    // Cada empresa tem sua própria numeração, então 'TC-2026-0001' pode existir
    // em mais de um tenant. Mandar o código para orders[0] entregaria o OTP ao
    // cliente errado — melhor pedir o link da assistência.
    if (orders.length > 1) {
      return NextResponse.json(
        {
          error:
            'Esse código existe em mais de uma assistência. Acesse pelo link ' +
            'enviado pela empresa (ex: suaempresa.trustcare.com.br) ou informe ' +
            'o número completo da OS.',
        },
        { status: 409 }
      );
    }

    const order = orders[0];
    const client = { name: order.client_name, email: order.client_email };

    if (!client.email) {
      return NextResponse.json({ 
        error: 'Esta Ordem de Serviço não possui um e-mail de cliente associado. Entre em contato com o suporte.' 
      }, { status: 400 });
    }

    // 2. Gerar o token de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

    // 3. Salvar o token na tabela os_verifications
    const { data: verification, error: insertError } = await supabaseAdmin
      .from('os_verifications')
      .insert({
        os_id: order.id,
        code,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Request Token] Erro ao salvar token no banco:', insertError);
      return NextResponse.json({ error: 'Erro ao gerar código de verificação.' }, { status: 500 });
    }

    const maskedEmail = maskEmail(client.email);

    // 4. Enviar o e-mail via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;

    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Trust Care <noreply@trustcare.com.br>',
            to: client.email,
            subject: `Código de Acesso - OS ${order.codigo_os || order.id.slice(0, 8)}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; margin-top: 0;">Olá, ${client.name}!</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                  Você solicitou o rastreamento da sua Ordem de Serviço <strong>${order.codigo_os || order.id.slice(0, 8)}</strong>.
                  Para prosseguir com segurança, utilize o código de verificação abaixo:
                </p>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1d4ed8; border-radius: 6px; margin: 20px 0;">
                  ${code}
                </div>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
                  Este código expira em 15 minutos. Se você não solicitou este código, por favor desconsidere este e-mail.
                </p>
              </div>
            `
          })
        });

        if (res.ok) {
          emailSent = true;
        } else {
          const errData = await res.json();
          console.error('[Request Token] Erro da API do Resend:', errData);
        }
      } catch (emailErr) {
        console.error('[Request Token] Falha ao disparar e-mail:', emailErr);
      }
    } else {
      console.log(`\n======================================================`);
      console.log(`[DEV MODE] Token para OS ${order.codigo_os || order.id.slice(0, 8)} (${client.email}): ${code}`);
      console.log(`======================================================\n`);
    }

    // Retorna resposta para o frontend
    const responsePayload: any = {
      success: true,
      maskedEmail,
      tempTokenId: verification.id
    };

    // Facilita desenvolvimento local sem chaves API configuradas
    if (!resendApiKey) {
      responsePayload.devToken = code;
    }

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('[Request Token] Erro interno:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
