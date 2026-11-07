import type { Database } from '@/types';
import { seedUsers } from './seedUsers';
import { seedProducts, seedInventory } from './seedProducts';
import { seedPharmacies, seedServiceAreas } from './seedPharmacies';
import { seedCouriers } from './seedCouriers';
import { seedOrders } from './seedOrders';
import { seedNotifications, seedTickets, seedAuditLogs, seedSettings } from './seedNotifications';

export const DB_VERSION = 1;

/** Builds a fresh, fully fictional demo dataset relative to `now` so "today" metrics are meaningful. */
export function buildSeedDatabase(now: number = Date.now()): Database {
  const users = seedUsers(now);
  const products = seedProducts(now);
  const inventory = seedInventory(now);
  const pharmacies = seedPharmacies(now);
  const serviceAreas = seedServiceAreas();
  const couriers = seedCouriers(now);
  const { orders, deliveries, payments, prescriptions, nextSequence } = seedOrders(now, { users, products, inventory, pharmacies, serviceAreas });

  return {
    users,
    products,
    inventory,
    pharmacies,
    serviceAreas,
    couriers,
    orders,
    deliveries,
    payments,
    prescriptions,
    notifications: seedNotifications(now, orders),
    tickets: seedTickets(now, orders),
    auditLogs: seedAuditLogs(now, orders),
    carts: {
      'usr-customer-ama': [{ productId: 'prd-vitamin-c', pharmacyId: 'ph-community', quantity: 1, addedAt: new Date(now - 3600000).toISOString() }],
    },
    favorites: { 'usr-customer-ama': ['prd-vitamin-c', 'prd-thermometer', 'prd-ors'] },
    settings: seedSettings(),
    meta: { seededAt: new Date(now).toISOString(), version: DB_VERSION, orderSequence: nextSequence, ticketSequence: 2044 },
  };
}
