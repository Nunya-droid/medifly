import type { Courier } from '@/types';

const docs = (all = true) => [
  { name: 'Ghana Card copy (demo)', status: 'received' as const },
  { name: "Rider/driver licence (demo)", status: 'received' as const },
  { name: 'Vehicle insurance (demo)', status: all ? ('received' as const) : ('missing' as const) },
];

/** Fictional delivery partners. The drone operator is a simulation only — no real approvals exist. */
export function seedCouriers(now: number): Courier[] {
  const days = (n: number) => new Date(now - n * 86400000).toISOString();
  return [
    { id: 'cr-yaw', userId: 'usr-courier-yaw', name: 'Yaw Boateng', phone: '+233 24 555 0311', partnerType: 'courier', vehicleType: 'motorcycle', vehicleDescription: 'Honda Ace 125 with insulated box', plate: 'GR 4821-22', serviceAreaIds: ['sa-madina', 'sa-east-legon', 'sa-adenta', 'sa-legon'], availability: 'available', verification: 'verified', rating: 4.9, joinedAt: days(140), documents: docs() },
    { id: 'cr-kwesi', name: 'Kwesi Antwi', phone: '+233 20 555 0322', partnerType: 'courier', vehicleType: 'motorcycle', vehicleDescription: 'Bajaj Boxer 150', plate: 'GR 1733-23', serviceAreaIds: ['sa-madina', 'sa-adenta', 'sa-legon'], availability: 'available', verification: 'verified', rating: 4.7, joinedAt: days(100), documents: docs() },
    { id: 'cr-abena', name: 'Abena Owusu', phone: '+233 55 555 0333', partnerType: 'courier', vehicleType: 'motorcycle', vehicleDescription: 'TVS Apache 160', plate: 'GW 2290-24', serviceAreaIds: ['sa-osu', 'sa-airport', 'sa-east-legon'], availability: 'busy', verification: 'verified', rating: 4.8, joinedAt: days(75), documents: docs() },
    { id: 'cr-esi', name: 'Esi Mensah', phone: '+233 26 555 0344', partnerType: 'courier', company: 'Accra Swift Logistics (fictional)', vehicleType: 'vehicle', vehicleDescription: 'Toyota Vitz with cool box', plate: 'GT 7710-21', serviceAreaIds: ['sa-madina', 'sa-east-legon', 'sa-adenta', 'sa-legon', 'sa-osu', 'sa-airport'], availability: 'available', verification: 'verified', rating: 4.6, joinedAt: days(130), documents: docs() },
    { id: 'cr-skylift', name: 'SkyLift Demo Operator', phone: '+233 30 250 0900', partnerType: 'drone-operator', company: 'SkyLift Demo (fictional, simulated)', vehicleType: 'drone', vehicleDescription: 'Simulated fixed-wing drone, 2 kg payload', serviceAreaIds: ['sa-east-legon', 'sa-legon'], availability: 'available', verification: 'verified', verificationNote: 'Simulation only. No real aviation approval exists.', rating: 4.5, joinedAt: days(40), documents: [{ name: 'Operator profile (simulated)', status: 'received' }, { name: 'Route plan (simulated)', status: 'received' }] },
    { id: 'cr-kojo', name: 'Kojo Frimpong', phone: '+233 24 555 0355', partnerType: 'courier', vehicleType: 'motorcycle', vehicleDescription: 'Haojue 150', plate: 'GE 5102-25', serviceAreaIds: ['sa-madina', 'sa-adenta'], availability: 'offline', verification: 'pending', verificationNote: 'Insurance document outstanding.', rating: 0, joinedAt: days(2), documents: docs(false) },
  ];
}
