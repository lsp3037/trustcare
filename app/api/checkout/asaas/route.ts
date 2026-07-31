import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlan, isPlanId } from '@/lib/config/plans';
import { cleanDocument, validateDocument } from '@/lib/utils/documentValidation';
import {
  AsaasError,
  cancelSubscription,
  createCustomer,
  createSubscription,
  getCustomer,
  getFirstInvoiceUrl,
  isAsaasConfigured,
  todayInSaoPaulo,
  updateCustomer,
} from '@/lib/services/asaas';

/**
 * POST /api/checkout/asaas
 *
 * Abre (ou troca) a assinatura da empresa do usuário autenticado e devolve a
 * URL da fatura do Asaas.
 *
 * O plano e o preço NUNCA vêm do corpo da requisição: o cliente informa apenas
 * o `planId`, e o valor é resolvido em lib/config/plans.ts no servidor.
 * O `company_id` vem do profile da sessão, nunca do cliente — assim uma empresa
 * não consegue alterar a assinatura de outra.
 *
 * A ativação NÃO acontece aqui. Quem promove a empresa para `active` é o
 * webhook, ao confirmar o pagamento (app/api/webhooks/asaas/route.ts), usando o
 * externalReference `${companyId}:${planId}`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { planId, document: documentInput } = body as {
      planId?: string;
      document?: string;
    };

    if (!planId) {
      return NextResponse.json({ error: 'planId é obrigatório' }, { status: 400 });
    }

    if (!isPlanId(planId)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const plan = getPlan(planId);

    // ── Autenticação e resolução do tenant ──────────────────────────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Route handler não precisa persistir cookies aqui.
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role, full_name, email, phone')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'Empresa não encontrada para este usuário' },
        { status: 404 }
      );
    }

    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem alterar a assinatura' },
        { status: 403 }
      );
    }

    const companyId = profile.company_id;

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select(
        'id, name, email, phone, whatsapp, document, subscription_plan, subscription_status, asaas_customer_id, asaas_subscription_id'
      )
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // ── CPF/CNPJ: exigido pelo Asaas para abrir o cliente ───────────────────
    const rawDocument = documentInput ?? company.document ?? '';
    const document = cleanDocument(rawDocument);

    if (!document) {
      return NextResponse.json(
        {
          error: 'Informe o CPF ou CNPJ do responsável pela assinatura.',
          code: 'DOCUMENT_REQUIRED',
        },
        { status: 400 }
      );
    }

    if (!validateDocument(document)) {
      return NextResponse.json(
        { error: 'CPF ou CNPJ inválido. Verifique os dígitos.', code: 'DOCUMENT_INVALID' },
        { status: 400 }
      );
    }

    // ── Modo simulação: só em desenvolvimento ───────────────────────────────
    // Em produção, sem chave configurada, é melhor falhar alto do que liberar
    // 30 dias de acesso de graça (era o comportamento anterior).
    if (!isAsaasConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Pagamentos indisponíveis no momento. Fale com o suporte.' },
          { status: 503 }
        );
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabaseAdmin
        .from('companies')
        .update({
          document,
          subscription_plan: planId,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq('id', companyId);

      if (error) throw new Error(`Erro ao atualizar assinatura simulada: ${error.message}`);

      return NextResponse.json({
        url: '/dashboard/settings/billing?checkout_success=true',
        simulated: true,
      });
    }

    // ── 1. Cliente no Asaas (cria ou reaproveita) ───────────────────────────
    const customerPayload = {
      name: company.name || profile.full_name || 'Assinante Trust Care',
      cpfCnpj: document,
      email: company.email || profile.email || user.email || undefined,
      mobilePhone: cleanDocument(company.whatsapp || company.phone || '') || undefined,
      externalReference: companyId,
    };

    let customerId = company.asaas_customer_id as string | null;

    if (customerId) {
      // A chave pode ter mudado de ambiente (sandbox <-> produção); nesse caso
      // o id salvo não existe mais e precisamos recriar.
      const existing = await getCustomer(customerId);
      if (existing) {
        await updateCustomer(customerId, customerPayload);
      } else {
        customerId = null;
      }
    }

    if (!customerId) {
      const created = await createCustomer(customerPayload);
      customerId = created.id;
    }

    // ── 2. Cancela a assinatura anterior, se houver troca de plano ──────────
    const previousSubscriptionId = company.asaas_subscription_id as string | null;
    if (previousSubscriptionId) {
      try {
        await cancelSubscription(previousSubscriptionId);
      } catch (err) {
        // Assinatura já removida no Asaas não deve travar a nova contratação.
        console.warn(
          '[Checkout Asaas] Não foi possível cancelar a assinatura anterior:',
          err instanceof Error ? err.message : err
        );
      }
    }

    // ── 3. Nova assinatura ─────────────────────────────────────────────────
    const subscription = await createSubscription({
      customer: customerId,
      // UNDEFINED deixa o assinante escolher Pix, boleto ou cartão na fatura.
      billingType: 'UNDEFINED',
      value: plan.price,
      nextDueDate: todayInSaoPaulo(),
      cycle: 'MONTHLY',
      description: plan.description,
      // O webhook depende deste formato para saber qual empresa e qual plano.
      externalReference: `${companyId}:${planId}`,
    });

    // ── 4. Persiste as referências (status só muda no webhook) ──────────────
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({
        document,
        asaas_customer_id: customerId,
        asaas_subscription_id: subscription.id,
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('[Checkout Asaas] Falha ao salvar referências:', updateError.message);
    }

    // ── 5. Link de pagamento ───────────────────────────────────────────────
    const invoiceUrl = await getFirstInvoiceUrl(subscription.id);

    if (!invoiceUrl) {
      return NextResponse.json(
        {
          error:
            'A assinatura foi criada, mas a fatura ainda está sendo gerada. ' +
            'Aguarde alguns instantes e recarregue esta página.',
          subscriptionId: subscription.id,
        },
        { status: 202 }
      );
    }

    return NextResponse.json({ url: invoiceUrl, subscriptionId: subscription.id });
  } catch (err) {
    if (err instanceof AsaasError) {
      console.error('[Checkout Asaas] Erro da API:', err.status, err.code, err.message);
      return NextResponse.json(
        { error: `Falha no provedor de pagamento: ${err.message}` },
        { status: 502 }
      );
    }

    const message = err instanceof Error ? err.message : 'Erro interno do servidor.';
    console.error('[Checkout Asaas] Erro:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
