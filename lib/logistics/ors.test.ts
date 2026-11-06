import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateRouteDistance, formatAddressQuery, formatGeocodeQuery, geocodeAddress, _clearCacheForTesting } from './ors';

describe('OpenRouteService Client & Fallbacks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    _clearCacheForTesting();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('formatAddressQuery', () => {
    it('formats a complete Brazilian address string', () => {
      // Arrange
      const addr = {
        street: 'Avenida Paulista',
        number: '1578',
        district: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zip: '01310-200',
      };

      // Act
      const formatted = formatAddressQuery(addr);

      // Assert
      expect(formatted).toBe('Avenida Paulista, 1578 - Bela Vista - São Paulo - SP - 01310-200 - Brasil');
    });

    it('formats an address without optional fields', () => {
      // Arrange
      const addr = {
        street: 'Rua das Flores',
        city: 'Cuiabá',
        state: 'MT',
      };

      // Act
      const formatted = formatAddressQuery(addr);

      // Assert
      expect(formatted).toBe('Rua das Flores - Cuiabá - MT - Brasil');
    });
  });

  describe('calculateRouteDistance', () => {
    const origin = { latitude: -15.601, longitude: -56.0974 };
    const dest = { latitude: -15.58, longitude: -56.06 };

    it('falls back to haversine when LOGISTICS_DISTANCE_MODE is haversine', async () => {
      // Arrange
      process.env.LOGISTICS_DISTANCE_MODE = 'haversine';
      process.env.ORS_API_KEY = 'test-key';

      // Act
      const res = await calculateRouteDistance(origin, dest);

      // Assert
      expect(res.method).toBe('haversine');
      expect(res.distanceKm).toBeGreaterThan(0);
      expect(res.durationMin).toBeNull();
    });

    it('falls back to haversine when ORS_API_KEY is not set', async () => {
      // Arrange
      delete process.env.ORS_API_KEY;

      // Act
      const res = await calculateRouteDistance(origin, dest);

      // Assert
      expect(res.method).toBe('haversine');
      expect(res.distanceKm).toBeGreaterThan(0);
    });

    it('uses ORS route when API succeeds', async () => {
      // Arrange
      process.env.ORS_API_KEY = 'valid-key';
      process.env.LOGISTICS_DISTANCE_MODE = 'route';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              summary: {
                distance: 8700, // 8.7 km
                duration: 1080, // 18 min
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      // Act
      const res = await calculateRouteDistance(origin, dest);

      // Assert
      expect(res.method).toBe('route');
      expect(res.distanceKm).toBe(8.7);
      expect(res.durationMin).toBe(18);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('falls back to haversine when ORS API returns 429 rate limit error', async () => {
      // Arrange
      process.env.ORS_API_KEY = 'valid-key';
      delete process.env.LOGISTICS_DISTANCE_MODE;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      // Act
      const res = await calculateRouteDistance(origin, dest);

      // Assert
      expect(res.method).toBe('haversine');
      expect(res.distanceKm).toBeGreaterThan(0);
    });
  });

  describe('geocodeAddress', () => {
    it('returns null when LOGISTICS_DISTANCE_MODE is haversine', async () => {
      // Arrange
      process.env.LOGISTICS_DISTANCE_MODE = 'haversine';
      process.env.ORS_API_KEY = 'test-key';

      // Act
      const res = await geocodeAddress({ street: 'Rua A', city: 'Cuiabá', state: 'MT' });

      // Assert
      expect(res).toBeNull();
    });

    it('parses coordinates from Pelias feature', async () => {
      // Arrange
      process.env.ORS_API_KEY = 'valid-key';
      delete process.env.LOGISTICS_DISTANCE_MODE;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            {
              geometry: { coordinates: [-56.0764, -15.5795] }, // [lon, lat]
              properties: { label: 'Av. Historiador Rubens de Mendonça, Cuiabá, MT' },
            },
          ],
        }),
      });

      // Act
      const res = await geocodeAddress({ street: 'Av. Rubens', city: 'Cuiabá', state: 'MT' });

      // Assert
      expect(res).not.toBeNull();
      expect(res?.coordinates.latitude).toBe(-15.5795);
      expect(res?.coordinates.longitude).toBe(-56.0764);
      expect(res?.label).toContain('Cuiabá');
    });

    it('passes bias focus.point to Pelias when provided', async () => {
      // Arrange
      process.env.ORS_API_KEY = 'valid-key';
      delete process.env.LOGISTICS_DISTANCE_MODE;

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            {
              geometry: { coordinates: [-56.0999, -15.5834] },
              properties: { label: 'Rua Estevão de Mendonça, Cuiabá, MT', layer: 'street' },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const bias = { latitude: -15.5622, longitude: -56.0885 };

      // Act
      const res = await geocodeAddress({ street: 'Rua Estevão de Mendonça', number: '891', city: 'Cuiabá', state: 'MT' }, bias);

      // Assert
      expect(res).not.toBeNull();
      expect(res?.coordinates.latitude).toBe(-15.5834);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('focus.point.lat=-15.5622'),
        expect.anything()
      );
    });

    it('falls back to BrasilAPI when Pelias has no features and CEP is present', async () => {
      // Arrange
      process.env.ORS_API_KEY = 'valid-key';
      delete process.env.LOGISTICS_DISTANCE_MODE;

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ features: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            cep: '78043580',
            state: 'MT',
            city: 'Cuiabá',
            neighborhood: 'Quilombo',
            street: 'Rua Estevão de Mendonça',
            location: {
              coordinates: {
                latitude: '-15.59611',
                longitude: '-56.09667',
              },
            },
          }),
        });
      global.fetch = mockFetch;

      // Act
      const res = await geocodeAddress({
        street: 'Rua Desconhecida',
        city: 'Cuiabá',
        state: 'MT',
        zip: '78043-580',
      });

      // Assert
      expect(res).not.toBeNull();
      expect(res?.coordinates.latitude).toBe(-15.59611);
      expect(res?.coordinates.longitude).toBe(-56.09667);
      expect(res?.label).toContain('Quilombo');
    });
  });
});
