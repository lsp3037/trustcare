import {
  estimateRouteKmFromHaversine,
  haversineKm,
} from './pricing';
import type { CalcMethod, Coordinates, DestinationAddress } from './types';

const ORS_BASE_URL = 'https://api.heigit.org';
const TIMEOUT_MS = 5000;

interface GeocodeCacheEntry {
  coordinates: Coordinates;
  label: string;
  cachedAt: number;
}

interface RouteCacheEntry {
  distanceKm: number;
  durationMin: number | null;
  cachedAt: number;
}

const geocodeCache = new Map<string, GeocodeCacheEntry>();
const routeCache = new Map<string, RouteCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export function _clearCacheForTesting() {
  geocodeCache.clear();
  routeCache.clear();
}

function pruneCache() {
  const now = Date.now();
  if (geocodeCache.size > 500) {
    for (const [k, v] of geocodeCache) {
      if (now - v.cachedAt > CACHE_TTL_MS) geocodeCache.delete(k);
    }
  }
  if (routeCache.size > 500) {
    for (const [k, v] of routeCache) {
      if (now - v.cachedAt > CACHE_TTL_MS) routeCache.delete(k);
    }
  }
}

export function formatAddressQuery(addr: DestinationAddress): string {
  const parts: string[] = [];
  if (addr.street) {
    const st = addr.number ? `${addr.street}, ${addr.number}` : addr.street;
    parts.push(st);
  }
  if (addr.district) parts.push(addr.district);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  if (addr.zip) parts.push(addr.zip);
  parts.push('Brasil');
  return parts.filter(Boolean).join(' - ');
}

export function formatGeocodeQuery(addr: DestinationAddress): string {
  // Brazilian address geocoding: Pelias libpostal breaks if Bairro or CEP is included.
  // Street + number + city + state provides high-precision OSM results.
  const parts: string[] = [];
  if (addr.street) {
    const st = addr.number ? `${addr.street}, ${addr.number}` : addr.street;
    parts.push(st);
  }
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  parts.push('Brasil');
  return parts.filter(Boolean).join(', ');
}

export async function geocodeAddress(
  address: DestinationAddress,
  bias?: Coordinates
): Promise<{ coordinates: Coordinates; label: string } | null> {
  const query = formatGeocodeQuery(address);
  const cacheKey = `${query}|bias:${bias ? `${bias.latitude.toFixed(3)},${bias.longitude.toFixed(3)}` : 'none'}`.toLowerCase().trim();

  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { coordinates: cached.coordinates, label: cached.label };
  }

  const apiKey = process.env.ORS_API_KEY?.trim();
  if (!apiKey || process.env.LOGISTICS_DISTANCE_MODE === 'haversine') {
    return null;
  }

  // 1. Try Pelias search with bias (focus.point)
  try {
    const searchParams: Record<string, string> = {
      text: query,
      'boundary.country': 'BR',
      size: '3',
    };
    if (bias?.latitude && bias?.longitude) {
      searchParams['focus.point.lat'] = bias.latitude.toString();
      searchParams['focus.point.lon'] = bias.longitude.toString();
    }

    const url = `${ORS_BASE_URL}/pelias/v1/search?` + new URLSearchParams(searchParams);
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      const data = await res.json();
      const features = data?.features || [];
      const best = features.find((f: any) => {
        const layer = f.properties?.layer;
        const confidence = f.properties?.confidence ?? 0;
        return layer === 'street' || layer === 'address' || layer === 'venue' || confidence >= 0.7;
      }) || features[0];

      if (best?.geometry?.coordinates) {
        const [lon, lat] = best.geometry.coordinates;
        const layer = best.properties?.layer;
        const confidence = best.properties?.confidence ?? 0;

        if (layer === 'street' || layer === 'address' || layer === 'venue' || confidence >= 0.7 || !address.zip) {
          const coordinates = { latitude: lat, longitude: lon };
          const label = best.properties?.label || query;
          pruneCache();
          geocodeCache.set(cacheKey, { coordinates, label, cachedAt: Date.now() });
          return { coordinates, label };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[ORS Geocode] Falha no Pelias: ${err?.message || err}`);
  }

  // 2. Fallback: BrasilAPI CEP v2
  const cleanZip = (address.zip || '').replace(/\D/g, '');
  if (cleanZip.length === 8) {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanZip}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        const lat = Number(data?.location?.coordinates?.latitude);
        const lon = Number(data?.location?.coordinates?.longitude);
        if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
          const coordinates = { latitude: lat, longitude: lon };
          const label = `${address.street || data.street || ''}${address.number ? ', ' + address.number : ''}, ${data.neighborhood || address.district || ''}, ${data.city || address.city} - ${data.state || address.state}`;
          pruneCache();
          geocodeCache.set(cacheKey, { coordinates, label, cachedAt: Date.now() });
          return { coordinates, label };
        }
      }
    } catch (err: any) {
      console.warn(`[ORS Geocode] Falha no BrasilAPI: ${err?.message || err}`);
    }
  }

  // 3. Fallback: Nominatim OSM
  try {
    const url = 'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        countrycodes: 'br',
      });
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TrustCare/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]?.lat && data?.[0]?.lon) {
        const coordinates = { latitude: Number(data[0].lat), longitude: Number(data[0].lon) };
        const label = data[0].display_name || query;
        pruneCache();
        geocodeCache.set(cacheKey, { coordinates, label, cachedAt: Date.now() });
        return { coordinates, label };
      }
    }
  } catch (err: any) {
    console.warn(`[ORS Geocode] Falha no Nominatim: ${err?.message || err}`);
  }

  return null;
}

export async function calculateRouteDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<{
  distanceKm: number;
  durationMin: number | null;
  method: CalcMethod;
}> {
  const apiKey = process.env.ORS_API_KEY?.trim();
  const directDistance = haversineKm(origin, destination);

  if (!apiKey || process.env.LOGISTICS_DISTANCE_MODE === 'haversine') {
    return {
      distanceKm: estimateRouteKmFromHaversine(directDistance),
      durationMin: null,
      method: 'haversine',
    };
  }

  const cacheKey = `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}->${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return {
      distanceKm: cached.distanceKm,
      durationMin: cached.durationMin,
      method: 'route',
    };
  }

  try {
    const url = `${ORS_BASE_URL}/openrouteservice/v2/directions/driving-car`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`[ORS Directions] API status ${res.status}, usando Haversine`);
      return {
        distanceKm: estimateRouteKmFromHaversine(directDistance),
        durationMin: null,
        method: 'haversine',
      };
    }

    const data = await res.json();
    const route = data?.routes?.[0]?.summary;
    if (!route || typeof route.distance !== 'number') {
      return {
        distanceKm: estimateRouteKmFromHaversine(directDistance),
        durationMin: null,
        method: 'haversine',
      };
    }

    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMin =
      typeof route.duration === 'number'
        ? Math.round(route.duration / 60)
        : null;

    pruneCache();
    routeCache.set(cacheKey, {
      distanceKm,
      durationMin,
      cachedAt: Date.now(),
    });

    return {
      distanceKm,
      durationMin,
      method: 'route',
    };
  } catch (err: any) {
    console.warn(`[ORS Directions] Erro (${err?.message}), usando Haversine`);
    return {
      distanceKm: estimateRouteKmFromHaversine(directDistance),
      durationMin: null,
      method: 'haversine',
    };
  }
}
