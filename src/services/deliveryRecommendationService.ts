import type { Courier, Database, DeliveryMethod, DeliveryRecommendation, MethodEvaluation, Pharmacy, Product, ServiceArea } from '@/types';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { haversineKm, round1, roadDistanceKm, roundFee } from '@/utils/geo';
import { getDb } from './db';
import { request } from './api';

/**
 * Intelligent Delivery Engine (deterministic simulation).
 *
 * Given a destination service area, a pharmacy and the order items, every delivery method is
 * evaluated against explicit rules. Each exclusion is recorded as a human-readable reason so the
 * recommendation is explainable. Drone delivery is ONLY offered when every simulated condition is
 * met — and is always labelled as a simulation; no real aviation approvals exist.
 */

export interface RecommendationInput {
  serviceAreaId: string;
  pharmacyId: string;
  items: { productId: string; quantity: number }[];
}

export const LIMITS = {
  motorcycleMaxKg: 8,
  droneMaxKg: 2,
  pickupMinutes: 10,
  dronePickupMinutes: 5,
  busyWaitMinutes: 15,
};

const METHODS: DeliveryMethod[] = ['motorcycle', 'vehicle', 'drone'];

function roundTo5(n: number) {
  return Math.max(5, Math.round(n / 5) * 5);
}

function partnersFor(couriers: Courier[], method: DeliveryMethod, area: ServiceArea, pharmacy: Pharmacy) {
  const eligible = couriers.filter(
    (c) =>
      c.vehicleType === method &&
      c.verification === 'verified' &&
      c.availability !== 'offline' &&
      (c.serviceAreaIds.includes(area.id) || c.serviceAreaIds.includes(pharmacy.serviceAreaId))
  );
  return { available: eligible.filter((c) => c.availability === 'available'), busy: eligible.filter((c) => c.availability === 'busy') };
}

export function evaluateMethods(db: Database, input: RecommendationInput): DeliveryRecommendation {
  const area = db.serviceAreas.find((a) => a.id === input.serviceAreaId);
  const pharmacy = db.pharmacies.find((p) => p.id === input.pharmacyId);
  const lines = input.items
    .map((i) => ({ product: db.products.find((p) => p.id === i.productId), quantity: i.quantity }))
    .filter((l): l is { product: Product; quantity: number } => !!l.product);

  const checks: DeliveryRecommendation['checks'] = [];

  if (!area || !pharmacy) {
    checks.push({ label: 'Location', passed: false, detail: 'Delivery area or pharmacy could not be found.' });
    return { recommended: null, alternatives: [], excluded: [], evaluations: [], explanation: 'We could not evaluate delivery for this address.', checks, serviceAreaActive: false };
  }

  checks.push({
    label: 'Location',
    passed: area.active,
    detail: area.active ? `${area.name} is an active service area.` : `${area.name} is not yet an active service area.`,
  });

  const outOfStock = lines.filter(({ product, quantity }) => {
    const inv = db.inventory.find((i) => i.pharmacyId === pharmacy.id && i.productId === product.id);
    return !inv || !inv.available || inv.stock < quantity;
  });
  checks.push({
    label: 'Pharmacy and stock',
    passed: outOfStock.length === 0 && pharmacy.verification === 'verified' && pharmacy.acceptingOrders,
    detail:
      pharmacy.verification !== 'verified' || !pharmacy.acceptingOrders
        ? `${pharmacy.name} is not currently accepting orders.`
        : outOfStock.length
          ? `Insufficient stock for ${outOfStock.map((l) => l.product.name).join(', ')}.`
          : `${pharmacy.name} lists stock for all items (final confirmation by the pharmacy). Average preparation ${pharmacy.prepMinutes} min.`,
  });

  const totalWeight = lines.reduce((s, l) => s + l.product.weightKg * l.quantity, 0);
  const coldChain = lines.some((l) => l.product.handling === 'cold-chain');
  const fragile = lines.some((l) => l.product.handling === 'fragile');
  const rxItems = lines.filter((l) => l.product.requiresPrescription);
  const droneUnsuitable = lines.filter((l) => !l.product.droneSuitable);
  checks.push({
    label: 'Product suitability',
    passed: true,
    detail: [
      `Total weight ≈ ${round1(totalWeight)} kg.`,
      coldChain ? 'Contains a cold-chain item.' : null,
      fragile ? 'Contains a fragile item.' : null,
      rxItems.length ? `${rxItems.length} prescription item(s) — pharmacist review required before dispatch.` : null,
    ]
      .filter(Boolean)
      .join(' '),
  });

  const evaluations: MethodEvaluation[] = METHODS.map((method) => {
    const fees = db.settings.fees[method];
    const exclusions: string[] = [];
    const notes: string[] = [];
    const label = DELIVERY_METHOD_LABEL[method];

    if (!area.active) exclusions.push(`${area.name} is not an active service area.`);
    if (!fees.enabled) exclusions.push(`${label} is disabled in platform settings.`);
    if (!area.supportedMethods.includes(method)) exclusions.push(`${label} is not offered in ${area.name}.`);

    const { available, busy } = partnersFor(db.couriers, method, area, pharmacy);
    if (available.length === 0 && busy.length === 0) exclusions.push(`No ${method === 'drone' ? 'authorised demo drone operator' : `${method} partner`} is available for this route right now.`);

    if (method === 'motorcycle') {
      if (coldChain) exclusions.push('A cold-chain item needs an insulated vehicle.');
      if (totalWeight > LIMITS.motorcycleMaxKg) exclusions.push(`Order exceeds the ${LIMITS.motorcycleMaxKg} kg motorcycle load limit.`);
    }
    if (method === 'vehicle') {
      if (coldChain) notes.push('Insulated cool box for cold-chain items.');
      if (fragile) notes.push('Safer handling for fragile items.');
    }
    if (method === 'drone') {
      if (!area.droneRouteEligible) exclusions.push(`${area.name} is not part of the simulated drone route network.`);
      if (!pharmacy.droneRouteEligible) exclusions.push(`${pharmacy.name} has no simulated drone pickup point.`);
      if (droneUnsuitable.length) exclusions.push(`${droneUnsuitable.map((l) => l.product.name).join(', ')} not suitable for drone delivery (simulated rule).`);
      if (totalWeight > LIMITS.droneMaxKg) exclusions.push(`Exceeds the ${LIMITS.droneMaxKg} kg simulated drone payload.`);
      if (db.settings.droneConditions !== 'favourable') exclusions.push('Simulated operating conditions do not currently permit flights.');
      notes.push('Simulation only — no real flight approval or route safety check exists.');
    }

    const distanceKm = round1(method === 'drone' ? Math.max(0.8, haversineKm(pharmacy, area)) : roadDistanceKm(pharmacy, area));
    const fee = roundFee(area.baseFee + fees.base + Math.max(0, distanceKm - 3) * fees.perKm);
    const travel = (distanceKm / fees.speedKmh) * 60;
    const wait = available.length === 0 && busy.length > 0 ? LIMITS.busyWaitMinutes : 0;
    if (wait) notes.push('Partners are currently busy — expect a short wait.');
    if (available.length) notes.push(`${available.length} ${method === 'drone' ? 'operator' : 'partner'}${available.length > 1 ? 's' : ''} available nearby.`);
    const pickup = method === 'drone' ? LIMITS.dronePickupMinutes : LIMITS.pickupMinutes;
    const etaMin = roundTo5(pharmacy.prepMinutes + pickup + travel + wait);
    const etaMax = etaMin + (method === 'drone' ? 10 : 15);

    // Lower score is better. Motorcycle is the operational default; vehicle preferred for special handling.
    let score = (etaMin + etaMax) / 2 + fee;
    if (method === 'motorcycle') score -= 8;
    if (method === 'vehicle' && (coldChain || fragile)) score -= 20;

    return {
      method,
      eligible: exclusions.length === 0,
      fee,
      etaMinutes: { min: etaMin, max: etaMax },
      distanceKm,
      exclusions,
      notes,
      availableCouriers: available.length + busy.length,
      score: Math.round(score * 10) / 10,
      simulated: method === 'drone',
    };
  });

  const eligible = evaluations.filter((e) => e.eligible).sort((a, b) => a.score - b.score);
  const recommended = eligible[0] ?? null;
  const alternatives = eligible.slice(1);
  const excluded = evaluations.filter((e) => !e.eligible);

  checks.push({
    label: 'Delivery availability',
    passed: eligible.length > 0,
    detail: eligible.length ? `${eligible.length} eligible method(s): ${eligible.map((e) => DELIVERY_METHOD_LABEL[e.method]).join(', ')}.` : 'No delivery method is currently eligible.',
  });

  let explanation: string;
  if (!recommended) {
    explanation = 'No eligible delivery method is available for this order right now. ' + (excluded[0]?.exclusions[0] ?? '');
  } else {
    const reasons: Record<DeliveryMethod, string> = {
      motorcycle: `A suitable motorcycle courier is available within the ${area.name} service area.`,
      vehicle: coldChain || fragile ? 'A vehicle provides the handling these items need.' : 'A vehicle partner offers the best available time for this route.',
      drone: 'All simulated drone conditions are met for this route and these items.',
    };
    explanation = reasons[recommended.method];
    const drone = evaluations.find((e) => e.method === 'drone');
    if (recommended.method !== 'drone' && drone && !drone.eligible) {
      explanation += ` Drone delivery is not available for this simulated order: ${drone.exclusions[0]}`;
    }
  }
  checks.push({ label: 'Recommendation', passed: !!recommended, detail: recommended ? `${DELIVERY_METHOD_LABEL[recommended.method]} — lowest combined time/cost score.` : 'Unavailable.' });

  return { recommended, alternatives, excluded, evaluations, explanation, checks, serviceAreaActive: area.active };
}

export const deliveryRecommendationService = {
  recommend(input: RecommendationInput): Promise<DeliveryRecommendation> {
    return request(() => evaluateMethods(getDb(), input), { delay: 450 });
  },
  recommendSync(input: RecommendationInput) {
    return evaluateMethods(getDb(), input);
  },
};
