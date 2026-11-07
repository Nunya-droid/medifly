/// <reference types="jest" />
import { storageService } from '@/services/storageService';
import { setSimulatedLatency } from '@/services/api';
import { getDb, resetDb, loadDb } from '@/services/db';
import { authService } from '@/services/authService';
import { orderService } from '@/services/orderService';
import { deliveryService, jobsForCourier } from '@/services/deliveryService';
import { prescriptionService } from '@/services/prescriptionService';
import { getAdminAnalytics } from '@/services/analyticsService';
import { cartService } from '@/services/cartService';
import { selectNotificationsFor } from '@/services/notificationService';
import { favoriteService } from '@/services/favoriteService';
import { DEMO_PASSWORD } from '@/constants/catalog';
import type { DeliveryAddress } from '@/types';

const madina: DeliveryAddress = {
  recipientName: 'Ama Mensah',
  phone: '+233 24 555 0142',
  region: 'Greater Accra',
  city: 'Accra',
  serviceAreaId: 'sa-madina',
  area: 'Madina Estates',
  landmark: 'Behind Madina Polyclinic',
};

async function signIn(email: string) {
  return authService.login(email, DEMO_PASSWORD);
}

beforeEach(() => {
  storageService.useMemoryStore();
  setSimulatedLatency(false);
  resetDb();
  authService.logout();
});

describe('authentication', () => {
  it('signs in each demo role and rejects invalid credentials', async () => {
    for (const [email, role] of [
      ['customer@medifly.demo', 'customer'],
      ['pharmacy@medifly.demo', 'pharmacy'],
      ['courier@medifly.demo', 'courier'],
      ['admin@medifly.demo', 'admin'],
    ] as const) {
      const u = await signIn(email);
      expect(u.role).toBe(role);
      authService.logout();
      expect(authService.getCurrentUser()).toBeNull();
    }
    await expect(authService.login('customer@medifly.demo', 'wrong')).rejects.toThrow(/Incorrect/);
  });

  it('enforces role permissions in services', async () => {
    await signIn('customer@medifly.demo');
    const order = getDb().orders.find((o) => o.pharmacyId === 'ph-community' && o.status === 'awaiting-pharmacy' && !o.requiresPrescription)!;
    await expect(orderService.updateOrderStatus(order.id, 'pharmacy-confirmed')).rejects.toThrow(/permission/);
  });

  it('pharmacy staff cannot manage another pharmacy', async () => {
    await signIn('pharmacy@medifly.demo');
    const other = getDb().orders.find((o) => o.pharmacyId === 'ph-airport' && o.status === 'awaiting-pharmacy')!;
    await expect(orderService.updateOrderStatus(other.id, 'pharmacy-confirmed')).rejects.toThrow(/your pharmacy/);
  });
});

describe('favourites', () => {
  it('toggles a saved product for the signed-in customer only', async () => {
    const customer = await signIn('customer@medifly.demo');
    const before = getDb().favorites[customer.id] ?? [];
    expect(await favoriteService.toggle('prd-paracetamol')).toBe(true);
    expect(getDb().favorites[customer.id]).toEqual(['prd-paracetamol', ...before]);
    expect(await favoriteService.toggle('prd-paracetamol')).toBe(false);
    expect(getDb().favorites[customer.id]).toEqual(before);
    authService.logout();
    await signIn('pharmacy@medifly.demo');
    await expect(favoriteService.toggle('prd-paracetamol')).rejects.toThrow(/permission/);
  });
});

describe('seed data', () => {
  it('covers every required order status', () => {
    const statuses = new Set(getDb().orders.map((o) => o.status));
    for (const s of ['awaiting-pharmacy', 'pharmacy-confirmed', 'preparing', 'ready-for-collection', 'courier-assigned', 'collected', 'en-route', 'delivered', 'cancelled', 'delivery-failed', 'rejected']) {
      expect(statuses.has(s as never)).toBe(true);
    }
    expect(getDb().orders.length).toBeGreaterThanOrEqual(20);
    expect(getDb().prescriptions.some((p) => p.status === 'pending')).toBe(true);
  });

  it('repairs malformed collections without wiping others', () => {
    const ordersBefore = getDb().orders.length;
    storageService.write('products', 'not-an-array');
    const db = loadDb();
    expect(Array.isArray(db.products)).toBe(true);
    expect(db.products.length).toBeGreaterThan(10);
    expect(db.orders.length).toBe(ordersBefore);
  });
});

describe('complete cross-role workflow', () => {
  it('customer → pharmacy → courier → customer → admin', async () => {
    const before = getAdminAnalytics(getDb()).kpis;

    // 1. Customer creates an order
    const customer = await signIn('customer@medifly.demo');
    await cartService.addItem(customer.id, 'prd-paracetamol', 'ph-community', 2);
    const order = await orderService.createOrder({
      customerId: customer.id,
      pharmacyId: 'ph-community',
      items: [{ productId: 'prd-paracetamol', quantity: 2 }],
      address: madina,
      deliveryMethod: 'motorcycle',
      paymentMethod: 'mobile-money',
      paymentMethodDetail: 'MTN MoMo (simulated)',
    });
    expect(order.status).toBe('awaiting-pharmacy');
    expect(order.reference).toMatch(/^MF-\d{4}-\d+$/);
    expect(order.paymentStatus).toBe('paid');
    expect(getDb().carts[customer.id].some((c) => c.productId === 'prd-paracetamol')).toBe(false);
    authService.logout();

    // 2–5. Pharmacy sees, confirms, prepares, marks ready
    const pharmacist = await signIn('pharmacy@medifly.demo');
    expect(getDb().orders.some((o) => o.id === order.id && o.pharmacyId === pharmacist.pharmacyId)).toBe(true);
    expect(selectNotificationsFor(getDb(), pharmacist).some((n) => n.body.includes(order.reference))).toBe(true);
    await orderService.updateOrderStatus(order.id, 'pharmacy-confirmed');
    await orderService.updateOrderStatus(order.id, 'preparing');
    await orderService.updateOrderStatus(order.id, 'ready-for-collection');
    authService.logout();

    // 6–10. Courier sees job, accepts, collects, en route, delivers
    const courier = await signIn('courier@medifly.demo');
    const jobs = jobsForCourier(getDb(), courier.courierId!);
    const job = jobs.open.find((j) => j.order.id === order.id);
    expect(job).toBeDefined();
    await deliveryService.acceptJob(job!.delivery.id);
    await deliveryService.updateDeliveryStatus(job!.delivery.id, 'at-pharmacy');
    await deliveryService.updateDeliveryStatus(job!.delivery.id, 'collected');
    await deliveryService.updateDeliveryStatus(job!.delivery.id, 'en-route');
    await deliveryService.updateDeliveryStatus(job!.delivery.id, 'delivered');
    authService.logout();

    // 11. Customer sees delivered
    await signIn('customer@medifly.demo');
    const finalOrder = await orderService.getOrder(order.id);
    expect(finalOrder.status).toBe('delivered');
    expect(finalOrder.timeline.map((t) => t.status)).toEqual([
      'placed',
      'awaiting-pharmacy',
      'pharmacy-confirmed',
      'preparing',
      'ready-for-collection',
      'courier-assigned',
      'collected',
      'en-route',
      'delivered',
    ]);
    authService.logout();

    // 12. Admin metrics reflect the change
    const after = getAdminAnalytics(getDb()).kpis;
    expect(after.totalOrders).toBe(before.totalOrders + 1);
    expect(after.completedDeliveries).toBe(before.completedDeliveries + 1);
    expect(getDb().auditLogs.some((l) => l.action === 'order.created' && l.entityId === order.id)).toBe(true);
  });

  it('rejects invalid status jumps', async () => {
    await signIn('pharmacy@medifly.demo');
    const order = getDb().orders.find((o) => o.pharmacyId === 'ph-community' && o.status === 'awaiting-pharmacy' && !o.requiresPrescription)!;
    await expect(orderService.updateOrderStatus(order.id, 'ready-for-collection')).rejects.toThrow(/Cannot move order/);
  });

  it('never progresses a prescription order without pharmacist approval', async () => {
    await signIn('pharmacy@medifly.demo');
    const rxOrder = getDb().orders.find((o) => o.pharmacyId === 'ph-community' && o.prescriptionStatus === 'pending')!;
    await expect(orderService.updateOrderStatus(rxOrder.id, 'pharmacy-confirmed')).rejects.toThrow(/pharmacist must approve/);
    await prescriptionService.reviewPrescription(rxOrder.prescriptionId!, 'approved', 'Demo check complete');
    const updated = await orderService.updateOrderStatus(rxOrder.id, 'pharmacy-confirmed');
    expect(updated.status).toBe('pharmacy-confirmed');
  });

  it('rejecting a linked prescription rejects the order and restocks', async () => {
    await signIn('pharmacy@medifly.demo');
    const rxOrder = getDb().orders.find((o) => o.pharmacyId === 'ph-community' && o.prescriptionStatus === 'pending')!;
    const inv = () => getDb().inventory.find((i) => i.pharmacyId === 'ph-community' && i.productId === rxOrder.items[0].productId)!.stock;
    const stockBefore = inv();
    await prescriptionService.reviewPrescription(rxOrder.prescriptionId!, 'rejected', 'Prescription expired');
    const o = getDb().orders.find((x) => x.id === rxOrder.id)!;
    expect(o.status).toBe('rejected');
    expect(o.paymentStatus).toBe('refund-requested');
    expect(inv()).toBe(stockBefore + rxOrder.items[0].quantity);
  });

  it('requires a prescription when ordering prescription-only items', async () => {
    const customer = await signIn('customer@medifly.demo');
    await expect(
      orderService.createOrder({ customerId: customer.id, pharmacyId: 'ph-community', items: [{ productId: 'prd-metformin', quantity: 1 }], address: madina, deliveryMethod: 'motorcycle', paymentMethod: 'card' })
    ).rejects.toThrow(/attach a prescription/);
  });

  it('declined simulated payment creates no order', async () => {
    const customer = await signIn('customer@medifly.demo');
    const count = getDb().orders.length;
    await expect(
      orderService.createOrder({ customerId: customer.id, pharmacyId: 'ph-community', items: [{ productId: 'prd-ors', quantity: 1 }], address: madina, deliveryMethod: 'motorcycle', paymentMethod: 'card', payment: { simulateDecline: true } })
    ).rejects.toThrow(/declined/);
    expect(getDb().orders.length).toBe(count);
  });

  it('courier can report a failed delivery with a reason', async () => {
    await signIn('admin@medifly.demo');
    const enRoute = getDb().deliveries.find((d) => d.status === 'en-route')!;
    await expect(deliveryService.updateDeliveryStatus(enRoute.id, 'failed', '')).rejects.toThrow(/reason/);
    await deliveryService.updateDeliveryStatus(enRoute.id, 'failed', 'Address not found');
    expect(getDb().orders.find((o) => o.id === enRoute.orderId)!.status).toBe('delivery-failed');
    await deliveryService.intervene(enRoute.id, 'redispatch');
    expect(getDb().orders.find((o) => o.id === enRoute.orderId)!.status).toBe('ready-for-collection');
    expect(getDb().deliveries.find((d) => d.id === enRoute.id)!.status).toBe('open');
  });
});
