import type { OrderStatus, DeliveryStatus, PrescriptionStatus, PaymentStatus, TicketStatus, VerificationStatus, TicketPriority } from '@/types';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'teal' | 'violet';

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone; description: string }> = {
  placed: { label: 'Order placed', tone: 'info', description: 'Your order has been received.' },
  'awaiting-pharmacy': { label: 'Awaiting pharmacy', tone: 'warning', description: 'The pharmacy is checking stock.' },
  'pharmacy-confirmed': { label: 'Pharmacy confirmed', tone: 'info', description: 'Stock confirmed by the pharmacy.' },
  preparing: { label: 'Preparing', tone: 'violet', description: 'The pharmacy is preparing your order.' },
  'ready-for-collection': { label: 'Ready for collection', tone: 'teal', description: 'Packed and waiting for a courier.' },
  'courier-assigned': { label: 'Courier assigned', tone: 'teal', description: 'A courier is heading to the pharmacy.' },
  collected: { label: 'Collected', tone: 'teal', description: 'The courier has collected your order.' },
  'en-route': { label: 'En route', tone: 'info', description: 'Your order is on the way.' },
  delivered: { label: 'Delivered', tone: 'success', description: 'Order handed over.' },
  rejected: { label: 'Rejected', tone: 'danger', description: 'The pharmacy could not fulfil this order.' },
  cancelled: { label: 'Cancelled', tone: 'neutral', description: 'This order was cancelled.' },
  'delivery-failed': { label: 'Delivery failed', tone: 'danger', description: 'The delivery could not be completed.' },
};

/** The happy-path progression shown on tracking timelines. */
export const ORDER_FLOW: OrderStatus[] = [
  'placed',
  'awaiting-pharmacy',
  'pharmacy-confirmed',
  'preparing',
  'ready-for-collection',
  'courier-assigned',
  'collected',
  'en-route',
  'delivered',
];

/** Allowed order status transitions. Anything else is rejected by orderService. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['awaiting-pharmacy', 'cancelled'],
  'awaiting-pharmacy': ['pharmacy-confirmed', 'rejected', 'cancelled'],
  'pharmacy-confirmed': ['preparing', 'rejected', 'cancelled'],
  preparing: ['ready-for-collection', 'cancelled'],
  'ready-for-collection': ['courier-assigned', 'cancelled'],
  'courier-assigned': ['collected', 'ready-for-collection'],
  collected: ['en-route', 'delivery-failed'],
  'en-route': ['delivered', 'delivery-failed'],
  delivered: [],
  rejected: [],
  cancelled: [],
  'delivery-failed': ['ready-for-collection', 'cancelled'],
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'awaiting-pharmacy',
  'pharmacy-confirmed',
  'preparing',
  'ready-for-collection',
  'courier-assigned',
  'collected',
  'en-route',
];

export const CLOSED_ORDER_STATUSES: OrderStatus[] = ['delivered', 'rejected', 'cancelled', 'delivery-failed'];

export const DELIVERY_STATUS: Record<DeliveryStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Awaiting preparation', tone: 'neutral' },
  open: { label: 'Open job', tone: 'warning' },
  offered: { label: 'Offered', tone: 'violet' },
  accepted: { label: 'Accepted', tone: 'info' },
  'at-pharmacy': { label: 'At pharmacy', tone: 'info' },
  collected: { label: 'Collected', tone: 'teal' },
  'en-route': { label: 'En route', tone: 'teal' },
  delivered: { label: 'Delivered', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const PRESCRIPTION_STATUS: Record<PrescriptionStatus | 'not-required', { label: string; tone: Tone }> = {
  pending: { label: 'Review pending', tone: 'warning' },
  approved: { label: 'Approved (demo)', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  'info-requested': { label: 'Info requested', tone: 'violet' },
  'not-required': { label: 'Not required', tone: 'neutral' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  paid: { label: 'Paid (simulated)', tone: 'success' },
  failed: { label: 'Failed / void', tone: 'danger' },
  'refund-requested': { label: 'Refund requested', tone: 'violet' },
  refunded: { label: 'Refunded', tone: 'neutral' },
  'cash-due': { label: 'Cash on delivery', tone: 'info' },
};

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'warning' },
  'in-progress': { label: 'In progress', tone: 'info' },
  'awaiting-customer': { label: 'Awaiting customer', tone: 'violet' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

export const TICKET_PRIORITY: Record<TicketPriority, { label: string; tone: Tone }> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
  urgent: { label: 'Urgent', tone: 'danger' },
};

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending review', tone: 'warning' },
  verified: { label: 'Verified (demo)', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'neutral' },
};
