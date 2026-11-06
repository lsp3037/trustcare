import type {
  CalcMethod,
  CompanyLogisticsSettings,
  Coordinates,
  LogisticsPricingResult,
} from './types';

const EARTH_RADIUS_KM = 6371;
const HAVERSINE_ROAD_FACTOR = 1.3;

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const km = EARTH_RADIUS_KM * c;

  return Math.round(km * 10) / 10;
}

export function estimateRouteKmFromHaversine(haversineDistanceKm: number): number {
  return Math.round(haversineDistanceKm * HAVERSINE_ROAD_FACTOR * 10) / 10;
}

export function computeFuelCostPerKm(fuelPrice: number, kmPerLiter: number): number {
  if (kmPerLiter <= 0 || fuelPrice <= 0) return 0;
  return Math.round((fuelPrice / kmPerLiter) * 1000) / 1000;
}

export function computeBilledKm(oneWayKm: number, roundTrip: boolean): number {
  const km = roundTrip ? oneWayKm * 2 : oneWayKm;
  return Math.round(km * 10) / 10;
}

export interface PricingInput {
  oneWayKm: number;
  durationMin: number | null;
  calcMethod: CalcMethod;
  settings: Pick<
    CompanyLogisticsSettings,
    | 'base_fee'
    | 'price_per_km'
    | 'min_fee'
    | 'max_radius_km'
    | 'round_trip'
    | 'vehicle_km_per_liter'
    | 'fuel_price'
  > & {
    included_km?: number;
  };
}

export function calculateLogisticsPricing(input: PricingInput): LogisticsPricingResult {
  const { oneWayKm, durationMin, calcMethod, settings } = input;
  const maxRadiusKm = Number(settings.max_radius_km) || 30;
  const isOutOfRadius = oneWayKm > maxRadiusKm;

  const billedKm = computeBilledKm(oneWayKm, settings.round_trip ?? true);
  const fuelCostPerKm = computeFuelCostPerKm(
    Number(settings.fuel_price) || 0,
    Number(settings.vehicle_km_per_liter) || 10
  );

  const internalCost = Math.round(billedKm * fuelCostPerKm * 100) / 100;

  const baseFee = Number(settings.base_fee) || 0;
  const pricePerKm = Number(settings.price_per_km) || 0;
  const minFee = Number(settings.min_fee) || 0;
  const includedKm = Number(settings.included_km || 0);

  // Opção A (Franquia de KM): Se includedKm > 0, a taxa base cobre até essa distância.
  // Apenas a quilometragem que exceder a franquia é tarifada por km adicional.
  const extraKm = includedKm > 0 ? Math.max(0, Math.round((billedKm - includedKm) * 10) / 10) : billedKm;
  const rawPrice = baseFee + extraKm * pricePerKm;
  const calculatedPrice = Math.round(Math.max(rawPrice, minFee) * 100) / 100;
  const margin = Math.round((calculatedPrice - internalCost) * 100) / 100;

  return {
    oneWayKm: Math.round(oneWayKm * 10) / 10,
    billedKm,
    durationMin: durationMin !== null && durationMin !== undefined ? Math.round(durationMin) : null,
    calcMethod,
    calculatedPrice,
    internalCost,
    fuelCostPerKm: Math.round(fuelCostPerKm * 100) / 100,
    margin,
    isOutOfRadius,
    maxRadiusKm,
  };
}
