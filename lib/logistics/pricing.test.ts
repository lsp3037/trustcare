import { describe, expect, it } from 'vitest';
import {
  calculateLogisticsPricing,
  computeBilledKm,
  computeFuelCostPerKm,
  estimateRouteKmFromHaversine,
  haversineKm,
} from './pricing';

describe('Logistics Pricing', () => {
  describe('haversineKm', () => {
    it('calculates direct distance between two coordinates', () => {
      // Arrange: Two points in Cuiabá ~3.8km apart
      const origin = { latitude: -15.601, longitude: -56.0974 };
      const destination = { latitude: -15.58, longitude: -56.06 };

      // Act
      const km = haversineKm(origin, destination);

      // Assert
      expect(km).toBeGreaterThan(4);
      expect(km).toBeLessThan(6);
    });

    it('returns 0 for identical points', () => {
      // Arrange
      const pt = { latitude: -15.601, longitude: -56.0974 };

      // Act & Assert
      expect(haversineKm(pt, pt)).toBe(0);
    });
  });

  describe('estimateRouteKmFromHaversine', () => {
    it('applies 1.3 road winding factor', () => {
      // Arrange
      const directKm = 10;

      // Act
      const estimated = estimateRouteKmFromHaversine(directKm);

      // Assert
      expect(estimated).toBe(13);
    });
  });

  describe('computeFuelCostPerKm', () => {
    it('calculates user vehicle: 7 km/l with etanol at R$ 4.39', () => {
      // Arrange: R$ 4.39 / 7 = 0.62714...
      const fuelPrice = 4.39;
      const kmPerLiter = 7;

      // Act
      const costPerKm = computeFuelCostPerKm(fuelPrice, kmPerLiter);

      // Assert
      expect(costPerKm).toBeCloseTo(0.627, 3);
    });

    it('handles zero or negative inputs gracefully', () => {
      expect(computeFuelCostPerKm(0, 7)).toBe(0);
      expect(computeFuelCostPerKm(4.39, 0)).toBe(0);
      expect(computeFuelCostPerKm(-1, 7)).toBe(0);
    });
  });

  describe('computeBilledKm', () => {
    it('doubles distance for round trip', () => {
      expect(computeBilledKm(8.7, true)).toBe(17.4);
    });

    it('keeps single distance for one way', () => {
      expect(computeBilledKm(8.7, false)).toBe(8.7);
    });
  });

  describe('calculateLogisticsPricing', () => {
    const userSettings = {
      base_fee: 15.0,
      price_per_km: 2.0,
      min_fee: 25.0,
      max_radius_km: 30.0,
      round_trip: true,
      vehicle_km_per_liter: 7.0,
      fuel_price: 4.39,
    };

    it('reproduces user scenario: 8.7km, R$ 49.80 charged, R$ 10.91 cost, R$ 38.89 margin', () => {
      // Arrange & Act
      const result = calculateLogisticsPricing({
        oneWayKm: 8.7,
        durationMin: 18,
        calcMethod: 'route',
        settings: userSettings,
      });

      // Assert
      expect(result.billedKm).toBe(17.4);
      expect(result.calculatedPrice).toBe(49.8);
      expect(result.internalCost).toBeCloseTo(10.91, 2);
      expect(result.margin).toBeCloseTo(38.89, 2);
      expect(result.isOutOfRadius).toBe(false);
      expect(result.calcMethod).toBe('route');
    });

    it('enforces min_fee when base + km is below threshold', () => {
      // Arrange: 1km -> billed 2km -> 15 + 2*2 = 19 < min_fee 25
      const result = calculateLogisticsPricing({
        oneWayKm: 1.0,
        durationMin: 5,
        calcMethod: 'route',
        settings: userSettings,
      });

      // Assert
      expect(result.calculatedPrice).toBe(25.0);
      expect(result.internalCost).toBeCloseTo(1.25, 2);
      expect(result.margin).toBe(23.75);
    });

    it('detects when distance exceeds max_radius_km', () => {
      // Arrange: 35km > 30km
      const result = calculateLogisticsPricing({
        oneWayKm: 35.0,
        durationMin: 45,
        calcMethod: 'route',
        settings: userSettings,
      });

      // Assert
      expect(result.isOutOfRadius).toBe(true);
      expect(result.maxRadiusKm).toBe(30.0);
    });
  });
});
