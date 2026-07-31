import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * API pública v1 — Ordens de Serviço.
 *
 * ATENÇÃO: todas as consultas aqui usam `supabaseAdmin`, que ignora a RLS.
 * Nada nesta rota é protegido pelo banco — o isolamento entre tenants e o
 * bloqueio por inadimplência precisam ser feitos explicitamente no código
 * abaixo. Toda referência recebida do cliente (client_id, equipment_id) é
 * verificada contra o company_id da chave antes do insert.
 */

const ORDER_STATUSES = [
  'Aguardando Equipamento',
  'Em Análise',
  'Aguardando Aprovação',
  'Aprovado',
  'Aguardando Peças',
  'Em Execução',
  'Em Testes',
  'Pronto para Retirada',
  'Finalizado',
  'Cancelado',
] as const;

const ORDER_PRIORITIES = ['Baixa', 'Média', 'Alta'] as const;

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

/** Autentica pela chave em `x-api-key` e devolve o tenant correspondente. */
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
    return company.id as string;
  } catch (err) {
    console.error('[API v1] Erro na autenticação:', err);
    return null;
  }
}

/**
 * Assinatura cancelada ou vencida bloqueia escrita.
 *
 * As policies write_* já fazem isso para o painel, mas a RLS não se aplica
 * aqui — sem esta checagem a API seria uma porta lateral para um tenant
 * inadimplente continuar operando.
 */
async function isReadOnly(companyId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('is_company_read_only', {
    comp_id: companyId,
  });

  // Falha fechada: se não dá para confirmar que está em dia, não escreve.
  if (error) {
    console.error('[API v1] Falha ao verificar status da assinatura:', error.message);
    return true;
  }

  return data === true;
}

/**
 * GET /api/v1/orders
 * Retorna as Ordens de Serviço do tenant autenticado.
 * Query params: `limit` (1-100, padrão 50) e `offset`.
 */
export async function GET(req: Request) {
  const companyId = await authenticateRequest(req);
  if (!companyId) {
    return NextResponse.json(
      { error: 'Não autorizado. x-api-key inválida ou ausente.' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '', 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '', 10) || 0, 0);

    const { data: orders, error } = await supabaseAdmin
      .from('service_orders')
      .select(
        'id, codigo_os, equipment_details, reported_problem, status, priority, total_value, created_at'
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn('[API v1] Erro Supabase:', error.message);
      return NextResponse.json({ error: 'Erro ao buscar ordens.' }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [], limit, offset });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/v1/orders
 * Cria uma Ordem de Serviço no tenant autenticado.
 */
export async function POST(req: Request) {
  const companyId = await authenticateRequest(req);
  if (!companyId) {
    return NextResponse.json(
      { error: 'Não autorizado. x-api-key inválida ou ausente.' },
      { status: 401 }
    );
  }

  try {
    if (await isReadOnly(companyId)) {
      return NextResponse.json(
        {
          error:
            'Assinatura inativa ou vencida. Regularize o plano para voltar a criar ordens.',
        },
        { status: 402 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    const { client_id, equipment_id, equipment_details, reported_problem, priority, status } =
      body as Record<string, unknown>;

    if (typeof client_id !== 'string' || !client_id) {
      return NextResponse.json({ error: 'client_id é obrigatório.' }, { status: 400 });
    }

    if (typeof reported_problem !== 'string' || !reported_problem.trim()) {
      return NextResponse.json({ error: 'reported_problem é obrigatório.' }, { status: 400 });
    }

    if (status !== undefined && !ORDER_STATUSES.includes(status as never)) {
      return NextResponse.json(
        { error: `status inválido. Valores aceitos: ${ORDER_STATUSES.join(', ')}.` },
        { status: 400 }
      );
    }

    if (priority !== undefined && !ORDER_PRIORITIES.includes(priority as never)) {
      return NextResponse.json(
        { error: `priority inválida. Valores aceitos: ${ORDER_PRIORITIES.join(', ')}.` },
        { status: 400 }
      );
    }

    // ── Isolamento de tenant ────────────────────────────────────────────────
    // Sem isto, uma chave válida conseguiria anexar uma OS ao cliente de outra
    // empresa: o supabaseAdmin aceitaria qualquer UUID existente.
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (clientError) {
      console.warn('[API v1] Erro ao validar cliente:', clientError.message);
      return NextResponse.json({ error: 'Erro ao validar cliente.' }, { status: 500 });
    }

    if (!client) {
      // Mesma resposta para "não existe" e "pertence a outro tenant": não
      // confirmamos a existência de recursos alheios.
      return NextResponse.json(
        { error: 'client_id não encontrado nesta empresa.' },
        { status: 404 }
      );
    }

    let equipmentId: string | null = null;
    if (equipment_id !== undefined && equipment_id !== null) {
      if (typeof equipment_id !== 'string') {
        return NextResponse.json({ error: 'equipment_id inválido.' }, { status: 400 });
      }

      const { data: equipment } = await supabaseAdmin
        .from('client_equipments')
        .select('id')
        .eq('id', equipment_id)
        .eq('company_id', companyId)
        .eq('client_id', client_id)
        .maybeSingle();

      if (!equipment) {
        return NextResponse.json(
          { error: 'equipment_id não encontrado para este cliente.' },
          { status: 404 }
        );
      }

      equipmentId = equipment.id;
    }

    const osData = {
      company_id: companyId,
      client_id,
      equipment_id: equipmentId,
      equipment_details:
        typeof equipment_details === 'string' && equipment_details.trim()
          ? equipment_details
          : 'Não especificado',
      reported_problem,
      priority: (priority as string) || 'Média',
      status: (status as string) || 'Em Análise',
      service_value: 0,
      discount: 0,
      total_value: 0,
    };

    const { data: insertedOs, error } = await supabaseAdmin
      .from('service_orders')
      .insert(osData)
      .select(
        'id, codigo_os, client_id, equipment_id, equipment_details, reported_problem, status, priority, created_at'
      )
      .single();

    if (error) {
      console.warn('[API v1] Erro Supabase ao criar OS:', error.message);
      return NextResponse.json({ error: 'Erro ao criar ordem.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: insertedOs }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
