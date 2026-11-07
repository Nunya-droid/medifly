import type { Database, DeliveryMethod, OrderStatus } from '@/types';
import { ACTIVE_ORDER_STATUSES, ORDER_STATUS } from '@/constants/status';
import { isSameDay } from '@/utils/format';
import { getDb } from './db';
import { request } from './api';
import { ACTIVE_DELIVERY } from './deliveryService';

/** All metrics are derived from the shared demo dataset — nothing here is hardcoded. */

export interface DayPoint {
  date: string; // ISO date (start of day)
  label: string;
  orders: number;
  delivered: number;
  revenue: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ordersByDay(db: Database, days = 14, pharmacyId?: string): DayPoint[] {
  const orders = pharmacyId ? db.orders.filter((o) => o.pharmacyId === pharmacyId) : db.orders;
  const out: DayPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const dayOrders = orders.filter((o) => isSameDay(new Date(o.createdAt), d));
    const delivered = dayOrders.filter((o) => o.status === 'delivered');
    out.push({
      date: d.toISOString(),
      label: days > 7 ? `${d.getDate()}/${d.getMonth() + 1}` : DAY_LABELS[d.getDay()],
      orders: dayOrders.length,
      delivered: delivered.length,
      revenue: dayOrders.filter((o) => !['cancelled', 'rejected'].includes(o.status)).reduce((s, o) => s + o.total, 0),
    });
  }
  return out;
}

/**
 * Illustrative platform revenue: delivery fees on non-cancelled orders plus an assumed 5%
 * commission on medicine subtotals. Clearly labelled as illustrative in the UI.
 */
export const ILLUSTRATIVE_COMMISSION = 0.05;
export function platformRevenue(db: Database) {
  return db.orders
    .filter((o) => !['cancelled', 'rejected'].includes(o.status))
    .reduce((s, o) => s + o.deliveryFee * (1 - db.settings.courierPayoutShare) + o.subtotal * ILLUSTRATIVE_COMMISSION, 0);
}

export function getAdminAnalytics(db: Database) {
  const now = new Date();
  const statusCounts = Object.keys(ORDER_STATUS).map((s) => ({ status: s as OrderStatus, label: ORDER_STATUS[s as OrderStatus].label, count: db.orders.filter((o) => o.status === s).length })).filter((s) => s.count > 0);
  const methodCounts = (['motorcycle', 'vehicle', 'drone'] as DeliveryMethod[]).map((m) => ({ method: m, count: db.orders.filter((o) => o.deliveryMethod === m && !['cancelled', 'rejected'].includes(o.status)).length }));
  const pharmacyPerformance = db.pharmacies
    .filter((p) => p.verification === 'verified')
    .map((p) => {
      const orders = db.orders.filter((o) => o.pharmacyId === p.id);
      const delivered = orders.filter((o) => o.status === 'delivered');
      const fulfilled = orders.filter((o) => !['rejected'].includes(o.status));
      const confirmTimes = orders
        .map((o) => {
          const placed = o.timeline.find((e) => e.status === 'placed');
          const conf = o.timeline.find((e) => e.status === 'pharmacy-confirmed');
          return placed && conf ? (new Date(conf.at).getTime() - new Date(placed.at).getTime()) / 60000 : null;
        })
        .filter((n): n is number => n != null);
      return {
        id: p.id,
        name: p.name,
        orders: orders.length,
        delivered: delivered.length,
        revenue: delivered.reduce((s, o) => s + o.subtotal, 0),
        fulfilmentRate: orders.length ? fulfilled.length / orders.length : 0,
        avgConfirmMinutes: confirmTimes.length ? Math.round(confirmTimes.reduce((a, b) => a + b, 0) / confirmTimes.length) : null,
      };
    })
    .sort((a, b) => b.orders - a.orders);

  const deliveredOrders = db.orders.filter((o) => o.status === 'delivered');
  const deliveryDurations = deliveredOrders
    .map((o) => {
      const placed = o.timeline.find((e) => e.status === 'placed');
      const done = o.timeline.find((e) => e.status === 'delivered');
      return placed && done ? (new Date(done.at).getTime() - new Date(placed.at).getTime()) / 60000 : null;
    })
    .filter((n): n is number => n != null);
  const closedDeliveries = db.deliveries.filter((d) => d.status === 'delivered' || d.status === 'failed');

  const customers = db.users.filter((u) => u.role === 'customer');
  const customerActivity = customers
    .map((c) => {
      const orders = db.orders.filter((o) => o.customerId === c.id);
      return { id: c.id, name: c.name, orders: orders.length, spend: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0), lastOrderAt: orders[0]?.createdAt };
    })
    .sort((a, b) => b.orders - a.orders);

  return {
    kpis: {
      totalOrders: db.orders.length,
      ordersToday: db.orders.filter((o) => isSameDay(new Date(o.createdAt), now)).length,
      activeDeliveries: db.deliveries.filter((d) => ACTIVE_DELIVERY.includes(d.status)).length,
      completedDeliveries: db.deliveries.filter((d) => d.status === 'delivered').length,
      totalCustomers: customers.length,
      activePharmacies: db.pharmacies.filter((p) => p.verification === 'verified' && p.acceptingOrders).length,
      activeCouriers: db.couriers.filter((c) => c.verification === 'verified' && c.availability !== 'offline').length,
      illustrativeRevenue: platformRevenue(db),
      gmv: db.orders.filter((o) => !['cancelled', 'rejected'].includes(o.status)).reduce((s, o) => s + o.total, 0),
      activeOrders: db.orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length,
      avgDeliveryMinutes: deliveryDurations.length ? Math.round(deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length) : null,
      deliverySuccessRate: closedDeliveries.length ? closedDeliveries.filter((d) => d.status === 'delivered').length / closedDeliveries.length : null,
    },
    byDay: ordersByDay(db, 14),
    statusCounts,
    methodCounts,
    pharmacyPerformance,
    customerActivity,
    exceptions: db.deliveries.filter((d) => d.status === 'failed' || d.delayed),
    pendingPartners: [
      ...db.pharmacies.filter((p) => p.verification === 'pending').map((p) => ({ kind: 'pharmacy' as const, id: p.id, name: p.name, at: p.joinedAt })),
      ...db.couriers.filter((c) => c.verification === 'pending').map((c) => ({ kind: 'courier' as const, id: c.id, name: c.name, at: c.joinedAt })),
    ],
    pendingPrescriptions: db.prescriptions.filter((p) => p.status === 'pending'),
    openTickets: db.tickets.filter((t) => ['open', 'in-progress', 'awaiting-customer'].includes(t.status)),
    refundRequests: db.payments.filter((p) => p.status === 'refund-requested'),
  };
}

export function getPharmacyAnalytics(db: Database, pharmacyId: string) {
  const now = new Date();
  const orders = db.orders.filter((o) => o.pharmacyId === pharmacyId);
  const inv = db.inventory.filter((i) => i.pharmacyId === pharmacyId);
  const topProducts = new Map<string, { name: string; units: number; revenue: number }>();
  for (const o of orders.filter((x) => x.status === 'delivered')) {
    for (const i of o.items) {
      const cur = topProducts.get(i.productId) ?? { name: i.name, units: 0, revenue: 0 };
      cur.units += i.quantity;
      cur.revenue += i.quantity * i.unitPrice;
      topProducts.set(i.productId, cur);
    }
  }
  return {
    newOrders: orders.filter((o) => o.status === 'awaiting-pharmacy' && (!o.requiresPrescription || o.prescriptionStatus === 'approved')).length,
    awaitingConfirmation: orders.filter((o) => o.status === 'awaiting-pharmacy').length,
    reviewRequired: db.prescriptions.filter((p) => p.pharmacyId === pharmacyId && p.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'pharmacy-confirmed' || o.status === 'preparing').length,
    readyForDispatch: orders.filter((o) => o.status === 'ready-for-collection').length,
    outForDelivery: orders.filter((o) => ['courier-assigned', 'collected', 'en-route'].includes(o.status)).length,
    completedToday: orders.filter((o) => o.status === 'delivered' && isSameDay(new Date(o.updatedAt), now)).length,
    revenueToday: orders.filter((o) => o.status !== 'cancelled' && o.status !== 'rejected' && isSameDay(new Date(o.createdAt), now)).reduce((s, o) => s + o.subtotal, 0),
    revenueTotal: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.subtotal, 0),
    lowStock: inv.filter((i) => i.stock <= i.lowStockThreshold),
    byDay: ordersByDay(db, 7, pharmacyId),
    byDay14: ordersByDay(db, 14, pharmacyId),
    topProducts: [...topProducts.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    totalOrders: orders.length,
    rejected: orders.filter((o) => o.status === 'rejected').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };
}

export function getCourierAnalytics(db: Database, courierId: string) {
  const now = new Date();
  const mine = db.deliveries.filter((d) => d.courierId === courierId);
  const delivered = mine.filter((d) => d.status === 'delivered');
  const todayDelivered = delivered.filter((d) => isSameDay(new Date(d.updatedAt), now));
  const failed = mine.filter((d) => d.status === 'failed');
  return {
    active: mine.filter((d) => ACTIVE_DELIVERY.includes(d.status)).length,
    completed: delivered.length,
    completedToday: todayDelivered.length,
    earningsToday: todayDelivered.reduce((s, d) => s + d.payout, 0),
    earningsTotal: delivered.reduce((s, d) => s + d.payout, 0),
    distanceToday: todayDelivered.reduce((s, d) => s + d.distanceKm, 0),
    successRate: delivered.length + failed.length ? delivered.length / (delivered.length + failed.length) : null,
    failed: failed.length,
  };
}

export const analyticsService = {
  getDashboardAnalytics() {
    return request(() => getAdminAnalytics(getDb()));
  },
  getPharmacyAnalytics(pharmacyId: string) {
    return request(() => getPharmacyAnalytics(getDb(), pharmacyId));
  },
};
