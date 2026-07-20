import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Validador simples de UUID para segurança
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const { searchId, subdomain } = await req.json();
    const cleanId = searchId.trim().replace(/^#/, '');

    if (!cleanId || cleanId.length < 8) {
      return NextResponse.json({ error: 'Código de OS inválido.' }, { status: 400 });
    }

    // 1. Buscar a ordem de serviço e os dados do cliente
    let query = supabaseAdmin
      .from('service_orders')
      .select('id, codigo_os, company_id, clients(name, email)')
      .or(`codigo_os.eq.${cleanId},id.eq.${cleanId}`);

    // Se o UUID for de 8 caracteres, tentamos buscar por correspondência parcial
    if (cleanId.length >= 8 && cleanId.length < 36 && !UUID_REGEX.test(cleanId)) {
      query = supabaseAdmin
        .from('service_orders')
        .select('id, codigo_os, company_id, clients(name, email)')
        .or(`codigo_os.ilike.%${cleanId}%,id.cast.ilike.%${cleanId}%`);
    }

    const { data: orders, error: dbError } = await query;

    if (dbError || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
    }

    // Usar o primeiro resultado encontrado
    const order = orders[0];
    const client = order.clients as any;

    if (!client || !client.email) {
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
