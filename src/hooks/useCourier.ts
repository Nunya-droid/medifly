import { useMemo } from 'react';
import { useCurrentUser, useDb } from './useDb';
import { ACTIVE_DELIVERY, deliveriesForCourier, jobsForCourier } from '@/services/deliveryService';
import { getCourierAnalytics } from '@/services/analyticsService';

export function useCourier() {
  const db = useDb();
  const user = useCurrentUser();
  const courierId = user?.courierId ?? '';
  const courier = db.couriers.find((c) => c.id === courierId);
  const jobs = useMemo(() => jobsForCourier(db, courierId), [db, courierId]);
  const mine = useMemo(() => deliveriesForCourier(db, courierId), [db, courierId]);
  const active = mine.filter((v) => ACTIVE_DELIVERY.includes(v.delivery.status));
  const history = mine.filter((v) => !ACTIVE_DELIVERY.includes(v.delivery.status));
  const stats = useMemo(() => getCourierAnalytics(db, courierId), [db, courierId]);
  return { db, user, courier, jobs, active, history, stats };
}
