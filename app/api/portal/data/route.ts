import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyPortalToken } from '@/lib/utils/portalSession';

export async function GET(req: Request) {
  try {
    // 1. Obter cookie portal-session
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );

    const sessionCookie = cookies['portal-session'];
    const session = verifyPortalToken(sessionCookie);

    if (!session || !session.email) {
      return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 });
    }

    const clientEmail = session.email.toLowerCase().trim();

    // 2. Buscar IDs de cliente vinculados a este e-mail
    const { data: clients, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('id, name, company_id, companies(name, phone, email)')
      .ilike('email', clientEmail);

    if (clientErr || !clients || clients.length === 0) {
      return NextResponse.json({
        client: { name: 'Cliente', email: clientEmail },
        orders: [],
        equipments: [],
      });
    }

    const clientIds = clients.map(c => c.id);

    // 3. Buscar ordens de serviço ativas dos clientes (filtrando soft-delete)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('service_orders')
      .select(`
        id,
        codigo_os,
        status,
        equipment_details,
        reported_problem,
        technical_report,
        total_value,
        delivery_prediction,
        created_at,
        client_equipments (
          name,
          brand,
          model,
          serial_number
        ),
        companies (
          name,
          phone,
          email
        )
      `)
      .in('client_id', clientIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      console.error('[Portal Data] Erro ao buscar OSs:', ordersErr);
    }

    // 4. Buscar equipamentos vinculados aos clientes
    const { data: equipments, error: eqErr } = await supabaseAdmin
      .from('client_equipments')
      .select('id, name, brand, model, serial_number, client_id')
      .in('client_id', clientIds)
      .order('name');

    if (eqErr) {
      console.error('[Portal Data] Erro ao buscar equipamentos:', eqErr);
    }

    // 5. Formatar ordens para o dashboard do cliente
    const formattedOrders = (orders || []).map(o => {
      const equip = o.client_equipments as any;
      const comp = o.companies as any;
      return {
        id: o.id,
        codigo_os: o.codigo_os,
        status: o.status,
        equipment_name: equip?.name || o.equipment_details || 'Aparelho',
        equipment_brand: equip?.brand || '',
        equipment_model: equip?.model || '',
        equipment_serial: equip?.serial_number || '',
        reported_problem: o.reported_problem,
        technical_report: o.technical_report,
        total_value: o.total_value,
        delivery_prediction: o.delivery_prediction,
        created_at: o.created_at,
        company_name: comp?.name || 'Assistência Técnica',
        company_phone: comp?.phone || '',
        company_email: comp?.email || '',
      };
    });

    return NextResponse.json({
      client: {
        name: clients[0].name,
        email: clientEmail,
      },
      orders: formattedOrders,
      equipments: equipments || [],
    });
  } catch (err: any) {
    console.error('[Portal Data] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao carregar dados do portal.' }, { status: 500 });
  }
}
