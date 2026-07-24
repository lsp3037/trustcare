import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Autentica a requisição via cabeçalho x-api-key
async function authenticateRequest(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return null;

  try {
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (error || !company) return null;
    return company.id;
  } catch (err) {
    console.error('[API Base] Erro na autenticação:', err);
    return null;
  }
}

/**
 * GET /api/v1/orders
 * Retorna as Ordens de Serviço do tenant autenticado.
 */
export async function GET(req: Request) {
  const companyId = await authenticateRequest(req);
  if (!companyId) {
    return NextResponse.json({ error: 'Não autorizado. x-api-key inválida ou ausente.' }, { status: 401 });
  }

  try {
    const { data: orders, error } = await supabaseAdmin
      .from('service_orders')
      .select('id, codigo_os, equipment_details, reported_problem, status, priority, total_value, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[API Orders] Erro Supabase:', error.message);
      return NextResponse.json({ error: 'Erro ao buscar ordens.' }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * POST /api/v1/orders
 * Cria uma nova Ordem de Serviço vinculada ao tenant autenticado.
 */
export async function POST(req: Request) {
  const companyId = await authenticateRequest(req);
  if (!companyId) {
    return NextResponse.json({ error: 'Não autorizado. x-api-key inválida ou ausente.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { client_id, equipment_details, reported_problem, priority, status } = body;

    if (!client_id || !reported_problem) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes: client_id e reported_problem são necessários.' },
        { status: 400 }
      );
    }

    const osData = {
      company_id: companyId,
      client_id,
      equipment_details: equipment_details || 'Não especificado',
      reported_problem,
      priority: priority || 'Média',
      status: status || 'Em Análise',
      service_value: 0,
      discount: 0,
      total_value: 0
    };

    const { data: insertedOs, error } = await supabaseAdmin
      .from('service_orders')
      .insert(osData)
      .select()
      .single();

    if (error) {
      console.warn('[API Orders] Erro Supabase ao criar OS:', error.message);
      return NextResponse.json({ error: 'Erro ao criar ordem.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: insertedOs }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
