import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// Autentica a requisição via cabeçalho x-api-key
async function authenticateRequest(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return null;

  // Fallback local/mock
  if (apiKey === 'mock-api-key') {
    return 'mock-tenant-id';
  }

  try {
    const { data: company, error } = await supabase
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
    // 1. Busca no Supabase
    const { data: orders, error } = await supabase
      .from('service_orders')
      .select('id, codigo_os, equipment_details, reported_problem, status, priority, total_value, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[API Orders] Erro Supabase, tentando local:', error.message);
    }

    let finalOrders = orders || [];

    // 2. Fallback offline local
    if (finalOrders.length === 0 && companyId === 'mock-tenant-id') {
      const localOrdersStr = localStorage.getItem('mock-orders') || '[]';
      finalOrders = JSON.parse(localOrdersStr);
    }

    return NextResponse.json({ orders: finalOrders });
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

    // 1. Insere no Supabase
    const { data: insertedOs, error } = await supabase
      .from('service_orders')
      .insert(osData)
      .select()
      .single();

    if (error) {
      console.warn('[API Orders] Erro Supabase ao criar OS, salvando local:', error.message);

      // Fallback offline local
      const mockOrders = localStorage.getItem('mock-orders') || '[]';
      const parsed = JSON.parse(mockOrders);
      const newOsId = `mock-os-${Date.now()}`;
      const newOs = {
        id: newOsId,
        ...osData,
        created_at: new Date().toISOString()
      };
      parsed.push(newOs);
      localStorage.setItem('mock-orders', JSON.stringify(parsed));

      return NextResponse.json({ success: true, order: newOs }, { status: 201 });
    }

    return NextResponse.json({ success: true, order: insertedOs }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
