import { NextResponse } from 'next/server';

const CRITICAL_STATUSES = ['Aguardando Peças', 'Pronto para Retirada', 'Cancelado'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, order_id, equipment, client_name, client_phone, tracking_url } = body;

    // Apenas processar se for um status de interesse do cliente
    if (!CRITICAL_STATUSES.includes(status)) {
      return NextResponse.json({ success: true, message: 'Status não é crítico, ignorando envio.' });
    }

    const webhookUrl = process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('[Notify API] WEBHOOK_URL não está configurada nas variáveis de ambiente.');
      return NextResponse.json({ success: true, message: 'Webhook não configurado no servidor.' });
    }

    const payload = {
      event: 'order_status_changed',
      order_id,
      status,
      equipment,
      client_name,
      client_phone,
      tracking_url,
      timestamp: new Date().toISOString()
    };

    console.log(`[Notify API] Enviando webhook para o n8n para OS ${order_id} com status: ${status}`);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Notify API] Erro ao enviar webhook para o n8n (Status ${res.status}):`, errText);
      return NextResponse.json({ error: 'Erro ao despachar webhook para o n8n.' }, { status: 500 });
    }

    console.log('[Notify API] Webhook enviado com sucesso para o n8n.');
    return NextResponse.json({ success: true, message: 'Notificação enviada ao n8n.' });
  } catch (err: any) {
    console.error('[Notify API] Erro interno:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
