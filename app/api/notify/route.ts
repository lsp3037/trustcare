import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/services/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      status,
      order_id,
      equipment,
      client_name,
      client_email,
      client_phone,
      tracking_url,
      budget_url,
      total_value,
    } = body;

    const shortOrderCode = order_id ? (order_id.length > 8 ? order_id.slice(0, 8) : order_id) : 'OS-1';
    let emailResult = null;

    // Disparar e-mail se client_email estiver informado
    if (client_email) {
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
        to: client_email,
        subject,
        type: emailType,
        clientName: client_name || 'Cliente',
        orderCode: shortOrderCode,
        equipment: equipment || 'Equipamento',
        status: status || 'Em Andamento',
        trackingUrl: tracking_url || '#',
        budgetUrl: budget_url || tracking_url,
        totalValue: total_value,
      });
    }

    // Disparar webhook opcional (ex: n8n / WhatsApp) se WEBHOOK_URL estiver configurada
    const webhookUrl = process.env.WEBHOOK_URL;
    let webhookResult = null;

    if (webhookUrl) {
      try {
        const payload = {
          event: 'order_status_changed',
          order_id,
          status,
          equipment,
          client_name,
          client_email,
          client_phone,
          tracking_url,
          timestamp: new Date().toISOString(),
        };

        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        webhookResult = { ok: res.ok, status: res.status };
      } catch (webhookErr: any) {
        console.warn('[Notify API] Falha ao despachar webhook secundário:', webhookErr.message);
        webhookResult = { ok: false, error: webhookErr.message };
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
    return NextResponse.json({ error: err.message || 'Erro interno ao processar notificação.' }, { status: 500 });
  }
}
