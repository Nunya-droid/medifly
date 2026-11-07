import type { Role } from './user';

export type NotificationType =
  | 'order'
  | 'prescription'
  | 'delivery'
  | 'exception'
  | 'support'
  | 'partner'
  | 'system';

export interface AppNotification {
  id: string;
  /** Direct recipient. */
  userId?: string;
  /** Or a role-wide audience, optionally scoped to one pharmacy or courier. */
  role?: Role;
  pharmacyId?: string;
  courierId?: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export type TicketStatus = 'open' | 'in-progress' | 'awaiting-customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'delivery-delay' | 'missing-item' | 'payment' | 'prescription' | 'account' | 'other';

export interface SupportTicket {
  id: string;
  reference: string;
  customerId: string;
  orderId?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  message: string;
  assignedTo?: string;
  resolutionNotes?: string;
  messages: { from: 'customer' | 'support'; author: string; body: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | 'order.created'
  | 'order.status'
  | 'order.cancelled'
  | 'stock.updated'
  | 'product.created'
  | 'product.updated'
  | 'prescription.submitted'
  | 'prescription.reviewed'
  | 'courier.assigned'
  | 'delivery.updated'
  | 'partner.status'
  | 'payment.processed'
  | 'refund.processed'
  | 'support.updated'
  | 'service-area.updated'
  | 'settings.updated'
  | 'auth.login'
  | 'demo.reset';

export interface AuditLog {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorRole: Role | 'system';
  entityType: string;
  entityId: string;
  summary: string;
  at: string;
}

export interface MethodFee {
  base: number;
  perKm: number;
  speedKmh: number;
  enabled: boolean;
}

export interface PlatformSettings {
  fees: Record<'motorcycle' | 'vehicle' | 'drone', MethodFee>;
  /** Simulated operating conditions for the drone pilot. */
  droneConditions: 'favourable' | 'unfavourable';
  cashOnDeliveryEnabled: boolean;
  courierPayoutShare: number;
  notifyCustomersBySms: boolean;
  notifyPharmaciesOnNewOrder: boolean;
  supportPhone: string;
  supportEmail: string;
  appVersion: string;
  simulatedDelayMs: number;
}
