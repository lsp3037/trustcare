import { NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';
import { calculateRouteDistance, geocodeAddress } from '@/lib/logistics/ors';
import { calculateLogisticsPricing } from '@/lib/logistics/pricing';
import type { CompanyAddress, CompanyLogisticsSettings, Coordinates, DestinationAddress } from '@/lib/logistics/types';
import { supabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
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
      return NextResponse.json({ error: 'ID de Ordem de Serviço inválido.' }, { status: 400 });
    }

    const companyId = session.profile.company_id;

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

    // 2. Obter regras de logística e endereço da empresa
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
          message: 'Cadastre o endereço da sua empresa em Configurações > Empresa antes de calcular retiradas.',
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

    // 3. Obter dados de destino
    const body = await req.json().catch(() => ({}));
    const rawDest = body.address || {};
    const destStreet = (rawDest.street || '').trim();
    const destCity = (rawDest.city || '').trim();
    const destState = (rawDest.state || '').trim();

    if (!destStreet || !destCity || !destState) {
      return NextResponse.json(
        { error: 'Informe ao menos rua, cidade e estado para o cálculo.' },
        { status: 400 }
      );
    }

    const destinationAddress: DestinationAddress = {
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

    let destLabel: string = destStreet;

    if (!destCoords) {
      const geoDest = await geocodeAddress(destinationAddress, originCoords);
      if (!geoDest) {
        return NextResponse.json(
          {
            error: 'GEOCODE_FAILED',
            message: 'Não foi possível localizar o endereço informado no mapa. Verifique rua, número e cidade.',
          },
          { status: 400 }
        );
      }
      destCoords = geoDest.coordinates;
      destLabel = geoDest.label;
    }

    // 4. Calcular distância
    const route = await calculateRouteDistance(originCoords, destCoords);

    // 5. Calcular preço e custos
    const quote = calculateLogisticsPricing({
      oneWayKm: route.distanceKm,
      durationMin: route.durationMin,
      calcMethod: route.method,
      settings,
    });

    if (quote.isOutOfRadius) {
      return NextResponse.json(
        {
          error: 'OUT_OF_RADIUS',
          message: `Endereço fora do raio de atendimento (${quote.oneWayKm} km > ${quote.maxRadiusKm} km permitido). Operação bloqueada.`,
          quote,
          destination: {
            coordinates: destCoords,
            label: destLabel,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      quote,
      destination: {
        coordinates: destCoords,
        label: destLabel,
      },
    });
  } catch (err: any) {
    console.error('[Logistics Quote] Erro:', err);
    return NextResponse.json({ error: 'Erro interno ao calcular orçamento de logística.' }, { status: 500 });
  }
}
