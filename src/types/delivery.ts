import type { VerificationStatus } from './pharmacy';

export type DeliveryMethod = 'motorcycle' | 'vehicle' | 'drone';

export type CourierAvailability = 'available' | 'busy' | 'offline';

export interface Courier {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  partnerType: 'courier' | 'drone-operator';
  company?: string;
  vehicleType: DeliveryMethod;
  vehicleDescription: string;
  plate?: string;
  serviceAreaIds: string[];
  availability: CourierAvailability;
  verification: VerificationStatus;
  verificationNote?: string;
  rating: number;
  joinedAt: string;
  documents: { name: string; status: 'received' | 'missing' }[];
}

export type DeliveryStatus =
  | 'pending' // order not yet ready
  | 'open' // ready, waiting for a courier to accept
  | 'offered' // offered to a specific courier by dispatch
  | 'accepted'
  | 'at-pharmacy'
  | 'collected'
  | 'en-route'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface DeliveryEvent {
  status: DeliveryStatus;
  at: string;
  note?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  method: DeliveryMethod;
  courierId?: string;
  offeredToCourierId?: string;
  declinedBy: string[];
  status: DeliveryStatus;
  distanceKm: number;
  fee: number;
  /** Courier payout (illustrative). */
  payout: number;
  etaMinutes: { min: number; max: number };
  events: DeliveryEvent[];
  failureReason?: string;
  delayed?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Output of the Intelligent Delivery Engine for one method. */
export interface MethodEvaluation {
  method: DeliveryMethod;
  eligible: boolean;
  fee: number;
  etaMinutes: { min: number; max: number };
  distanceKm: number;
  /** Reasons a method was excluded (empty if eligible). */
  exclusions: string[];
  /** Positive factors noted for eligible methods. */
  notes: string[];
  availableCouriers: number;
  score: number;
  simulated: boolean;
}

export interface DeliveryRecommendation {
  recommended: MethodEvaluation | null;
  alternatives: MethodEvaluation[];
  excluded: MethodEvaluation[];
  evaluations: MethodEvaluation[];
  explanation: string;
  checks: { label: string; passed: boolean; detail: string }[];
  serviceAreaActive: boolean;
}
