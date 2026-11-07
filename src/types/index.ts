import type { User } from './user';
import type { CartItem, Product, InventoryItem } from './product';
import type { Pharmacy, ServiceArea } from './pharmacy';
import type { Order } from './order';
import type { Delivery, Courier } from './delivery';
import type { Prescription } from './prescription';
import type { Payment } from './payment';
import type { AppNotification, SupportTicket, AuditLog, PlatformSettings } from './platform';

export * from './user';
export * from './product';
export * from './pharmacy';
export * from './order';
export * from './delivery';
export * from './prescription';
export * from './payment';
export * from './platform';

/** Every persisted collection in the simulated backend. */
export interface Database {
  users: User[];
  products: Product[];
  inventory: InventoryItem[];
  pharmacies: Pharmacy[];
  serviceAreas: ServiceArea[];
  orders: Order[];
  deliveries: Delivery[];
  couriers: Courier[];
  prescriptions: Prescription[];
  payments: Payment[];
  notifications: AppNotification[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  carts: Record<string, CartItem[]>;
  /** Saved (favourite) product ids per customer. */
  favorites: Record<string, string[]>;
  settings: PlatformSettings;
  meta: { seededAt: string; version: number; orderSequence: number; ticketSequence: number };
}
