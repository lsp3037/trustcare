import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';
import { hashApiKey, isValidApiKeyFormat } from '@/lib/services/apiKey';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIORITIES = ['Baixa', 'Média', 'Alta'] as const;

type AuthResult =
  | { success: true; companyId: string; apiKeyId: string; scopes: string[] }
  | { success: false; error: string; status: number };

/**
 * Autentica e autoriza a requisição via cabeçalho x-api-key ou Authorization Bearer.
 * - Validação em tempo seguro via hash SHA-256
 * - Verificação de revogação
 * - Rate limit por chave
 * - Bloqueio por cancelamento de assinatura
 */
async function authenticateApiRequest(req: Request): Promise<AuthResult> {
  const headerKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const rawKey = (headerKey || bearerKey || '').trim();

  if (!rawKey || !isValidApiKeyFormat(rawKey)) {
    return {
      success: false,
      error: 'Não autorizado. Chave de API ausente ou em formato inválido.',
      status: 401,
    };
  }

  const keyHash = hashApiKey(rawKey);

  try {
    // 1. Busca chave ativa no banco pelo hash SHA-256
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, company_id, scopes, revoked_at')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .maybeSingle();

    if (keyError || !keyRecord) {
      return {
        success: false,
        error: 'Não autorizado. Chave de API inválida ou revogada.',
        status: 401,
      };
    }

    // 2. Rate limit fail-closed por chave de API (max 30 req/min)
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = realIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    const { data: rateAllowed, error: rateErr } = await supabaseAdmin.rpc('check_and_clean_rate_limit', {
      client_ip: clientIp,
      target_path: `/api/v1/orders:${keyHash.substring(0, 16)}`,
    });

    if (rateErr || rateAllowed !== true) {
      return {
        success: false,
        error: 'Limite de requisições excedido para esta chave de API. Aguarde um minuto.',
        status: 429,
      };
    }

    // 3. Verifica status da empresa (assinatura cancelada bloqueia API)
    const { data: company, error: compError } = await supabaseAdmin
      .from('companies')
      .select('subscription_status')
      .eq('id', keyRecord.company_id)
      .maybeSingle();

    if (compError || !company) {
      return {
        success: false,
        error: 'Empresa associada à chave não encontrada.',
        status: 404,
      };
    }

    if (company.subscription_status === 'canceled') {
      return {
        success: false,
        error: 'Assinatura cancelada. O acesso à API pública foi bloqueado.',
        status: 403,
      };
    }

    // 4. Atualiza last_used_at de forma não bloqueante
    supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id)
      .then(
        () => {},
        (err) => console.warn('[API Auth] Falha ao atualizar last_used_at:', err)
      );

    return {
      success: true,
      companyId: keyRecord.company_id,
      apiKeyId: keyRecord.id,
      scopes: keyRecord.scopes || [],
    };
  } catch (err: any) {
    console.error('[API Auth] Erro interno de validação:', err);
    return {
      success: false,
      error: 'Erro interno ao validar credenciais.',
      status: 500,
    };
  }
}

/**
 * GET /api/v1/orders
 * Retorna as Ordens de Serviço do tenant autenticado com paginação segura.
 * Parâmetros de consulta:
 * - page: número da página (padrão 1)
 * - limit: registros por página (padrão 20, máx 100)
 * - status: filtro opcional de status
 */
export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.scopes.includes('orders:read')) {
    return NextResponse.json({ error: 'Chave de API sem escopo de leitura (orders:read).' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const limitParam = parseInt(url.searchParams.get('limit') || '20', 10);
    const statusParam = url.searchParams.get('status')?.trim();

    const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam >= 1 ? Math.min(limitParam, 100) : 20;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('service_orders')
      .select('id, codigo_os, client_id, equipment_details, reported_problem, status, priority, total_value, created_at', {
        count: 'exact',
      })
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (statusParam) {
      query = query.eq('status', statusParam);
    }

    const { data: orders, count, error } = await query;

    if (error) {
      console.warn('[API Orders GET] Erro Supabase:', error.message);
      return NextResponse.json({ error: 'Erro ao buscar ordens de serviço.' }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err: any) {
    console.error('[API Orders GET] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * POST /api/v1/orders
 * Cria uma nova Ordem de Serviço vinculada ao tenant autenticado.
 * - Valida client_id pertencente à empresa
 * - Sanitiza reported_problem contra XSS
 * - Fixa status inicial em 'Em Análise'
 * - Bloqueia escrita se tenant em somente-leitura
 */
export async function POST(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.scopes.includes('orders:write')) {
    return NextResponse.json({ error: 'Chave de API sem escopo de escrita (orders:write).' }, { status: 403 });
  }

  try {
    // 1. Bloqueia se a empresa estiver em modo somente-leitura
    const { data: readOnly } = await supabaseAdmin.rpc('is_company_read_only', {
      comp_id: auth.companyId,
    });

    if (readOnly === true) {
      return NextResponse.json(
        { error: 'Empresa em modo somente leitura por pendência financeira. Criação bloqueada.' },
        { status: 403 }
      );
    }

    // 2. Parse e validação do payload
    const body = await req.json().catch(() => null);
    const client_id = typeof body?.client_id === 'string' ? body.client_id.trim() : '';
    const rawProblem = typeof body?.reported_problem === 'string' ? body.reported_problem.trim() : '';
    const reported_problem = sanitizeHtml(rawProblem);
    const equipment_details = typeof body?.equipment_details === 'string' ? body.equipment_details.trim() : 'Não especificado';
    const priority = PRIORITIES.includes(body?.priority) ? body.priority : 'Média';

    if (!UUID_REGEX.test(client_id) || !reported_problem) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes ou inválidos: client_id (UUID) e reported_problem são necessários.' },
        { status: 400 }
      );
    }

    // 3. Validação rigorosa: o cliente DEVE pertencer ao mesmo tenant da chave de API
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('company_id', auth.companyId)
      .maybeSingle();

    if (clientErr || !client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado para esta empresa.' },
        { status: 404 }
      );
    }

    // 4. Monta a OS com status inicial fixo e valores seguros
    const osData = {
      company_id: auth.companyId,
      client_id,
      equipment_details: equipment_details || 'Não especificado',
      reported_problem,
      priority,
      status: 'Em Análise', // Status inicial sempre fixado pelo servidor
      service_value: 0,
      discount: 0,
      total_value: 0,
    };

    const { data: insertedOs, error: insertErr } = await supabaseAdmin
      .from('service_orders')
      .insert(osData)
      .select('id, codigo_os, client_id, equipment_details, reported_problem, status, priority, total_value, created_at')
      .single();

    if (insertErr) {
      console.warn('[API Orders POST] Erro Supabase ao criar OS:', insertErr.message);
      return NextResponse.json({ error: 'Erro ao criar ordem de serviço.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: insertedOs }, { status: 201 });
  } catch (err: any) {
    console.error('[API Orders POST] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
