import type { OpeningHours, Pharmacy, ServiceArea } from '@/types';

/** Fictional service areas in Accra. Coordinates are approximate and for simulation only. */
export function seedServiceAreas(): ServiceArea[] {
  return [
    { id: 'sa-madina', name: 'Madina', city: 'Accra', region: 'Greater Accra', lat: 5.6837, lng: -0.1657, active: true, supportedMethods: ['motorcycle', 'vehicle'], droneRouteEligible: false, baseFee: 12, etaRange: { min: 35, max: 50 }, notes: 'Pilot launch area.' },
    { id: 'sa-east-legon', name: 'East Legon', city: 'Accra', region: 'Greater Accra', lat: 5.635, lng: -0.159, active: true, supportedMethods: ['motorcycle', 'vehicle', 'drone'], droneRouteEligible: true, baseFee: 14, etaRange: { min: 30, max: 45 }, notes: 'Included in the simulated drone scenario.' },
    { id: 'sa-adenta', name: 'Adenta', city: 'Accra', region: 'Greater Accra', lat: 5.706, lng: -0.153, active: true, supportedMethods: ['motorcycle', 'vehicle'], droneRouteEligible: false, baseFee: 13, etaRange: { min: 40, max: 60 } },
    { id: 'sa-legon', name: 'Legon', city: 'Accra', region: 'Greater Accra', lat: 5.6508, lng: -0.187, active: true, supportedMethods: ['motorcycle', 'vehicle', 'drone'], droneRouteEligible: true, baseFee: 13, etaRange: { min: 30, max: 50 }, notes: 'Campus area; simulated drone drop point.' },
    { id: 'sa-osu', name: 'Osu', city: 'Accra', region: 'Greater Accra', lat: 5.556, lng: -0.182, active: true, supportedMethods: ['motorcycle', 'vehicle'], droneRouteEligible: false, baseFee: 16, etaRange: { min: 45, max: 70 } },
    { id: 'sa-airport', name: 'Airport Residential', city: 'Accra', region: 'Greater Accra', lat: 5.604, lng: -0.18, active: true, supportedMethods: ['motorcycle', 'vehicle'], droneRouteEligible: false, baseFee: 15, etaRange: { min: 35, max: 55 }, notes: 'Drone excluded near airport airspace (simulated rule).' },
    { id: 'sa-tema', name: 'Tema', city: 'Tema', region: 'Greater Accra', lat: 5.6698, lng: -0.0166, active: false, supportedMethods: ['vehicle'], droneRouteEligible: false, baseFee: 25, etaRange: { min: 60, max: 90 }, notes: 'Planned expansion — not yet active.' },
  ];
}

const weekday = (open: string, close: string): OpeningHours[] =>
  (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map((day) => ({ day, open, close, closed: false }));

function hours(week: [string, string], sat: [string, string], sun: [string, string] | null): OpeningHours[] {
  return [
    ...weekday(week[0], week[1]),
    { day: 'Sat', open: sat[0], close: sat[1], closed: false },
    sun ? { day: 'Sun', open: sun[0], close: sun[1], closed: false } : { day: 'Sun', open: '00:00', close: '00:00', closed: true },
  ];
}

const docs = (all = true) => [
  { name: 'Pharmacy registration (demo)', status: 'received' as const },
  { name: 'Superintendent pharmacist details (demo)', status: 'received' as const },
  { name: 'Premises photos (demo)', status: all ? ('received' as const) : ('missing' as const) },
];

/** Fictional demonstration pharmacies — not claims of real partnerships. */
export function seedPharmacies(now: number): Pharmacy[] {
  const days = (n: number) => new Date(now - n * 86400000).toISOString();
  return [
    { id: 'ph-community', name: 'Community Pharmacy', serviceAreaId: 'sa-madina', address: '14 Zongo Junction Road, Madina', landmark: 'Opposite Madina Market', phone: '+233 30 250 1001', email: 'community@pharmacy.demo', lat: 5.6812, lng: -0.1672, licenceRef: 'DEMO-PH-0001', superintendent: 'Kwame Asante (fictional)', verification: 'verified', prepMinutes: 15, droneRouteEligible: false, openingHours: hours(['08:00', '21:00'], ['09:00', '20:00'], ['12:00', '18:00']), rating: 4.8, joinedAt: days(210), documents: docs(), acceptingOrders: true },
    { id: 'ph-madina-care', name: 'Madina Care Pharmacy', serviceAreaId: 'sa-madina', address: '3 Redco Flats Road, Madina', landmark: 'Near Madina Police Station', phone: '+233 30 250 1002', email: 'madinacare@pharmacy.demo', lat: 5.6889, lng: -0.1618, licenceRef: 'DEMO-PH-0002', superintendent: 'Akosua Ofori (fictional)', verification: 'verified', prepMinutes: 20, droneRouteEligible: false, openingHours: hours(['07:30', '22:00'], ['08:00', '22:00'], ['10:00', '20:00']), rating: 4.6, joinedAt: days(180), documents: docs(), acceptingOrders: true },
    { id: 'ph-east-legon', name: 'East Legon Pharmacy', serviceAreaId: 'sa-east-legon', address: '22 Lagos Avenue, East Legon', landmark: 'Close to A&C Mall', phone: '+233 30 250 1003', email: 'eastlegon@pharmacy.demo', lat: 5.6367, lng: -0.1611, licenceRef: 'DEMO-PH-0003', superintendent: 'Nana Yeboah (fictional)', verification: 'verified', prepMinutes: 15, droneRouteEligible: true, openingHours: hours(['08:00', '21:00'], ['09:00', '21:00'], ['12:00', '19:00']), rating: 4.9, joinedAt: days(150), documents: docs(), acceptingOrders: true },
    { id: 'ph-adenta', name: 'Adenta Health Pharmacy', serviceAreaId: 'sa-adenta', address: '7 Frafraha Road, Adenta', landmark: 'Adenta Barrier', phone: '+233 30 250 1004', email: 'adenta@pharmacy.demo', lat: 5.7041, lng: -0.1561, licenceRef: 'DEMO-PH-0004', superintendent: 'Esi Quaye (fictional)', verification: 'verified', prepMinutes: 25, droneRouteEligible: false, openingHours: hours(['08:00', '20:00'], ['09:00', '18:00'], null), rating: 4.5, joinedAt: days(120), documents: docs(), acceptingOrders: true },
    { id: 'ph-airport', name: 'Airport Pharmacy', serviceAreaId: 'sa-airport', address: '5 Volta Street, Airport Residential', landmark: 'Behind Airport Shell', phone: '+233 30 250 1005', email: 'airport@pharmacy.demo', lat: 5.6052, lng: -0.1789, licenceRef: 'DEMO-PH-0005', superintendent: 'Kojo Mensah (fictional)', verification: 'verified', prepMinutes: 20, droneRouteEligible: false, openingHours: hours(['08:00', '22:00'], ['08:00', '22:00'], ['10:00', '20:00']), rating: 4.7, joinedAt: days(90), documents: docs(), acceptingOrders: true },
    { id: 'ph-osu-wellness', name: 'Osu Wellness Pharmacy', serviceAreaId: 'sa-osu', address: '41 Oxford Street, Osu', landmark: 'Near Danquah Circle', phone: '+233 30 250 1006', email: 'osuwellness@pharmacy.demo', lat: 5.5571, lng: -0.1812, licenceRef: 'DEMO-PH-0006', superintendent: 'Adjoa Badu (fictional)', verification: 'pending', verificationNote: 'Awaiting premises photos.', prepMinutes: 20, droneRouteEligible: false, openingHours: hours(['08:00', '20:00'], ['09:00', '18:00'], null), rating: 0, joinedAt: days(3), documents: docs(false), acceptingOrders: false },
  ];
}
