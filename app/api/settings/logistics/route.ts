import { NextResponse } from 'next/server';
import { getAdminSession, getAuthenticatedSession } from '@/lib/auth/session';
import { geocodeAddress } from '@/lib/logistics/ors';
import type { CompanyAddress, CompanyLogisticsSettings } from '@/lib/logistics/types';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const companyId = session.profile.company_id;

    const [companyRes, settingsRes] = await Promise.all([
      supabaseAdmin
        .from('companies')
        .select(
          'address_zip, address_street, address_number, address_district, address_city, address_state, latitude, longitude'
        )
        .eq('id', companyId)
        .single(),
      supabaseAdmin
        .from('company_logistics_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle(),
    ]);

    const address: CompanyAddress = companyRes.data || {};
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

    return NextResponse.json({ address, settings });
  } catch (err: any) {
    console.error('[Settings Logistics GET] Erro:', err);
    return NextResponse.json({ error: 'Erro ao carregar configurações de logística.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado. Apenas administradores podem alterar configurações de logística.' },
        { status: 403 }
      );
    }

    const companyId = session.profile.company_id;
    const body = await req.json().catch(() => ({}));

    const rawAddress = body.address || {};
    const rawSettings = body.settings || {};

    const street = (rawAddress.street || '').trim();
    const city = (rawAddress.city || '').trim();
    const state = (rawAddress.state || '').trim();
    const zip = (rawAddress.zip || '').trim();
    const number = (rawAddress.number || '').trim();
    const district = (rawAddress.district || '').trim();

    let latitude = typeof rawAddress.latitude === 'number' ? rawAddress.latitude : null;
    let longitude = typeof rawAddress.longitude === 'number' ? rawAddress.longitude : null;

    if (street && city && state && (!latitude || !longitude)) {
      const geocoded = await geocodeAddress({
        street,
        number,
        district,
        city,
        state,
        zip,
      });
      if (geocoded) {
        latitude = geocoded.coordinates.latitude;
        longitude = geocoded.coordinates.longitude;
      }
    }

    const companyUpdatePayload: Record<string, any> = {
      address_zip: zip || null,
      address_street: street || null,
      address_number: number || null,
      address_district: district || null,
      address_city: city || null,
      address_state: state || null,
    };

    if (latitude !== null && longitude !== null) {
      companyUpdatePayload.latitude = latitude;
      companyUpdatePayload.longitude = longitude;
    }

    const { error: compError } = await supabaseAdmin
      .from('companies')
      .update(companyUpdatePayload)
      .eq('id', companyId);

    if (compError) {
      console.error('[Settings Logistics] Erro ao atualizar empresa:', compError.message);
      return NextResponse.json({ error: 'Erro ao salvar endereço da empresa.' }, { status: 500 });
    }

    const settingsPayload = {
      company_id: companyId,
      base_fee: Math.max(0, Number(rawSettings.base_fee) || 0),
      included_km: Math.max(0, Number(rawSettings.included_km ?? 10.0)),
      price_per_km: Math.max(0, Number(rawSettings.price_per_km) || 0),
      min_fee: Math.max(0, Number(rawSettings.min_fee) || 0),
      max_radius_km: Math.max(1, Number(rawSettings.max_radius_km) || 30),
      round_trip: rawSettings.round_trip !== false,
      vehicle_km_per_liter: Math.max(0.1, Number(rawSettings.vehicle_km_per_liter) || 10),
      fuel_type: ['etanol', 'gasolina', 'diesel', 'gnv'].includes(rawSettings.fuel_type)
        ? rawSettings.fuel_type
        : 'etanol',
      fuel_price: Math.max(0, Number(rawSettings.fuel_price) || 0),
      updated_at: new Date().toISOString(),
    };

    const { data: savedSettings, error: setErrors } = await supabaseAdmin
      .from('company_logistics_settings')
      .upsert(settingsPayload, { onConflict: 'company_id' })
      .select('*')
      .single();

    if (setErrors) {
      console.error('[Settings Logistics] Erro ao atualizar regras:', setErrors.message);
      return NextResponse.json({ error: 'Erro ao salvar regras de logística.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      address: {
        address_zip: zip,
        address_street: street,
        address_number: number,
        address_district: district,
        address_city: city,
        address_state: state,
        latitude,
        longitude,
      },
      settings: savedSettings,
    });
  } catch (err: any) {
    console.error('[Settings Logistics PUT] Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno ao salvar configurações.' }, { status: 500 });
  }
}
