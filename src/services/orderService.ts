import type { CreateOrderInput, Database, Delivery, Order, OrderItem, OrderStatus, User } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';
import { authService } from './authService';
import { auditEntry } from './auditService';
import { buildNotifications } from './notificationService';
import { evaluateMethods } from './deliveryRecommendationService';
import { authorizeDemoPayment, paymentService, type DemoPaymentInput } from './paymentService';
import { transitionOrder } from './orderLifecycle';
import { DELIVERY_METHOD_LABEL } from '@/constants/catalog';
import { ACTIVE_ORDER_STATUSES } from '@/constants/status';
import { createId } from '@/utils/id';

export interface OrderFilters {
  status?: OrderStatus | 'all' | 'active' | 'closed';
  pharmacyId?: string | 'all';
  method?: Delivery['method'] | 'all';
  query?: string;
}

/** Role-scoped visibility: customers see their own orders; pharmacies their pharmacy's; admins all. */
export function visibleOrders(db: Database, user: User | null, pharmacyOverride?: string): Order[] {
  if (!user) return [];
  let list = db.orders;
  if (user.role === 'customer') list = list.filter((o) => o.customerId === user.id);
  else if (user.role === 'pharmacy') list = list.filter((o) => o.pharmacyId === user.pharmacyId);
  else if (user.role === 'courier') list = list.filter((o) => o.courierId === user.courierId);
  else if (pharmacyOverride) list = list.filter((o) => o.pharmacyId === pharmacyOverride);
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterOrders(db: Database, orders: Order[], f: OrderFilters): Order[] {
  const q = f.query?.trim().toLowerCase();
  return orders.filter((o) => {
    if (f.status === 'active' && !ACTIVE_ORDER_STATUSES.includes(o.status)) return false;
    if (f.status === 'closed' && ACTIVE_ORDER_STATUSES.includes(o.status)) return false;
    if (f.status && !['all', 'active', 'closed'].includes(f.status) && o.status !== f.status) return false;
    if (f.pharmacyId && f.pharmacyId !== 'all' && o.pharmacyId !== f.pharmacyId) return false;
    if (f.method && f.method !== 'all' && o.deliveryMethod !== f.method) return false;
    if (q) {
      const customer = db.users.find((u) => u.id === o.customerId)?.name ?? '';
      const hay = `${o.reference} ${customer} ${o.address.recipientName} ${o.items.map((i) => i.name).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function nextReference(db: Database) {
  const seq = db.meta.orderSequence;
  return { reference: `MF-${new Date().getFullYear()}-${seq}`, seq };
}

function canManageOrder(user: User, order: Order) {
  if (user.role === 'admin') return true;
  if (user.role === 'pharmacy') return user.pharmacyId === order.pharmacyId;
  return false;
}

export const orderService = {
  getOrders(filters: OrderFilters = {}): Promise<Order[]> {
    return request(() => {
      const user = authService.requireUser();
      const db = getDb();
      return filterOrders(db, visibleOrders(db, user), filters);
    });
  },

  getOrder(orderId: string): Promise<Order> {
    return request(() => {
      const user = authService.requireUser();
      const order = visibleOrders(getDb(), user).find((o) => o.id === orderId);
      if (!order) throw new ServiceError('NOT_FOUND', 'Order not found or not available to your account.');
      return order;
    }, { delay: 200 });
  },

  /**
   * Places an order: validates stock, prescription linkage and delivery eligibility (via the
   * delivery engine), authorises the simulated payment, reserves stock and notifies the pharmacy.
   */
  createOrder(input: CreateOrderInput & { payment?: Pick<DemoPaymentInput, 'simulateDecline'> }): Promise<Order> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      if (user.id !== input.customerId) throw new ServiceError('FORBIDDEN', 'You can only place orders for your own account.');
      const db = getDb();
      const pharmacy = db.pharmacies.find((p) => p.id === input.pharmacyId);
      if (!pharmacy || pharmacy.verification !== 'verified' || !pharmacy.acceptingOrders) throw new ServiceError('VALIDATION', 'This pharmacy is not accepting orders right now.');
      if (!input.items.length) throw new ServiceError('VALIDATION', 'Your order has no items.');
      if (!input.address.recipientName.trim() || !input.address.phone.trim()) throw new ServiceError('VALIDATION', 'Recipient name and phone are required.');

      const items: OrderItem[] = input.items.map(({ productId, quantity }) => {
        const product = db.products.find((p) => p.id === productId);
        const inv = db.inventory.find((i) => i.productId === productId && i.pharmacyId === input.pharmacyId);
        if (!product || !inv) throw new ServiceError('NOT_FOUND', 'An item in your order is no longer listed.');
        if (!inv.available || inv.stock < quantity) throw new ServiceError('OUT_OF_STOCK', `${product.name}: only ${inv.available ? inv.stock : 0} available at ${pharmacy.name}.`);
        return { productId, name: product.name, strength: product.strength, packSize: product.packSize, quantity, unitPrice: inv.price, requiresPrescription: product.requiresPrescription };
      });

      const requiresPrescription = items.some((i) => i.requiresPrescription);
      let prescriptionStatus: Order['prescriptionStatus'] = 'not-required';
      const prescription = input.prescriptionId ? db.prescriptions.find((p) => p.id === input.prescriptionId) : undefined;
      if (requiresPrescription) {
        if (!prescription) throw new ServiceError('PRESCRIPTION_REQUIRED', 'Please attach a prescription for prescription-only items.');
        if (prescription.customerId !== user.id) throw new ServiceError('FORBIDDEN', 'That prescription belongs to another account.');
        if (prescription.pharmacyId !== input.pharmacyId) throw new ServiceError('VALIDATION', 'The prescription must be submitted to the same pharmacy.');
        if (prescription.orderId) throw new ServiceError('CONFLICT', 'That prescription is already linked to another order.');
        if (prescription.status === 'rejected') throw new ServiceError('VALIDATION', 'That prescription was not approved. Please upload a new one.');
        prescriptionStatus = prescription.status;
      }

      const rec = evaluateMethods(db, { serviceAreaId: input.address.serviceAreaId, pharmacyId: input.pharmacyId, items: input.items });
      const method = rec.evaluations.find((e) => e.method === input.deliveryMethod);
      if (!method || !method.eligible) {
        throw new ServiceError('VALIDATION', `${DELIVERY_METHOD_LABEL[input.deliveryMethod]} is not available for this order. ${method?.exclusions[0] ?? ''}`);
      }

      const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const total = subtotal + method.fee;
      const paymentInput: DemoPaymentInput = { method: input.paymentMethod, amount: total, methodDetail: input.paymentMethodDetail, simulateDecline: input.payment?.simulateDecline };
      const authorisation = authorizeDemoPayment(paymentInput);

      const at = nowIso();
      const { reference, seq } = nextReference(db);
      const orderId = createId('ord');
      const payment = paymentService.createRecord(orderId, user.id, paymentInput, authorisation);
      const delivery: Delivery = {
        id: createId('dlv'),
        orderId,
        method: input.deliveryMethod,
        declinedBy: [],
        status: 'pending',
        distanceKm: method.distanceKm,
        fee: method.fee,
        payout: Math.round(method.fee * db.settings.courierPayoutShare * 2) / 2,
        etaMinutes: method.etaMinutes,
        events: [{ status: 'pending', at, note: 'Awaiting pharmacy preparation' }],
        createdAt: at,
        updatedAt: at,
      };
      const order: Order = {
        id: orderId,
        reference,
        customerId: user.id,
        pharmacyId: input.pharmacyId,
        items,
        status: 'awaiting-pharmacy',
        requiresPrescription,
        prescriptionId: requiresPrescription ? prescription?.id : undefined,
        prescriptionStatus,
        address: input.address,
        deliveryMethod: input.deliveryMethod,
        deliveryId: delivery.id,
        subtotal,
        deliveryFee: method.fee,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus: payment.status,
        paymentId: payment.id,
        etaMinutes: method.etaMinutes,
        recommendationSummary: rec.recommended?.method === input.deliveryMethod ? rec.explanation : `Customer selected ${DELIVERY_METHOD_LABEL[input.deliveryMethod]} (alternative to the recommendation).`,
        timeline: [
          { status: 'placed', at, actor: 'customer' },
          { status: 'awaiting-pharmacy', at, actor: 'system', note: 'Sent to pharmacy for stock confirmation' },
        ],
        createdAt: at,
        updatedAt: at,
      };

      const notifications = buildNotifications([
        { userId: user.id, type: 'order', title: 'Order placed', body: `${reference} was sent to ${pharmacy.name} for confirmation.`, link: `/customer/orders/${orderId}` },
        { role: 'pharmacy', pharmacyId: pharmacy.id, type: 'order', title: 'New order received', body: `${reference} from ${user.name} is awaiting stock confirmation.`, link: '/pharmacy/orders' },
        ...(requiresPrescription && prescriptionStatus !== 'approved'
          ? [{ role: 'pharmacy' as const, pharmacyId: pharmacy.id, type: 'prescription' as const, title: 'Prescription review needed', body: `${reference} includes a prescription-only item.`, link: '/pharmacy/prescriptions' }]
          : []),
      ]);

      commit({
        orders: [order, ...db.orders],
        deliveries: [delivery, ...db.deliveries],
        payments: [payment, ...db.payments],
        prescriptions: prescription ? db.prescriptions.map((p) => (p.id === prescription.id ? { ...p, orderId } : p)) : db.prescriptions,
        // Reserve stock at order time; returned on rejection or cancellation.
        inventory: db.inventory.map((inv) => {
          if (inv.pharmacyId !== input.pharmacyId) return inv;
          const line = items.find((i) => i.productId === inv.productId);
          return line ? { ...inv, stock: inv.stock - line.quantity, updatedAt: at } : inv;
        }),
        carts: { ...db.carts, [user.id]: (db.carts[user.id] ?? []).filter((c) => c.pharmacyId !== input.pharmacyId || !input.items.some((i) => i.productId === c.productId)) },
        notifications: [...notifications, ...db.notifications],
        auditLogs: [
          auditEntry(user, 'payment.processed', 'payment', payment.id, `Simulated ${input.paymentMethod} payment ${payment.status} for ${reference}`),
          auditEntry(user, 'order.created', 'order', orderId, `Created order ${reference} (${items.length} item${items.length > 1 ? 's' : ''})`),
          ...db.auditLogs,
        ],
        meta: { ...db.meta, orderSequence: seq + 1 },
      });
      return order;
    }, { delay: 700 });
  },

  /** Pharmacy (own orders) or admin status updates. Courier progress goes through deliveryService. */
  updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
    return request(() => {
      const user = authService.requireUser(['pharmacy', 'admin']);
      const db = getDb();
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) throw new ServiceError('NOT_FOUND', 'Order not found.');
      if (!canManageOrder(user, order)) throw new ServiceError('FORBIDDEN', 'You can only manage orders for your pharmacy.');
      const pharmacyStatuses: OrderStatus[] = ['pharmacy-confirmed', 'preparing', 'ready-for-collection', 'rejected', 'cancelled'];
      if (user.role === 'pharmacy' && !pharmacyStatuses.includes(status)) throw new ServiceError('FORBIDDEN', 'Delivery progress is updated by the courier.');
      if (user.role === 'pharmacy' && status === 'ready-for-collection' && ['courier-assigned', 'delivery-failed'].includes(order.status)) throw new ServiceError('FORBIDDEN', 'Only administrators can re-dispatch an order.');
      const patch = transitionOrder(db, orderId, status, user, { note });
      commit(patch);
      return patch.orders!.find((o) => o.id === orderId)!;
    });
  },

  cancelOrder(orderId: string, reason: string): Promise<Order> {
    return request(() => {
      const user = authService.requireUser(['customer', 'admin']);
      const db = getDb();
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) throw new ServiceError('NOT_FOUND', 'Order not found.');
      if (user.role === 'customer') {
        if (order.customerId !== user.id) throw new ServiceError('FORBIDDEN', 'Not your order.');
        if (!['placed', 'awaiting-pharmacy', 'pharmacy-confirmed'].includes(order.status)) throw new ServiceError('INVALID_TRANSITION', 'This order can no longer be cancelled from the app. Please contact support.');
      }
      const patch = transitionOrder(db, orderId, 'cancelled', user, { note: reason });
      commit(patch);
      return patch.orders!.find((o) => o.id === orderId)!;
    });
  },

  /** Returns items from a past order that can be added to the cart again. */
  reorder(orderId: string): Promise<{ added: number; skipped: string[] }> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      const db = getDb();
      const order = db.orders.find((o) => o.id === orderId && o.customerId === user.id);
      if (!order) throw new ServiceError('NOT_FOUND', 'Order not found.');
      const cart = (db.carts[user.id] ?? []).map((c) => ({ ...c }));
      const skipped: string[] = [];
      let added = 0;
      for (const item of order.items) {
        const inv = db.inventory.find((i) => i.productId === item.productId && i.pharmacyId === order.pharmacyId);
        if (!inv || !inv.available || inv.stock < item.quantity) {
          skipped.push(item.name);
          continue;
        }
        const existing = cart.find((c) => c.productId === item.productId && c.pharmacyId === order.pharmacyId);
        if (existing) existing.quantity = Math.min(10, inv.stock, existing.quantity + item.quantity);
        else cart.push({ productId: item.productId, pharmacyId: order.pharmacyId, quantity: item.quantity, addedAt: nowIso() });
        added++;
      }
      commit({ carts: { ...db.carts, [user.id]: cart } });
      return { added, skipped };
    });
  },
};
