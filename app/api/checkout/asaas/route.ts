import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'planId é obrigatório' }, { status: 400 });
    }

    if (!['starter', 'pro', 'premium'].includes(planId)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Autentica a sessão a partir dos cookies da requisição — nunca confiamos em
    // um companyId enviado pelo cliente, para não permitir que uma empresa altere
    // a assinatura de outra.
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Empresa não encontrada para este usuário' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem alterar a assinatura' }, { status: 403 });
    }

    const companyId = profile.company_id;

    const asaasApiKey = process.env.ASAAS_API_KEY;

    // MODO SIMULAÇÃO
    if (!asaasApiKey) {
      console.log(`[Checkout Simulado] Criando assinatura simulada para empresa ${companyId}, plano ${planId}`);
      
      // Simula ativação imediata para testes
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de acesso
      
      const { error } = await supabaseAdmin
        .from('companies')
        .update({
          subscription_plan: planId,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString()
        })
        .eq('id', companyId);

      if (error) {
        throw new Error(`Erro ao atualizar banco simulado: ${error.message}`);
      }

      // Retorna uma URL de sucesso fake que redireciona de volta ao painel
      return NextResponse.json({ 
        url: '/dashboard/settings/billing?checkout_success=true'
      });
    }

    // MODO PRODUÇÃO (ASAAS)
    // 1. Obter dados da empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // A lógica de integração com Asaas será construída aqui futuramente
    // 1. POST /v3/customers (Criar cliente)
    // 2. POST /v3/subscriptions (Criar assinatura com externalReference = `${companyId}:${planId}`)
    // 3. Pegar a invoiceUrl da resposta

    // Como placeholder do modo produção, vamos retornar erro 501
    return NextResponse.json({ 
      error: 'Integração Asaas ainda não configurada totalmente. Remova a chave ASAAS_API_KEY para testar no modo simulação.' 
    }, { status: 501 });

  } catch (err: any) {
    console.error('[Checkout API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
