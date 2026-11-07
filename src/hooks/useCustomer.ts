import { useMemo } from 'react';
import { useCurrentUser, useDb } from './useDb';
import { usePreference } from './usePreference';
import { cartCount, selectCart } from '@/services/cartService';

/** Customer context: selected delivery address (persisted per browser), cart and service area. */
export function useCustomer() {
  const db = useDb();
  const user = useCurrentUser();
  const addresses = user?.addresses ?? [];
  const [selectedId, setSelectedId] = usePreference<string | null>(`address:${user?.id ?? 'anon'}`, null);
  const selected = addresses.find((a) => a.id === selectedId) ?? addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const serviceArea = db.serviceAreas.find((a) => a.id === selected?.serviceAreaId) ?? db.serviceAreas.find((a) => a.id === 'sa-madina')!;
  const cart = useMemo(() => selectCart(db, user?.id), [db, user?.id]);
  const count = cartCount(db, user?.id);
  return { db, user, addresses, selected, setSelectedId, serviceArea, cart, cartCount: count };
}
