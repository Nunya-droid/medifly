import React, { createContext, useContext } from 'react';
import { useCurrentUser, useDb } from '@/hooks/useDb';
import { usePreference } from '@/hooks/usePreference';
import type { Pharmacy } from '@/types';

interface Scope {
  pharmacyId: string;
  pharmacy: Pharmacy;
  /** Admins can switch the pharmacy they are viewing. */
  canSwitch: boolean;
  setPharmacyId: (id: string) => void;
}

const Ctx = createContext<Scope | null>(null);

export function PharmacyScopeProvider({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const user = useCurrentUser();
  const [adminChoice, setAdminChoice] = usePreference<string>('admin-pharmacy', 'ph-community');
  const isAdmin = user?.role === 'admin';
  const pharmacyId = isAdmin ? adminChoice : user?.pharmacyId ?? '';
  const pharmacy = db.pharmacies.find((p) => p.id === pharmacyId) ?? db.pharmacies[0];
  return <Ctx.Provider value={{ pharmacyId: pharmacy.id, pharmacy, canSwitch: isAdmin, setPharmacyId: setAdminChoice }}>{children}</Ctx.Provider>;
}

export function usePharmacyScope() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePharmacyScope must be used within PharmacyScopeProvider');
  return c;
}
