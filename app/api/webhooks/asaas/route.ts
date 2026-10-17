import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_PLANS = ['starter', 'pro', 'premium'] as const;

/**
 * Validação em tempo constante do token de webhook do Asaas (F-31).
 */
function verifyWebhookToken(headerToken: string | null): boolean {
  const secret = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!secret || !headerToken) return false;

  const secretBuffer = Buffer.from(secret);
  const headerBuffer = Buffer.from(headerToken);

  if (secretBuffer.length !== headerBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, headerBuffer);
}

/**
 * Parsing seguro de data evitando RangeError em formatos inválidos.
 */
function parseSafeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    const accessToken = req.headers.get('asaas-access-token');

    // 1. Validação com tempo constante
    if (!verifyWebhookToken(accessToken)) {
      console.warn('[Asaas Webhook] Token de acesso inválido ou ausente.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => null);
    if (!payload || !payload.event) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const event = String(payload.event);
    const payment = payload.payment;
    const subscription = payload.subscription;

    // Identificador único do evento Asaas para idempotência (F-31)
    const asaasEventId = String(payload.id || `${event}_${payment?.id || subscription?.id || Date.now()}`);

    // 2. Idempotência: verifica se o evento já foi processado anteriormente
    const { data: existingEvent } = await supabaseAdmin
      .from('billing_events')
      .select('id')
      .eq('asaas_event_id', asaasEventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ success: true, message: 'Evento já processado (idempotente).' });
    }

    // 3. Resolução do tenant
    const extRef = payment?.externalReference || subscription?.externalReference;
    const customerAsaasId = payment?.customer || subscription?.customer;
    const subscriptionAsaasId = payment?.subscription || subscription?.id;

    let companyId = '';
    let targetPlan = '';

    if (extRef && typeof extRef === 'string') {
      if (extRef.includes(':')) {
        const parts = extRef.split(':');
        companyId = parts[0];
        targetPlan = parts[1];
      } else {
        companyId = extRef;
      }
    }

    if (companyId && !UUID_REGEX.test(companyId)) {
      companyId = '';
    }

    // Fallback: busca por asaas_subscription_id ou asaas_customer_id
    if (!companyId) {
      if (subscriptionAsaasId) {
        const { data } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('asaas_subscription_id', subscriptionAsaasId)
          .maybeSingle();
        if (data) companyId = data.id;
      }

      if (!companyId && customerAsaasId) {
        const { data } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('asaas_customer_id', customerAsaasId)
          .maybeSingle();
        if (data) companyId = data.id;
      }
    }

    if (!companyId) {
      console.warn('[Asaas Webhook] Tenant não identificado para o evento:', event);
      // Registra o evento mesmo sem tenant identificado para auditoria
      await supabaseAdmin.from('billing_events').insert({
        asaas_event_id: asaasEventId,
        event_type: event,
        payload,
      });
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 });
    }

    // 4. Tratamento por tipo de evento
    let subscription_status: string | null = null;
    let subscription_expires_at: string | null = null;

    const dueDate = parseSafeDate(payment?.dueDate || subscription?.dueDate) || new Date();
    const nextDueDate = parseSafeDate(subscription?.nextDueDate);

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        subscription_status = 'active';
        if (nextDueDate) {
          subscription_expires_at = nextDueDate.toISOString();
        } else {
          const nextCycle = new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          subscription_expires_at = nextCycle.toISOString();
        }
        break;

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_OVERDUE_UPDATED':
        subscription_status = 'past_due';
        subscription_expires_at = dueDate.toISOString();
        break;

      case 'SUBSCRIPTION_CANCELED':
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        subscription_status = 'canceled';
        subscription_expires_at = new Date().toISOString();
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        // F-31: Estorno ou exclusão de pagamento individual NÃO cancela a assinatura inteira da empresa!
        // Apenas registra o evento de faturamento para auditoria.
        await supabaseAdmin.from('billing_events').insert({
          asaas_event_id: asaasEventId,
          company_id: companyId,
          event_type: event,
          payload,
        });
        return NextResponse.json({
          success: true,
          message: 'Evento financeiro registrado sem cancelamento de assinatura.',
        });

      default:
        // Outros eventos informativos (ex: PAYMENT_CREATED)
        await supabaseAdmin.from('billing_events').insert({
          asaas_event_id: asaasEventId,
          company_id: companyId,
          event_type: event,
          payload,
        });
        return NextResponse.json({ success: true, message: 'Evento registrado' });
    }

    // 5. Atualização da empresa no banco
    const updateData: Record<string, any> = {};

    if (subscription_status) {
      updateData.subscription_status = subscription_status;
    }
    if (subscription_expires_at) {
      updateData.subscription_expires_at = subscription_expires_at;
    }
    if (customerAsaasId) {
      updateData.asaas_customer_id = customerAsaasId;
    }
    if (subscriptionAsaasId) {
      updateData.asaas_subscription_id = subscriptionAsaasId;
    }
    if (targetPlan && (VALID_PLANS as readonly string[]).includes(targetPlan)) {
      updateData.subscription_plan = targetPlan;
    }

    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update(updateData)
      .eq('id', companyId);

    if (updateError) {
      console.error('[Asaas Webhook] Erro ao atualizar empresa:', updateError.message);
      return NextResponse.json({ error: 'Erro ao processar atualização no banco.' }, { status: 500 });
    }

    // 6. Grava evento processado na tabela de idempotência
    await supabaseAdmin.from('billing_events').insert({
      asaas_event_id: asaasEventId,
      company_id: companyId,
      event_type: event,
      payload,
    });

    console.log(`[Asaas Webhook] Empresa ${companyId} atualizada com sucesso para ${subscription_status}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Asaas Webhook] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao processar webhook.' }, { status: 500 });
  }
}
