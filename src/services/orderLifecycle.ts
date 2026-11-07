import type { AppNotification, AuditLog, Database, Delivery, DeliveryStatus, Order, OrderStatus, Payment, User } from '@/types';
import { ORDER_STATUS, ORDER_TRANSITIONS } from '@/constants/status';
import { ServiceError, nowIso } from './api';
import { auditEntry } from './auditService';
import { buildNotifications } from './notificationService';

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}

export interface TransitionOptions {
  note?: string;
  /** Delivery status to set alongside the order change. */
  deliveryStatus?: DeliveryStatus;
  deliveryPatch?: Partial<Delivery>;
}

/**
 * Applies a validated order status change and every side effect, returning a database patch.
 * This is the single source of truth for the order lifecycle shared by all roles.
 */
export function transitionOrder(db: Database, orderId: string, to: OrderStatus, actor: User | null, opts: TransitionOptions = {}): Partial<Database> {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new ServiceError('NOT_FOUND', 'Order not found.');
  if (!canTransition(order.status, to)) {
    throw new ServiceError('INVALID_TRANSITION', `Cannot move order from "${ORDER_STATUS[order.status].label}" to "${ORDER_STATUS[to].label}".`);
  }

  // Safety rule: prescription-only items never progress without an approved (demo) review.
  const needsApproval: OrderStatus[] = ['pharmacy-confirmed', 'preparing', 'ready-for-collection', 'courier-assigned', 'collected', 'en-route', 'delivered'];
  if (order.requiresPrescription && order.prescriptionStatus !== 'approved' && needsApproval.includes(to)) {
    throw new ServiceError('PRESCRIPTION_REQUIRED', 'This order contains prescription-only items. A pharmacist must approve the prescription first.');
  }
  if ((to === 'rejected' || to === 'cancelled' || to === 'delivery-failed') && !opts.note?.trim()) {
    throw new ServiceError('VALIDATION', 'Please provide a reason.');
  }

  const at = nowIso();
  const actorRole = actor?.role ?? 'system';
  const nextOrder: Order = {
    ...order,
    status: to,
    updatedAt: at,
    timeline: [...order.timeline, { status: to, at, actor: actorRole, note: opts.note }],
  };
  if (to === 'rejected') nextOrder.rejectionReason = opts.note;
  if (to === 'cancelled') nextOrder.cancellationReason = opts.note;
  if (to === 'delivery-failed') nextOrder.failureReason = opts.note;

  const patch: Partial<Database> = {};
  const notifications: Omit<AppNotification, 'id' | 'read' | 'createdAt'>[] = [];
  const audits: AuditLog[] = [auditEntry(actor, to === 'cancelled' ? 'order.cancelled' : 'order.status', 'order', order.id, `${order.reference} → ${ORDER_STATUS[to].label}${opts.note ? ` (${opts.note})` : ''}`)];
  const customerLink = `/customer/orders/${order.id}`;
  const pharmacy = db.pharmacies.find((p) => p.id === order.pharmacyId);

  // Delivery side effects
  let deliveries = db.deliveries;
  const delivery = deliveries.find((d) => d.id === order.deliveryId);
  const updateDelivery = (status: DeliveryStatus, extra: Partial<Delivery> = {}, note?: string) => {
    if (!delivery) return;
    deliveries = deliveries.map((d) =>
      d.id === delivery.id ? { ...d, ...extra, status, updatedAt: at, events: [...d.events, { status, at, note }] } : d
    );
  };

  switch (to) {
    case 'pharmacy-confirmed':
      notifications.push({ userId: order.customerId, type: 'order', title: 'Pharmacy confirmed your order', body: `${pharmacy?.name} confirmed stock for ${order.reference}.`, link: customerLink });
      break;
    case 'preparing':
      notifications.push({ userId: order.customerId, type: 'order', title: 'Your order is being prepared', body: `${order.reference} is being packed at ${pharmacy?.name}.`, link: customerLink });
      break;
    case 'ready-for-collection': {
      const redispatch = order.status !== 'preparing';
      updateDelivery('open', { courierId: undefined, offeredToCourierId: undefined, ...opts.deliveryPatch }, redispatch ? opts.note ?? 'Returned to dispatch queue' : 'Ready for collection');
      nextOrder.courierId = undefined;
      notifications.push({ userId: order.customerId, type: 'order', title: redispatch ? 'Finding a new courier' : 'Order ready for collection', body: redispatch ? `${order.reference} is back in the dispatch queue.` : `${order.reference} is packed and waiting for a courier.`, link: customerLink });
      notifications.push({ role: 'courier', type: 'delivery', title: 'New job available', body: `${order.reference} is ready for collection at ${pharmacy?.name}.`, link: '/courier/jobs' });
      break;
    }
    case 'courier-assigned': {
      const courier = db.couriers.find((c) => c.id === opts.deliveryPatch?.courierId);
      nextOrder.courierId = courier?.id;
      updateDelivery('accepted', { offeredToCourierId: undefined, ...opts.deliveryPatch }, `Accepted by ${courier?.name ?? 'courier'}`);
      notifications.push({ userId: order.customerId, type: 'delivery', title: 'Courier assigned', body: `${courier?.name ?? 'A courier'} will collect ${order.reference}.`, link: customerLink });
      notifications.push({ role: 'pharmacy', pharmacyId: order.pharmacyId, type: 'delivery', title: 'Courier on the way', body: `${courier?.name ?? 'A courier'} accepted ${order.reference}.`, link: '/pharmacy/dispatch' });
      audits.push(auditEntry(actor, 'courier.assigned', 'delivery', delivery?.id ?? '', `${courier?.name} assigned to ${order.reference}`));
      break;
    }
    case 'collected':
      updateDelivery('collected', opts.deliveryPatch, 'Collected from pharmacy');
      notifications.push({ userId: order.customerId, type: 'delivery', title: 'Order collected', body: `Your courier has collected ${order.reference}.`, link: customerLink });
      break;
    case 'en-route':
      updateDelivery('en-route', opts.deliveryPatch, 'Delivery started');
      notifications.push({ userId: order.customerId, type: 'delivery', title: 'Your order is on the way', body: `${order.reference} is en route (simulated tracking).`, link: customerLink });
      break;
    case 'delivered':
      updateDelivery('delivered', opts.deliveryPatch, 'Handed over');
      notifications.push({ userId: order.customerId, type: 'delivery', title: 'Order delivered', body: `${order.reference} was handed over. Thank you for using MediFly.`, link: customerLink });
      notifications.push({ role: 'pharmacy', pharmacyId: order.pharmacyId, type: 'delivery', title: 'Order delivered', body: `${order.reference} was delivered.`, link: '/pharmacy/history' });
      break;
    case 'delivery-failed':
      updateDelivery('failed', { failureReason: opts.note, ...opts.deliveryPatch }, opts.note);
      notifications.push({ userId: order.customerId, type: 'exception', title: 'Delivery could not be completed', body: `${order.reference}: ${opts.note}`, link: customerLink });
      notifications.push({ role: 'admin', type: 'exception', title: 'Delivery failed', body: `${order.reference}: ${opts.note}`, link: '/admin/deliveries' });
      notifications.push({ role: 'pharmacy', pharmacyId: order.pharmacyId, type: 'exception', title: 'Delivery failed', body: `${order.reference}: ${opts.note}`, link: '/pharmacy/dispatch' });
      break;
    case 'rejected':
    case 'cancelled': {
      updateDelivery('cancelled', {}, opts.note);
      // Return reserved stock.
      patch.inventory = db.inventory.map((inv) => {
        if (inv.pharmacyId !== order.pharmacyId) return inv;
        const line = order.items.find((i) => i.productId === inv.productId);
        return line ? { ...inv, stock: inv.stock + line.quantity, updatedAt: at } : inv;
      });
      // Payment follow-up: prepaid → refund request for admin processing; cash due → void.
      const payment = db.payments.find((p) => p.id === order.paymentId);
      if (payment) {
        const status: Payment['status'] = payment.status === 'paid' ? 'refund-requested' : payment.status === 'cash-due' ? 'failed' : payment.status;
        patch.payments = db.payments.map((p) => (p.id === payment.id ? { ...p, status, refundReason: status === 'refund-requested' ? `Order ${to}: ${opts.note}` : p.refundReason, updatedAt: at } : p));
        nextOrder.paymentStatus = status;
      }
      if (to === 'rejected') {
        notifications.push({ userId: order.customerId, type: 'order', title: 'Order could not be fulfilled', body: `${pharmacy?.name}: ${opts.note}`, link: customerLink });
      } else {
        notifications.push({ role: 'pharmacy', pharmacyId: order.pharmacyId, type: 'order', title: 'Order cancelled', body: `${order.reference} was cancelled: ${opts.note}`, link: '/pharmacy/orders' });
        if (actor?.role !== 'customer') notifications.push({ userId: order.customerId, type: 'order', title: 'Order cancelled', body: `${order.reference}: ${opts.note}`, link: customerLink });
      }
      break;
    }
  }

  // Cash on delivery is recorded as paid at handover.
  if (to === 'delivered' && order.paymentStatus === 'cash-due') {
    nextOrder.paymentStatus = 'paid';
    patch.payments = (patch.payments ?? db.payments).map((p) => (p.id === order.paymentId ? { ...p, status: 'paid', updatedAt: at } : p));
  }

  patch.orders = db.orders.map((o) => (o.id === orderId ? nextOrder : o));
  if (deliveries !== db.deliveries) patch.deliveries = deliveries;
  patch.notifications = [...buildNotifications(notifications), ...db.notifications];
  patch.auditLogs = [...audits, ...db.auditLogs];
  return patch;
}

/** Merge helper for applying a transition patch on top of an existing patch. */
export function withDb(db: Database, patch: Partial<Database>): Database {
  return { ...db, ...patch };
}
