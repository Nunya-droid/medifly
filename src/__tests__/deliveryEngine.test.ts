/// <reference types="jest" />
import { storageService } from '@/services/storageService';
import { setSimulatedLatency } from '@/services/api';
import { commit, getDb, resetDb } from '@/services/db';
import { evaluateMethods } from '@/services/deliveryRecommendationService';

beforeEach(() => {
  storageService.useMemoryStore();
  setSimulatedLatency(false);
  resetDb();
});

describe('Intelligent Delivery Engine', () => {
  it('recommends a motorcycle in Madina and explains why drone is unavailable', () => {
    const r = evaluateMethods(getDb(), { serviceAreaId: 'sa-madina', pharmacyId: 'ph-community', items: [{ productId: 'prd-paracetamol', quantity: 1 }] });
    expect(r.recommended?.method).toBe('motorcycle');
    expect(r.recommended?.fee).toBe(12);
    const drone = r.evaluations.find((e) => e.method === 'drone')!;
    expect(drone.eligible).toBe(false);
    expect(drone.exclusions.join(' ')).toMatch(/not offered in Madina/);
    expect(r.explanation).toMatch(/Drone delivery is not available/);
  });

  it('offers drone only when every simulated condition is met', () => {
    const r = evaluateMethods(getDb(), { serviceAreaId: 'sa-east-legon', pharmacyId: 'ph-east-legon', items: [{ productId: 'prd-paracetamol', quantity: 1 }] });
    const drone = r.evaluations.find((e) => e.method === 'drone')!;
    expect(drone.eligible).toBe(true);
    expect(drone.simulated).toBe(true);
    // Motorcycle remains the operational default when eligible.
    expect(r.recommended?.method).toBe('motorcycle');
    expect(r.alternatives.map((a) => a.method)).toContain('drone');
  });

  it('excludes drone for prescription items, heavy items and unfavourable conditions', () => {
    const base = { serviceAreaId: 'sa-east-legon', pharmacyId: 'ph-east-legon' };
    const rx = evaluateMethods(getDb(), { ...base, items: [{ productId: 'prd-insulin', quantity: 1 }] });
    expect(rx.evaluations.find((e) => e.method === 'drone')!.eligible).toBe(false);

    const heavy = evaluateMethods(getDb(), { ...base, items: [{ productId: 'prd-bp-monitor', quantity: 2 }] });
    expect(heavy.evaluations.find((e) => e.method === 'drone')!.exclusions.join(' ')).toMatch(/payload|not suitable/);

    commit({ settings: { ...getDb().settings, droneConditions: 'unfavourable' } });
    const weather = evaluateMethods(getDb(), { ...base, items: [{ productId: 'prd-paracetamol', quantity: 1 }] });
    expect(weather.evaluations.find((e) => e.method === 'drone')!.exclusions.join(' ')).toMatch(/operating conditions/);
  });

  it('routes cold-chain items to a vehicle', () => {
    const r = evaluateMethods(getDb(), { serviceAreaId: 'sa-east-legon', pharmacyId: 'ph-east-legon', items: [{ productId: 'prd-insulin', quantity: 1 }] });
    expect(r.evaluations.find((e) => e.method === 'motorcycle')!.eligible).toBe(false);
    expect(r.recommended?.method).toBe('vehicle');
  });

  it('falls back to ground delivery when no courier of a type is available', () => {
    const db = getDb();
    commit({ couriers: db.couriers.map((c) => (c.vehicleType === 'motorcycle' ? { ...c, availability: 'offline' } : c)) });
    const r = evaluateMethods(getDb(), { serviceAreaId: 'sa-madina', pharmacyId: 'ph-community', items: [{ productId: 'prd-paracetamol', quantity: 1 }] });
    expect(r.recommended?.method).toBe('vehicle');
    expect(r.excluded.find((e) => e.method === 'motorcycle')!.exclusions.join(' ')).toMatch(/No motorcycle partner/);
  });

  it('returns no recommendation for inactive service areas', () => {
    const r = evaluateMethods(getDb(), { serviceAreaId: 'sa-tema', pharmacyId: 'ph-community', items: [{ productId: 'prd-paracetamol', quantity: 1 }] });
    expect(r.recommended).toBeNull();
    expect(r.serviceAreaActive).toBe(false);
  });
});
