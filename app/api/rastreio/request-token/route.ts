import { randomInt, createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Formatos aceitos para o código digitado. Qualquer outra coisa é rejeitada
// antes de chegar ao PostgREST — o valor nunca é interpolado em filtros.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO_OS_REGEX = /^[A-Z0-9]{2,6}-\d{4}-\d{4,}$/i;
const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

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
    // Throttle por IP (fail-closed)
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    const clientIp = realIp || cfIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: '/api/rastreio/request-token',
    });
    if (rateLimitError || allowed !== true) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um instante e tente novamente.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const cleanId = typeof body?.searchId === 'string' ? body.searchId.trim().replace(/^#/, '') : '';
    
    // Subdomínio com prioridade para o cabeçalho seguro do servidor (sanitizado no proxy.ts)
    const headerSubdomain = req.headers.get('x-tenant-subdomain');
    const bodySubdomain = typeof body?.subdomain === 'string' ? body.subdomain.trim().toLowerCase() : '';
    const subdomain = (headerSubdomain || bodySubdomain).trim().toLowerCase();

    const isFullUuid = UUID_REGEX.test(cleanId);
    const isCodigoOs = CODIGO_OS_REGEX.test(cleanId);

    if (!isFullUuid && !isCodigoOs) {
      return NextResponse.json({ error: 'Código de OS inválido. Informe o código completo ou UUID.' }, { status: 400 });
    }

    // 1. Buscar a ordem de serviço e os dados do cliente
    let query = supabaseAdmin
      .from('service_orders')
      .select('id, codigo_os, company_id, clients(name, email)')
      .is('deleted_at', null)
      .limit(2);

    if (isFullUuid) {
      query = query.eq('id', cleanId.toLowerCase());
    } else {
      query = query.eq('codigo_os', cleanId.toUpperCase());
    }

    // Restringir busca ao tenant quando em subdomínio
    if (subdomain) {
      if (!SUBDOMAIN_REGEX.test(subdomain)) {
        return NextResponse.json({ error: 'Subdomínio inválido.' }, { status: 400 });
      }
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle();

      if (!company) {
        return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
      }
      query = query.eq('company_id', company.id);
    }

    const { data: orders, error: dbError } = await query;

    if (dbError || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
    }

    // Mais de uma OS com o mesmo código (empresas diferentes em busca raiz)
    if (orders.length > 1) {
      return NextResponse.json({
        error: 'Código ambíguo entre assistências. Acesse pelo link com subdomínio ou informe a identificação completa.',
      }, { status: 409 });
    }

    const order = orders[0];
    const client = order.clients as any;

    if (!client || !client.email) {
      return NextResponse.json({ 
        error: 'Esta Ordem de Serviço não possui um e-mail de cliente associado. Entre em contato com o suporte.' 
      }, { status: 400 });
    }

    // 2. Limite de solicitações de tokens por OS (máximo de 3 nos últimos 15 min para evitar spam/enumeração)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentTokensCount } = await supabaseAdmin
      .from('os_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('os_id', order.id)
      .gte('created_at', fifteenMinutesAgo);

    if ((recentTokensCount || 0) >= 3) {
      return NextResponse.json({
        error: 'Limite de solicitações de código para esta OS atingido. Aguarde alguns minutos antes de tentar novamente.'
      }, { status: 429 });
    }

    // 3. Invalidar tokens anteriores não consumidos da mesma OS
    await supabaseAdmin
      .from('os_verifications')
      .update({ used: true })
      .eq('os_id', order.id)
      .eq('used', false);

    // 4. Gerar código criptográfico de 6 dígitos e armazenar apenas o HASH SHA-256
    const code = randomInt(100000, 1000000).toString();
    const tokenId = randomUUID();
    const codeHash = createHash('sha256').update(`${tokenId}:${code}`).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos
    const isDev = process.env.NODE_ENV === 'development';

    const { error: insertError } = await supabaseAdmin
      .from('os_verifications')
      .insert({
        id: tokenId,
        os_id: order.id,
        code_hash: codeHash,
        expires_at: expiresAt,
        used: false,
        attempts: 0,
        // Em dev registra o código para permitir testes sem e-mail externo, em prod mantém em branco
        ...(isDev ? { code } : {})
      });

    if (insertError) {
      console.error('[Request Token] Erro ao salvar token no banco:', insertError);
      return NextResponse.json({ error: 'Erro ao gerar código de verificação.' }, { status: 500 });
    }

    const maskedEmail = maskEmail(client.email);

    // 5. Enviar o e-mail via Resend
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
            from: process.env.RESEND_FROM_EMAIL || 'Trust Care <onboarding@resend.dev>',
            to: client.email,
            subject: `Código de Acesso - OS ${escapeHtml(order.codigo_os || order.id.slice(0, 8))}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a; margin-top: 0;">Olá, ${escapeHtml(client.name || 'Cliente')}!</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                  Você solicitou o rastreamento da sua Ordem de Serviço <strong>${escapeHtml(order.codigo_os || order.id.slice(0, 8))}</strong>.
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

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[Request Token] Erro da API do Resend:', errData);
        }
      } catch (emailErr) {
        console.error('[Request Token] Falha ao disparar e-mail:', emailErr);
      }
    } else if (!isDev) {
      // Sem provedor de e-mail em produção: nunca prosseguir
      await supabaseAdmin.from('os_verifications').delete().eq('id', tokenId);
      console.error('[Request Token] RESEND_API_KEY ausente em produção.');
      return NextResponse.json({ error: 'Serviço de verificação indisponível no momento.' }, { status: 503 });
    } else {
      console.log(`[DEV MODE] Token para OS ${order.codigo_os || order.id.slice(0, 8)}: ${code}`);
    }

    // Retorna resposta para o frontend
    const responsePayload: any = {
      success: true,
      maskedEmail,
      tempTokenId: tokenId
    };

    // Facilita desenvolvimento local sem chaves API configuradas (nunca em produção)
    if (!resendApiKey && isDev) {
      responsePayload.devToken = code;
    }

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('[Request Token] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao gerar código de verificação.' }, { status: 500 });
  }
}
