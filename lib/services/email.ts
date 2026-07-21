import { Resend } from 'resend';

export interface SendEmailParams {
  to: string;
  subject: string;
  type: 'new_order' | 'budget_ready' | 'ready_for_pickup' | 'general_status';
  clientName: string;
  orderCode: string;
  equipment: string;
  status?: string;
  trackingUrl: string;
  budgetUrl?: string;
  totalValue?: string;
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Trust Care <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn(`[Email Service] RESEND_API_KEY não configurada no servidor. Simulação de envio para ${params.to} (${params.subject}).`);
    return { success: true, simulated: true, message: 'Resend API key missing; email simulated.' };
  }

  const resend = new Resend(apiKey);
  const htmlContent = generateEmailHtml(params);

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject: params.subject,
      html: htmlContent,
    });

    if (response.error) {
      console.error('[Email Service] Erro ao enviar e-mail via Resend:', response.error);
      return { success: false, error: response.error };
    }

    console.log(`[Email Service] E-mail enviado com sucesso para ${params.to} (ID: ${response.data?.id})`);
    return { success: true, id: response.data?.id };
  } catch (err: any) {
    console.error('[Email Service] Exceção ao enviar e-mail:', err);
    return { success: false, error: err.message || err };
  }
}

function generateEmailHtml(p: SendEmailParams): string {
  const actionButton = p.type === 'budget_ready' && p.budgetUrl ? `
    <div style="margin-top: 24px; text-align: center;">
      <a href="${p.budgetUrl}" style="background-color: #10b981; color: #000000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
        Aprovar Orçamento Agora
      </a>
    </div>
  ` : `
    <div style="margin-top: 24px; text-align: center;">
      <a href="${p.trackingUrl}" style="background-color: #2563eb; color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
        Acompanhar Ordem de Serviço
      </a>
    </div>
  `;

  let headline = 'Atualização da sua Ordem de Serviço';
  let badgeColor = '#3b82f6';

  if (p.type === 'new_order') {
    headline = 'Ordem de Serviço Aberta com Sucesso!';
    badgeColor = '#10b981';
  } else if (p.type === 'budget_ready') {
    headline = 'Seu Orçamento está Pronto!';
    badgeColor = '#f59e0b';
  } else if (p.type === 'ready_for_pickup') {
    headline = 'Seu Equipamento está Pronto para Retirada!';
    badgeColor = '#10b981';
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${p.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e4e4e7;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <tr>
          <td style="padding: 24px; background-color: #09090b; border-bottom: 1px solid #27272a; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">
              TRUST CARE
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 2px;">
              Assistência Técnica Especializada
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 32px 24px;">
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #e4e4e7;">
              Olá, <strong>${p.clientName}</strong>!
            </p>

            <div style="background-color: #09090b; border-left: 4px solid ${badgeColor}; padding: 16px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 6px 0; font-size: 16px; color: #ffffff;">${headline}</h2>
              <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
                Identificação do Chamado: <strong style="color: #ffffff;">#OS-${p.orderCode}</strong>
              </p>
            </div>

            <!-- Detail Grid -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #d4d4d8; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa; width: 35%;">Equipamento:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #ffffff;">${p.equipment}</td>
              </tr>
              ${p.status ? `
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Status Atual:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #10b981;">${p.status}</td>
              </tr>
              ` : ''}
              ${p.totalValue ? `
              <tr>
                <td style="padding: 8px 0; color: #a1a1aa;">Valor Total:</td>
                <td style="padding: 8px 0; font-weight: 800; color: #10b981; font-size: 15px;">R$ ${p.totalValue}</td>
              </tr>
              ` : ''}
            </table>

            ${actionButton}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 20px 24px; background-color: #09090b; border-top: 1px solid #27272a; text-align: center; font-size: 11px; color: #71717a; line-height: 1.5;">
            <p style="margin: 0;">Esta é uma mensagem automática de notificação da Trust Care.</p>
            <p style="margin: 4px 0 0 0;">Caso tenha dúvidas, entre em contato diretamente com a nossa equipe de suporte.</p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;
}
