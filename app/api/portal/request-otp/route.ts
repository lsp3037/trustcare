import { randomInt, createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cleanDocument } from '@/lib/utils/documentValidation';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    const clientIp = realIp || cfIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    // 1. Rate limit por IP (fail-closed)
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: '/api/portal/request-otp',
    });
    if (rateLimitError || allowed !== true) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const rawDocument = typeof body?.document === 'string' ? body.document.trim() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Informe um endereço de e-mail válido.' }, { status: 400 });
    }

    // 2. Verificar se existe cliente com este e-mail
    let query = supabaseAdmin
      .from('clients')
      .select('id, name, email, document')
      .ilike('email', email)
      .limit(5);

    const { data: clients, error: clientErr } = await query;

    if (clientErr || !clients || clients.length === 0) {
      return NextResponse.json({ error: 'Nenhum cadastro de cliente encontrado com este e-mail.' }, { status: 404 });
    }

    // Se documento foi informado, valida correspondência
    if (rawDocument) {
      const docClean = cleanDocument(rawDocument);
      const matchesDoc = clients.some(c => cleanDocument(c.document || '') === docClean);
      if (!matchesDoc) {
        return NextResponse.json({ error: 'O documento informado não confere com o e-mail cadastrado.' }, { status: 400 });
      }
    }

    const client = clients[0];

    // 3. Rate limit por e-mail: máximo 3 solicitações em 15 minutos
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentTokensCount } = await supabaseAdmin
      .from('portal_verifications')
      .select('id', { count: 'exact', head: true })
      .ilike('email', email)
      .gte('created_at', fifteenMinutesAgo);

    if ((recentTokensCount || 0) >= 3) {
      return NextResponse.json({
        error: 'Limite de solicitações de código para este e-mail atingido. Aguarde alguns minutos antes de tentar novamente.'
      }, { status: 429 });
    }

    // 4. Invalidar tokens anteriores não consumidos deste e-mail
    await supabaseAdmin
      .from('portal_verifications')
      .update({ used: true })
      .ilike('email', email)
      .eq('used', false);

    // 5. Gerar código criptográfico e armazenar apenas o HASH SHA-256
    const code = randomInt(100000, 1000000).toString();
    const tempTokenId = randomUUID();
    const codeHash = createHash('sha256').update(`${tempTokenId}:${code}`).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos
    const isDev = process.env.NODE_ENV === 'development';

    const { error: insertError } = await supabaseAdmin
      .from('portal_verifications')
      .insert({
        id: tempTokenId,
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
        used: false,
        attempts: 0,
      });

    if (insertError) {
      console.error('[Portal Request OTP] Erro ao salvar token:', insertError);
      return NextResponse.json({ error: 'Erro ao gerar código de acesso.' }, { status: 500 });
    }

    // 6. Enviar e-mail via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
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
            to: email,
            subject: 'Código de Acesso ao Portal do Cliente',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; margin-top: 0;">Olá, ${escapeHtml(client.name || 'Cliente')}!</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                  Você solicitou acesso ao Portal do Cliente para acompanhar suas Ordens de Serviço.
                  Para autenticar sua sessão com segurança, utilize o código de verificação abaixo:
                </p>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #10b981; border-radius: 6px; margin: 20px 0;">
                  ${code}
                </div>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
                  Este código é confidencial e expira em 15 minutos. Se você não solicitou este acesso, desconsidere este e-mail.
                </p>
              </div>
            `
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[Portal Request OTP] Falha Resend:', errData);
        }
      } catch (emailErr) {
        console.error('[Portal Request OTP] Erro no envio de e-mail:', emailErr);
      }
    } else if (!isDev) {
      await supabaseAdmin.from('portal_verifications').delete().eq('id', tempTokenId);
      return NextResponse.json({ error: 'Serviço de envio de código indisponível no momento.' }, { status: 503 });
    } else {
      console.log(`[DEV MODE] Código de Acesso do Portal para ${email}: ${code}`);
    }

    const responsePayload: any = {
      success: true,
      maskedEmail: maskEmail(email),
      tempTokenId,
    };

    if (!resendApiKey && isDev) {
      responsePayload.devToken = code;
    }

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('[Portal Request OTP] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao processar a solicitação.' }, { status: 500 });
  }
}
