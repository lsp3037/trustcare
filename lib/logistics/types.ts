export type LogisticsLeg = 'pickup' | 'delivery';
export type LogisticsStatus = 'pendente' | 'agendada' | 'concluida' | 'descartada';
export type FuelType = 'etanol' | 'gasolina' | 'diesel' | 'gnv';
export type CalcMethod = 'route' | 'haversine';

export interface CompanyLogisticsSettings {
  company_id: string;
  base_fee: number;
  price_per_km: number;
  min_fee: number;
  max_radius_km: number;
  round_trip: boolean;
  vehicle_km_per_liter: number;
  fuel_type: FuelType;
  fuel_price: number;
  included_km?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyAddress {
  address_zip?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_district?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface DestinationAddress {
  zip?: string;
  street: string;
  number?: string;
  complement?: string;
  district?: string;
  city: string;
  state: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LogisticsPricingResult {
  oneWayKm: number;
  billedKm: number;
  durationMin: number | null;
  calcMethod: CalcMethod;
  calculatedPrice: number;
  internalCost: number;
  fuelCostPerKm: number;
  margin: number;
  isOutOfRadius: boolean;
  maxRadiusKm: number;
}

export interface ServiceOrderLogisticsLeg {
  id?: string;
  company_id?: string;
  service_order_id: string;
  leg: LogisticsLeg;
  status: LogisticsStatus;
  address_zip?: string | null;
  address_street: string;
  address_number?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_city: string;
  address_state: string;
  geocoded_label?: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  billed_km: number;
  duration_min?: number | null;
  calc_method: CalcMethod;
  base_fee: number;
  price_per_km: number;
  min_fee: number;
  fuel_price: number;
  km_per_liter: number;
  calculated_price: number;
  charged_price: number;
  internal_cost: number;
  override_reason?: string | null;
  technician_id?: string | null;
  scheduled_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
