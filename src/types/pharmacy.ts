export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface OpeningHours {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  open: string; // "08:00"
  close: string; // "21:00"
  closed: boolean;
}

export interface Pharmacy {
  id: string;
  name: string;
  serviceAreaId: string;
  address: string;
  landmark: string;
  phone: string;
  email: string;
  lat: number;
  lng: number;
  /** Fictional registration reference for the demo. */
  licenceRef: string;
  superintendent: string;
  verification: VerificationStatus;
  verificationNote?: string;
  /** Average preparation time in minutes. */
  prepMinutes: number;
  /** Whether this pharmacy has a simulated drone pickup pad / eligible route. */
  droneRouteEligible: boolean;
  openingHours: OpeningHours[];
  rating: number;
  joinedAt: string;
  documents: { name: string; status: 'received' | 'missing' }[];
  acceptingOrders: boolean;
}

export interface ServiceArea {
  id: string;
  name: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  active: boolean;
  supportedMethods: ('motorcycle' | 'vehicle' | 'drone')[];
  /** Simulated: area is part of the drone pilot (fictional). */
  droneRouteEligible: boolean;
  baseFee: number;
  etaRange: { min: number; max: number };
  notes?: string;
}
