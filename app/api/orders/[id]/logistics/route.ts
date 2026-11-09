import { NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { calculateRouteDistance, geocodeAddress } from '@/lib/logistics/ors';
import { calculateLogisticsPricing } from '@/lib/logistics/pricing';
import type {
  CompanyAddress,
  CompanyLogisticsSettings,
  Coordinates,
  DestinationAddress,
  LogisticsLeg,
  LogisticsStatus,
} from '@/lib/logistics/types';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: orderId } = await params;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ error: 'ID de OS inválido.' }, { status: 400 });
    }

    const companyId = session.profile.company_id;

    const { data: legs, error } = await supabaseAdmin
      .from('service_order_logistics')
      .select('*')
      .eq('service_order_id', orderId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Logistics GET] Erro ao buscar trechos:', error.message);
      return NextResponse.json({ error: 'Erro ao buscar logística da OS.' }, { status: 500 });
    }

    return NextResponse.json({ legs: legs || [] });
  } catch (err: any) {
    console.error('[Logistics GET] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: orderId } = await params;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ error: 'ID de OS inválido.' }, { status: 400 });
    }

    const companyId = session.profile.company_id;
    const body = await req.json().catch(() => ({}));

    const leg: LogisticsLeg = body.leg === 'delivery' ? 'delivery' : 'pickup';
    const status: LogisticsStatus = ['pendente', 'agendada', 'concluida', 'descartada'].includes(body.status)
      ? body.status
      : 'pendente';

    // 1. Validar que a OS pertence à empresa
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('service_orders')
      .select('id, company_id')
      .eq('id', orderId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Ordem de Serviço não encontrada.' }, { status: 404 });
    }

    // 2. Carregar configurações da empresa e endereço de origem
    const [companyRes, settingsRes] = await Promise.all([
      supabaseAdmin
        .from('companies')
        .select('address_street, address_number, address_district, address_city, address_state, address_zip, latitude, longitude')
        .eq('id', companyId)
        .single(),
      supabaseAdmin
        .from('company_logistics_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle(),
    ]);

    const compAddr: CompanyAddress = companyRes.data || {};
    let originCoords: Coordinates | null =
      compAddr.latitude && compAddr.longitude
        ? { latitude: compAddr.latitude, longitude: compAddr.longitude }
        : null;

    if (!originCoords && compAddr.address_street && compAddr.address_city && compAddr.address_state) {
      const geoOrigin = await geocodeAddress({
        street: compAddr.address_street,
        number: compAddr.address_number || undefined,
        district: compAddr.address_district || undefined,
        city: compAddr.address_city,
        state: compAddr.address_state,
        zip: compAddr.address_zip || undefined,
      });
      if (geoOrigin) {
        originCoords = geoOrigin.coordinates;
        await supabaseAdmin
          .from('companies')
          .update({
            latitude: geoOrigin.coordinates.latitude,
            longitude: geoOrigin.coordinates.longitude,
          })
          .eq('id', companyId);
      }
    }

    if (!originCoords) {
      return NextResponse.json(
        {
          error: 'COMPANY_ADDRESS_MISSING',
          message: 'Cadastre o endereço da sua empresa em Configurações > Empresa antes de salvar a logística.',
        },
        { status: 400 }
      );
    }

    const settings: CompanyLogisticsSettings = settingsRes.data || {
      company_id: companyId,
      base_fee: 15.0,
      included_km: 10.0,
      price_per_km: 1.5,
      min_fee: 15.0,
      max_radius_km: 30.0,
      round_trip: true,
      vehicle_km_per_liter: 7.0,
      fuel_type: 'etanol',
      fuel_price: 4.39,
    };

    // 3. Destino
    const rawDest = body.address || {};
    const destStreet = (rawDest.street || '').trim();
    const destCity = (rawDest.city || '').trim();
    const destState = (rawDest.state || '').trim();

    if (!destStreet || !destCity || !destState) {
      return NextResponse.json(
        { error: 'Informe ao menos rua, cidade e estado para a retirada/devolução.' },
        { status: 400 }
      );
    }

    const destAddress: DestinationAddress = {
      street: destStreet,
      number: (rawDest.number || '').trim() || undefined,
      district: (rawDest.district || '').trim() || undefined,
      city: destCity,
      state: destState,
      zip: (rawDest.zip || '').trim() || undefined,
      complement: (rawDest.complement || '').trim() || undefined,
    };

    let destCoords: Coordinates | null =
      typeof rawDest.latitude === 'number' && typeof rawDest.longitude === 'number'
        ? { latitude: rawDest.latitude, longitude: rawDest.longitude }
        : null;

    let geocodedLabel = body.geocoded_label || destStreet;

    if (!destCoords) {
      const geoDest = await geocodeAddress(destAddress, originCoords);
      if (!geoDest) {
        return NextResponse.json(
          { error: 'Não foi possível geocodificar o endereço de destino.' },
          { status: 400 }
        );
      }
      destCoords = geoDest.coordinates;
      geocodedLabel = geoDest.label;
    }

    // 4. Calcular no servidor (nunca confiar no que o frontend enviou de valor)
    const route = await calculateRouteDistance(originCoords, destCoords);
    const quote = calculateLogisticsPricing({
      oneWayKm: route.distanceKm,
      durationMin: route.durationMin,
      calcMethod: route.method,
      settings,
    });

    if (quote.isOutOfRadius && status !== 'descartada') {
      return NextResponse.json(
        {
          error: 'OUT_OF_RADIUS',
          message: `Endereço fora do raio de atendimento (${quote.oneWayKm} km > ${quote.maxRadiusKm} km). Operação bloqueada.`,
        },
        { status: 400 }
      );
    }

    // 5. Ajuste manual de preço
    const calculatedPrice = quote.calculatedPrice;
    const chargedPrice =
      body.charged_price !== undefined && body.charged_price !== null
        ? Math.max(0, Number(body.charged_price))
        : calculatedPrice;

    const overrideReason = (body.override_reason || '').trim();

    if (chargedPrice !== calculatedPrice) {
      if (overrideReason.length < 3) {
        return NextResponse.json(
          { error: 'Ao alterar o valor calculado da logística, é obrigatório informar uma justificativa (mínimo 3 caracteres).' },
          { status: 400 }
        );
      }
    }

    const legPayload = {
      company_id: companyId,
      service_order_id: orderId,
      leg,
      status,
      address_zip: destAddress.zip || null,
      address_street: destAddress.street,
      address_number: destAddress.number || null,
      address_complement: destAddress.complement || null,
      address_district: destAddress.district || null,
      address_city: destAddress.city,
      address_state: destAddress.state,
      geocoded_label: geocodedLabel,
      latitude: destCoords.latitude,
      longitude: destCoords.longitude,
      distance_km: quote.oneWayKm,
      billed_km: quote.billedKm,
      duration_min: quote.durationMin,
      calc_method: quote.calcMethod,
      base_fee: Number(settings.base_fee),
      included_km: Number(settings.included_km ?? 10.0),
      price_per_km: Number(settings.price_per_km),
      min_fee: Number(settings.min_fee),
      fuel_price: Number(settings.fuel_price),
      km_per_liter: Number(settings.vehicle_km_per_liter),
      calculated_price: calculatedPrice,
      charged_price: chargedPrice,
      internal_cost: quote.internalCost,
      override_reason: chargedPrice !== calculatedPrice ? overrideReason : null,
      technician_id: body.technician_id && UUID_REGEX.test(body.technician_id) ? body.technician_id : null,
      scheduled_at: body.scheduled_at ? new Date(body.scheduled_at).toISOString() : null,
      completed_at: status === 'concluida' ? new Date().toISOString() : null,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    };

    const { data: savedLeg, error: legError } = await supabaseAdmin
      .from('service_order_logistics')
      .upsert(legPayload, { onConflict: 'service_order_id,leg' })
      .select('*')
      .single();

    if (legError) {
      console.error('[Logistics PUT] Erro ao salvar trecho:', legError.message);
      return NextResponse.json({ error: 'Erro ao registrar logística na Ordem de Serviço.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leg: savedLeg,
    });
  } catch (err: any) {
    console.error('[Logistics PUT] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao salvar logística.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: orderId } = await params;
    if (!UUID_REGEX.test(orderId)) {
      return NextResponse.json({ error: 'ID de OS inválido.' }, { status: 400 });
    }

    const companyId = session.profile.company_id;
    const url = new URL(req.url);
    const leg = url.searchParams.get('leg');

    if (leg !== 'pickup' && leg !== 'delivery') {
      return NextResponse.json({ error: 'Informe o trecho a remover (?leg=pickup ou ?leg=delivery).' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('service_order_logistics')
      .delete()
      .eq('service_order_id', orderId)
      .eq('company_id', companyId)
      .eq('leg', leg);

    if (error) {
      console.error('[Logistics DELETE] Erro ao remover trecho:', error.message);
      return NextResponse.json({ error: 'Erro ao remover trecho de logística.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, removedLeg: leg });
  } catch (err: any) {
    console.error('[Logistics DELETE] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao remover trecho.' }, { status: 500 });
  }
}
