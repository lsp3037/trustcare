import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const PLAN_VALUES: Record<string, number> = {
  starter: 79.0,
  pro: 149.0,
  premium: 299.0,
};

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const planId = body?.planId;

    if (!['starter', 'pro', 'premium'].includes(planId)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Busca o perfil do usuário para validar permissão de admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin' || !profile.company_id) {
      return NextResponse.json({ error: 'Apenas administradores podem alterar a assinatura' }, { status: 403 });
    }

    const companyId = profile.company_id;
    const asaasApiKey = process.env.ASAAS_API_KEY;

    // MODO SIMULAÇÃO (F-03) — só permitido expressamente fora de produção com flag ativa
    if (!asaasApiKey) {
      const simulationAllowed =
        process.env.NODE_ENV !== 'production' && process.env.ENABLE_BILLING_SIMULATION === '1';

      if (!simulationAllowed) {
        console.error('[Checkout] ASAAS_API_KEY ausente e simulação desabilitada.');
        return NextResponse.json({ error: 'Cobrança indisponível no momento.' }, { status: 503 });
      }

      console.log(`[Checkout Simulado] Assinatura simulada para empresa ${companyId}, plano ${planId}`);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: simError } = await supabaseAdmin
        .from('companies')
        .update({
          subscription_plan: planId,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', companyId);

      if (simError) {
        console.error('[Checkout Simulado] Erro ao atualizar empresa:', simError.message);
        return NextResponse.json({ error: 'Erro ao processar assinatura simulada.' }, { status: 500 });
      }

      return NextResponse.json({
        url: '/dashboard/settings/billing?checkout_success=true',
      });
    }

    // MODO PRODUÇÃO / SANDBOX COM ASAAS REAL
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, email, phone, whatsapp, document, asaas_customer_id, asaas_subscription_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const asaasBaseUrl =
      process.env.ASAAS_BASE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://sandbox.asaas.com/v3');

    const headers = {
      access_token: asaasApiKey,
      'Content-Type': 'application/json',
    };

    // 1. Obter ou criar cliente no Asaas
    let customerId = company.asaas_customer_id;

    if (!customerId) {
      const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: company.name || 'Cliente TrustCare',
          email: company.email || undefined,
          phone: company.phone || company.whatsapp || undefined,
          cpfCnpj: company.document || undefined,
          externalReference: companyId,
        }),
      });

      const customerData = await customerRes.json().catch(() => ({}));
      if (!customerRes.ok) {
        console.error('[Checkout Asaas] Erro ao criar customer:', customerData);
        const desc = customerData.errors?.[0]?.description || 'Erro ao registrar cliente no gateway de pagamento.';
        return NextResponse.json({ error: desc }, { status: 400 });
      }

      customerId = customerData.id;
      await supabaseAdmin.from('companies').update({ asaas_customer_id: customerId }).eq('id', companyId);
    }

    // 2. Criar Assinatura no Asaas
    const planValue = PLAN_VALUES[planId] || 79.0;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const subRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        value: planValue,
        nextDueDate: tomorrow,
        cycle: 'MONTHLY',
        description: `Assinatura TrustCare - Plano ${planId.toUpperCase()}`,
        externalReference: `${companyId}:${planId}`,
      }),
    });

    const subData = await subRes.json().catch(() => ({}));
    if (!subRes.ok) {
      console.error('[Checkout Asaas] Erro ao criar subscription:', subData);
      const desc = subData.errors?.[0]?.description || 'Erro ao gerar assinatura no gateway de pagamento.';
      return NextResponse.json({ error: desc }, { status: 400 });
    }

    const subscriptionId = subData.id;
    await supabaseAdmin.from('companies').update({ asaas_subscription_id: subscriptionId }).eq('id', companyId);

    // 3. Obtém fatura inicial para redirecionamento
    let invoiceUrl = subData.paymentLink;

    if (!invoiceUrl) {
      const paymentsRes = await fetch(`${asaasBaseUrl}/subscriptions/${subscriptionId}/payments`, {
        headers: { access_token: asaasApiKey },
      });
      const paymentsData = await paymentsRes.json().catch(() => ({}));
      invoiceUrl = paymentsData.data?.[0]?.invoiceUrl || '/dashboard/settings/billing?checkout_success=true';
    }

    return NextResponse.json({ url: invoiceUrl });
  } catch (err: any) {
    console.error('[Checkout API Error]', err);
    return NextResponse.json({ error: 'Erro interno ao processar pagamento.' }, { status: 500 });
  }
}
