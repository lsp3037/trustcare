import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/services/email';
import { OS_STATUS_FLOW } from '@/lib/design/status';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES: readonly string[] = ['Abertura', ...OS_STATUS_FLOW];

/**
 * Notificação de OS (e-mail + webhook opcional).
 *
 * Só aceita `order_id` e `status` do cliente. Todo o resto (nome, e-mail,
 * equipamento, valor) é lido do banco com a sessão do usuário — a RLS garante
 * que só OS da própria empresa podem disparar notificação — e as URLs são
 * montadas aqui, nunca recebidas do payload.
 */
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

    const body = await req.json().catch(() => null);
    const orderId = typeof body?.order_id === 'string' ? body.order_id : '';
    const status = typeof body?.status === 'string' ? body.status : '';

    if (!UUID_REGEX.test(orderId) || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    // RLS: retorna vazio se a OS não for da empresa do usuário.
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select('id, codigo_os, equipment_details, total_value, clients(name, email, phone)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada.' }, { status: 404 });
    }

    const clientRel = order.clients as any;
    const client = Array.isArray(clientRel) ? clientRel[0] : clientRel;

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const trackingUrl = `${origin}/rastreio?id=${order.id}`;
    const budgetUrl = `${origin}/orcamento/${order.id}`;
    const shortOrderCode = order.codigo_os || order.id.slice(0, 8);
    const totalValue =
      order.total_value != null ? Number(order.total_value).toFixed(2) : undefined;
    const equipment = order.equipment_details || 'Equipamento';

    let emailResult = null;

    if (client?.email) {
      let emailType: 'new_order' | 'budget_ready' | 'ready_for_pickup' | 'general_status' = 'general_status';
      let subject = `Atualização da OS #${shortOrderCode} - Trust Care`;

      if (status === 'Abertura') {
        emailType = 'new_order';
        subject = `Ordem de Serviço Aberta com Sucesso — #${shortOrderCode}`;
      } else if (status === 'Aguardando Aprovação') {
        emailType = 'budget_ready';
        subject = `Orçamento Pronto para Aprovação — OS #${shortOrderCode}`;
      } else if (status === 'Pronto para Retirada' || status === 'Finalizado') {
        emailType = 'ready_for_pickup';
        subject = `Equipamento Pronto para Retirada — OS #${shortOrderCode}`;
      }

      emailResult = await sendTransactionalEmail({
        to: client.email,
        subject,
        type: emailType,
        clientName: client.name || 'Cliente',
        orderCode: shortOrderCode,
        equipment,
        status,
        trackingUrl,
        budgetUrl,
        totalValue,
      });
    }

    // Webhook opcional (ex: n8n / WhatsApp) se WEBHOOK_URL estiver configurada
    const webhookUrl = process.env.WEBHOOK_URL;
    let webhookResult = null;

    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'order_status_changed',
            order_id: order.id,
            status,
            equipment,
            client_name: client?.name,
            client_email: client?.email,
            client_phone: client?.phone,
            tracking_url: trackingUrl,
            timestamp: new Date().toISOString(),
          }),
        });
        webhookResult = { ok: res.ok, status: res.status };
      } catch (webhookErr: any) {
        console.warn('[Notify API] Falha ao despachar webhook secundário:', webhookErr.message);
        webhookResult = { ok: false };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Processamento de notificação concluído.',
      email: emailResult,
      webhook: webhookResult,
    });
  } catch (err: any) {
    console.error('[Notify API] Erro interno no manipulador de notificações:', err);
    return NextResponse.json({ error: 'Erro interno ao processar notificação.' }, { status: 500 });
  }
}
