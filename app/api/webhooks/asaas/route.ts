import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Validador simples de UUID para segurança
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log('[Asaas Webhook] Evento recebido:', payload.event);

    const event = payload.event;
    const payment = payload.payment;
    const subscription = payload.subscription;

    // Resolve as referências do evento
    const extRef = payment?.externalReference || subscription?.externalReference;
    const customerAsaasId = payment?.customer || subscription?.customer;
    const subscriptionAsaasId = payment?.subscription || subscription?.id;

    let companyId = '';
    let targetPlan = '';

    // 1. Tenta obter o companyId e o plano do externalReference estruturado (ex: "company_uuid:plan_id")
    if (extRef) {
      if (extRef.includes(':')) {
        const parts = extRef.split(':');
        companyId = parts[0];
        targetPlan = parts[1];
      } else {
        companyId = extRef;
      }
    }

    // Valida se o companyId é um UUID válido
    if (companyId && !UUID_REGEX.test(companyId)) {
      companyId = ''; // Descarta se não for UUID
    }

    // 2. Fallback: Se não encontrou por externalReference, busca no banco por asaas_customer_id ou asaas_subscription_id
    if (!companyId) {
      let query = supabaseAdmin.from('companies').select('id');
      
      if (subscriptionAsaasId) {
        const { data } = await query.eq('asaas_subscription_id', subscriptionAsaasId).maybeSingle();
        if (data) companyId = data.id;
      }

      if (!companyId && customerAsaasId) {
        const { data } = await supabaseAdmin.from('companies').select('id').eq('asaas_customer_id', customerAsaasId).maybeSingle();
        if (data) companyId = data.id;
      }
    }

    if (!companyId) {
      console.warn('[Asaas Webhook] Tenant não identificado para o evento:', event);
      return NextResponse.json({ error: 'Tenant not identified' }, { status: 400 });
    }

    // Determina os novos estados financeiros
    let subscription_status = 'active';
    let subscription_expires_at: string | null = null;

    const dueDateStr = payment?.dueDate || subscription?.dueDate;
    const dueDate = dueDateStr ? new Date(dueDateStr) : new Date();

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        subscription_status = 'active';
        // Acesso garantido até o vencimento da próxima fatura (+30 dias de ciclo padrão)
        dueDate.setDate(dueDate.getDate() + 30);
        subscription_expires_at = dueDate.toISOString();
        break;

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_OVERDUE_UPDATED':
        subscription_status = 'past_due';
        // A data de expiração oficial passa a ser a data do vencimento original.
        // O banco/RLS bloqueará o acesso após (subscription_expires_at + 5 dias)
        subscription_expires_at = dueDate.toISOString();
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'SUBSCRIPTION_CANCELED':
      case 'SUBSCRIPTION_DELETED':
        subscription_status = 'canceled';
        subscription_expires_at = new Date().toISOString(); // Expira imediatamente
        break;

      default:
        // Outros eventos do Asaas (ex: criação de cobrança) não alteram o status de acesso
        return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    // Monta o payload de atualização
    const updateData: any = {
      subscription_status,
      subscription_expires_at,
    };

    if (customerAsaasId) {
      updateData.asaas_customer_id = customerAsaasId;
    }
    if (subscriptionAsaasId) {
      updateData.asaas_subscription_id = subscriptionAsaasId;
    }
    // Se o webhook trouxe uma mudança de plano estruturada, atualiza
    if (targetPlan && ['basico', 'profissional', 'premium'].includes(targetPlan)) {
      updateData.subscription_plan = targetPlan;
    }

    // Executa a atualização usando o cliente administrador (bypassa RLS)
    const { error } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('id', companyId);

    if (error) {
      console.error('[Asaas Webhook] Erro ao atualizar empresa no banco:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Asaas Webhook] Empresa ${companyId} atualizada com sucesso para ${subscription_status}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Asaas Webhook] Erro interno:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
