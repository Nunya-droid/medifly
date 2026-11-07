import type { Courier, CourierAvailability, Database, Delivery, DeliveryStatus, Order, User } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';
import { authService } from './authService';
import { auditEntry } from './auditService';
import { buildNotifications } from './notificationService';
import { transitionOrder } from './orderLifecycle';

export interface DeliveryView {
  delivery: Delivery;
  order: Order;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  areaName: string;
  courier?: Courier;
}

export function toView(db: Database, delivery: Delivery): DeliveryView | null {
  const order = db.orders.find((o) => o.id === delivery.orderId);
  if (!order) return null;
  const ph = db.pharmacies.find((p) => p.id === order.pharmacyId);
  const area = db.serviceAreas.find((a) => a.id === order.address.serviceAreaId);
  return {
    delivery,
    order,
    pharmacyName: ph?.name ?? 'Pharmacy',
    pharmacyAddress: ph ? `${ph.address} · ${ph.landmark}` : '',
    pharmacyPhone: ph?.phone ?? '',
    areaName: area?.name ?? '',
    courier: db.couriers.find((c) => c.id === delivery.courierId),
  };
}

function courierCanServe(courier: Courier, db: Database, order: Order) {
  const ph = db.pharmacies.find((p) => p.id === order.pharmacyId);
  return courier.serviceAreaIds.includes(order.address.serviceAreaId) || (!!ph && courier.serviceAreaIds.includes(ph.serviceAreaId));
}

/** Jobs a courier may accept: open jobs matching vehicle and area, plus jobs offered directly to them. */
export function jobsForCourier(db: Database, courierId: string): { offered: DeliveryView[]; open: DeliveryView[]; upcoming: DeliveryView[] } {
  const courier = db.couriers.find((c) => c.id === courierId);
  if (!courier || courier.verification !== 'verified') return { offered: [], open: [], upcoming: [] };
  const views = db.deliveries.map((d) => toView(db, d)).filter((v): v is DeliveryView => !!v);
  const matches = (v: DeliveryView) => v.delivery.method === courier.vehicleType && courierCanServe(courier, db, v.order) && !v.delivery.declinedBy.includes(courierId);
  return {
    offered: views.filter((v) => v.delivery.status === 'offered' && v.delivery.offeredToCourierId === courierId),
    open: views.filter((v) => v.delivery.status === 'open' && matches(v)),
    upcoming: views.filter((v) => v.delivery.status === 'pending' && ['pharmacy-confirmed', 'preparing'].includes(v.order.status) && matches(v)),
  };
}

export function deliveriesForCourier(db: Database, courierId: string) {
  return db.deliveries
    .filter((d) => d.courierId === courierId)
    .map((d) => toView(db, d))
    .filter((v): v is DeliveryView => !!v)
    .sort((a, b) => b.delivery.updatedAt.localeCompare(a.delivery.updatedAt));
}

export const ACTIVE_DELIVERY: DeliveryStatus[] = ['accepted', 'at-pharmacy', 'collected', 'en-route'];

function currentCourier(user: User, db: Database): Courier {
  const courier = db.couriers.find((c) => c.id === user.courierId);
  if (!courier) throw new ServiceError('FORBIDDEN', 'No courier profile is linked to this account.');
  return courier;
}

export const deliveryService = {
  acceptJob(deliveryId: string): Promise<Delivery> {
    return request(() => {
      const user = authService.requireUser(['courier']);
      const db = getDb();
      const courier = currentCourier(user, db);
      if (courier.verification !== 'verified') throw new ServiceError('FORBIDDEN', 'Your partner account is not verified.');
      if (courier.availability === 'offline') throw new ServiceError('VALIDATION', 'Go online to accept jobs.');
      const delivery = db.deliveries.find((d) => d.id === deliveryId);
      if (!delivery) throw new ServiceError('NOT_FOUND', 'Job not found.');
      const offeredToMe = delivery.status === 'offered' && delivery.offeredToCourierId === courier.id;
      if (!(delivery.status === 'open' || offeredToMe)) throw new ServiceError('CONFLICT', 'This job is no longer available.');
      if (delivery.method !== courier.vehicleType) throw new ServiceError('VALIDATION', 'This job needs a different delivery method.');
      const patch = transitionOrder(db, delivery.orderId, 'courier-assigned', user, { deliveryPatch: { courierId: courier.id } });
      commit(patch);
      return patch.deliveries!.find((d) => d.id === deliveryId)!;
    });
  },

  declineJob(deliveryId: string, reason?: string): Promise<void> {
    return request(() => {
      const user = authService.requireUser(['courier']);
      const db = getDb();
      const courier = currentCourier(user, db);
      const delivery = db.deliveries.find((d) => d.id === deliveryId);
      if (!delivery) throw new ServiceError('NOT_FOUND', 'Job not found.');
      const order = db.orders.find((o) => o.id === delivery.orderId)!;
      const wasOffered = delivery.status === 'offered' && delivery.offeredToCourierId === courier.id;
      if (!wasOffered && delivery.status !== 'open') throw new ServiceError('CONFLICT', 'This job is no longer available.');
      const at = nowIso();
      const next: Delivery = {
        ...delivery,
        status: 'open',
        offeredToCourierId: undefined,
        declinedBy: [...new Set([...delivery.declinedBy, courier.id])],
        updatedAt: at,
        events: wasOffered ? [...delivery.events, { status: 'open', at, note: `Declined by ${courier.name}${reason ? `: ${reason}` : ''}` }] : delivery.events,
      };
      commit({
        deliveries: db.deliveries.map((d) => (d.id === deliveryId ? next : d)),
        notifications: wasOffered
          ? [...buildNotifications([{ role: 'pharmacy', pharmacyId: order.pharmacyId, type: 'delivery', title: 'Courier declined job', body: `${courier.name} declined ${order.reference}. It is back in the open queue.`, link: '/pharmacy/dispatch' }]), ...db.notifications]
          : db.notifications,
        auditLogs: [auditEntry(user, 'delivery.updated', 'delivery', deliveryId, `${courier.name} declined ${order.reference}`), ...db.auditLogs],
      });
    }, { delay: 250 });
  },

  /** Pharmacy dispatch / admin: offer a ready order to a specific available courier. */
  assignCourier(orderId: string, courierId: string): Promise<Delivery> {
    return request(() => {
      const user = authService.requireUser(['pharmacy', 'admin']);
      const db = getDb();
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) throw new ServiceError('NOT_FOUND', 'Order not found.');
      if (user.role === 'pharmacy' && order.pharmacyId !== user.pharmacyId) throw new ServiceError('FORBIDDEN', 'Not your pharmacy order.');
      if (order.status !== 'ready-for-collection') throw new ServiceError('INVALID_TRANSITION', 'Only orders ready for collection can be dispatched.');
      const courier = db.couriers.find((c) => c.id === courierId);
      if (!courier || courier.verification !== 'verified') throw new ServiceError('VALIDATION', 'Choose a verified delivery partner.');
      if (courier.availability === 'offline') throw new ServiceError('VALIDATION', `${courier.name} is offline.`);
      if (courier.vehicleType !== order.deliveryMethod) throw new ServiceError('VALIDATION', `${courier.name} does not provide ${order.deliveryMethod} delivery.`);
      const delivery = db.deliveries.find((d) => d.id === order.deliveryId);
      if (!delivery) throw new ServiceError('NOT_FOUND', 'Delivery record missing.');
      const at = nowIso();
      const next: Delivery = { ...delivery, status: 'offered', offeredToCourierId: courierId, declinedBy: delivery.declinedBy.filter((id) => id !== courierId), updatedAt: at, events: [...delivery.events, { status: 'offered', at, note: `Offered to ${courier.name}` }] };
      commit({
        deliveries: db.deliveries.map((d) => (d.id === delivery.id ? next : d)),
        notifications: [...buildNotifications([{ role: 'courier', courierId, type: 'delivery', title: 'Delivery offered to you', body: `${order.reference} — please accept or decline.`, link: '/courier/jobs' }]), ...db.notifications],
        auditLogs: [auditEntry(user, 'courier.assigned', 'delivery', delivery.id, `${order.reference} offered to ${courier.name}`), ...db.auditLogs],
      });
      return next;
    });
  },

  /**
   * Courier progress: at-pharmacy → collected → en-route → delivered, or failed with a reason.
   * Admins may also apply these updates as a simulated intervention.
   */
  updateDeliveryStatus(deliveryId: string, status: 'at-pharmacy' | 'collected' | 'en-route' | 'delivered' | 'failed' | 'released', reason?: string): Promise<Delivery> {
    return request(() => {
      const user = authService.requireUser(['courier', 'admin']);
      const db = getDb();
      const delivery = db.deliveries.find((d) => d.id === deliveryId);
      if (!delivery) throw new ServiceError('NOT_FOUND', 'Delivery not found.');
      if (user.role === 'courier' && delivery.courierId !== user.courierId) throw new ServiceError('FORBIDDEN', 'This delivery is assigned to another courier.');
      const at = nowIso();

      if (status === 'at-pharmacy') {
        if (delivery.status !== 'accepted') throw new ServiceError('INVALID_TRANSITION', 'Arrival can only be confirmed after accepting the job.');
        const next: Delivery = { ...delivery, status: 'at-pharmacy', updatedAt: at, events: [...delivery.events, { status: 'at-pharmacy', at, note: 'Courier arrived at pharmacy' }] };
        const order = db.orders.find((o) => o.id === delivery.orderId)!;
        commit({
          deliveries: db.deliveries.map((d) => (d.id === deliveryId ? next : d)),
          notifications: [...buildNotifications([{ role: 'pharmacy', pharmacyId: order.pharmacyId, type: 'delivery', title: 'Courier has arrived', body: `Courier is at the counter for ${order.reference}.`, link: '/pharmacy/dispatch' }]), ...db.notifications],
          auditLogs: [auditEntry(user, 'delivery.updated', 'delivery', deliveryId, `Courier arrived at pharmacy for ${order.reference}`), ...db.auditLogs],
        });
        return next;
      }

      if (status === 'released') {
        // Courier can't complete before collection — return the job to the open queue.
        if (!['accepted', 'at-pharmacy'].includes(delivery.status)) throw new ServiceError('INVALID_TRANSITION', 'Only jobs not yet collected can be released.');
        if (!reason?.trim()) throw new ServiceError('VALIDATION', 'Please give a reason.');
        const patch = transitionOrder(db, delivery.orderId, 'ready-for-collection', user, { note: `Courier released job: ${reason}`, deliveryPatch: { declinedBy: [...delivery.declinedBy, delivery.courierId!] } });
        commit(patch);
        return patch.deliveries!.find((d) => d.id === deliveryId)!;
      }

      const map = { collected: 'collected', 'en-route': 'en-route', delivered: 'delivered', failed: 'delivery-failed' } as const;
      const required: Record<typeof status, DeliveryStatus[]> = { collected: ['accepted', 'at-pharmacy'], 'en-route': ['collected'], delivered: ['en-route'], failed: ['collected', 'en-route'] };
      if (!required[status].includes(delivery.status)) throw new ServiceError('INVALID_TRANSITION', 'That step is not available for the current delivery stage.');
      const patch = transitionOrder(db, delivery.orderId, map[status], user, { note: reason, deliveryPatch: status === 'delivered' ? { delayed: false } : {} });
      patch.auditLogs = [auditEntry(user, 'delivery.updated', 'delivery', deliveryId, `Delivery ${status}${reason ? `: ${reason}` : ''}`), ...(patch.auditLogs ?? db.auditLogs)];
      commit(patch);
      return patch.deliveries!.find((d) => d.id === deliveryId)!;
    });
  },

  /** Admin interventions in the simulated workflow. */
  intervene(deliveryId: string, action: 'redispatch' | 'flag-delay' | 'clear-delay' | 'cancel', note?: string): Promise<void> {
    return request(() => {
      const admin = authService.requireUser(['admin']);
      const db = getDb();
      const delivery = db.deliveries.find((d) => d.id === deliveryId);
      if (!delivery) throw new ServiceError('NOT_FOUND', 'Delivery not found.');
      const order = db.orders.find((o) => o.id === delivery.orderId)!;
      if (action === 'flag-delay' || action === 'clear-delay') {
        const delayed = action === 'flag-delay';
        commit({
          deliveries: db.deliveries.map((d) => (d.id === deliveryId ? { ...d, delayed, updatedAt: nowIso() } : d)),
          notifications: delayed ? [...buildNotifications([{ userId: order.customerId, type: 'exception', title: 'Your delivery is running late', body: `Sorry — ${order.reference} is taking longer than estimated. Support is monitoring it.`, link: `/customer/orders/${order.id}` }]), ...db.notifications] : db.notifications,
          auditLogs: [auditEntry(admin, 'delivery.updated', 'delivery', deliveryId, `${delayed ? 'Flagged' : 'Cleared'} delay on ${order.reference}`), ...db.auditLogs],
        });
        return;
      }
      if (action === 'redispatch') {
        if (!['delivery-failed', 'courier-assigned'].includes(order.status)) throw new ServiceError('INVALID_TRANSITION', 'Only failed or not-yet-collected deliveries can be re-dispatched.');
        commit(transitionOrder(db, order.id, 'ready-for-collection', admin, { note: note || 'Re-dispatched by operations' }));
        return;
      }
      commit(transitionOrder(db, order.id, 'cancelled', admin, { note: note || 'Cancelled by operations' }));
    });
  },

  setAvailability(availability: CourierAvailability): Promise<Courier> {
    return request(() => {
      const user = authService.requireUser(['courier']);
      const db = getDb();
      const courier = currentCourier(user, db);
      const next = { ...courier, availability };
      commit({ couriers: db.couriers.map((c) => (c.id === courier.id ? next : c)) });
      return next;
    }, { delay: 200 });
  },

  updateCourierProfile(patch: Partial<Pick<Courier, 'phone' | 'vehicleDescription' | 'plate' | 'serviceAreaIds'>>): Promise<Courier> {
    return request(() => {
      const user = authService.requireUser(['courier']);
      const db = getDb();
      const courier = currentCourier(user, db);
      const next = { ...courier, ...patch };
      commit({ couriers: db.couriers.map((c) => (c.id === courier.id ? next : c)) });
      return next;
    });
  },
};
