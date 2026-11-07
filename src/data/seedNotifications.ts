import type { AppNotification, AuditLog, Order, PlatformSettings, SupportTicket } from '@/types';

export function seedNotifications(now: number, orders: Order[]): AppNotification[] {
  const ago = (m: number) => new Date(now - m * 60000).toISOString();
  const byStatus = (s: Order['status'], customer?: string) => orders.find((o) => o.status === s && (!customer || o.customerId === customer));
  const enRoute = byStatus('en-route', 'usr-customer-ama');
  const rxPending = orders.find((o) => o.prescriptionStatus === 'pending' && o.customerId === 'usr-customer-ama');
  const newest = [...orders].filter((o) => o.pharmacyId === 'ph-community' && o.status === 'awaiting-pharmacy').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const ready = orders.find((o) => o.status === 'ready-for-collection' && o.pharmacyId === 'ph-community');
  const offered = orders.find((o) => o.status === 'ready-for-collection' && o.pharmacyId === 'ph-madina-care');
  const failed = byStatus('delivery-failed');
  const delayed = byStatus('collected');

  const list: Omit<AppNotification, 'id'>[] = [
    // Customer
    { userId: 'usr-customer-ama', type: 'delivery', title: 'Your order is on the way', body: `${enRoute?.reference} is en route with your courier (simulated tracking).`, link: `/customer/orders/${enRoute?.id}`, read: false, createdAt: ago(30) },
    { userId: 'usr-customer-ama', type: 'prescription', title: 'Prescription received', body: `A pharmacist will review the prescription for ${rxPending?.reference}.`, link: `/customer/orders/${rxPending?.id}`, read: false, createdAt: ago(21) },
    { userId: 'usr-customer-ama', type: 'order', title: 'Order delivered', body: 'Your Airport Residential delivery was handed over.', link: '/customer/orders', read: true, createdAt: ago(26 * 60 - 70) },
    // Pharmacy (Community Pharmacy)
    { role: 'pharmacy', pharmacyId: 'ph-community', type: 'order', title: 'New order received', body: `${newest?.reference} is awaiting stock confirmation.`, link: '/pharmacy/orders', read: false, createdAt: ago(8) },
    { role: 'pharmacy', pharmacyId: 'ph-community', type: 'prescription', title: 'Prescription review needed', body: `${rxPending?.reference} includes a prescription-only item.`, link: '/pharmacy/prescriptions', read: false, createdAt: ago(22) },
    { role: 'pharmacy', pharmacyId: 'ph-community', type: 'prescription', title: 'Standalone prescription submitted', body: 'Ama Mensah submitted a prescription for review.', link: '/pharmacy/prescriptions', read: true, createdAt: ago(240) },
    { role: 'pharmacy', pharmacyId: 'ph-community', type: 'delivery', title: 'Delivery failed', body: `${failed?.reference}: ${failed?.failureReason}`, link: '/pharmacy/dispatch', read: true, createdAt: ago(29 * 60) },
    // Courier
    { role: 'courier', courierId: 'cr-yaw', type: 'delivery', title: 'Delivery offered to you', body: `${offered?.reference} from Madina Care Pharmacy is waiting for your response.`, link: '/courier/jobs', read: false, createdAt: ago(40) },
    { role: 'courier', type: 'delivery', title: 'New job available', body: `${ready?.reference} is ready for collection at Community Pharmacy.`, link: '/courier/jobs', read: false, createdAt: ago(26) },
    // Admin
    { role: 'admin', type: 'exception', title: 'Delivery running late', body: `${delayed?.reference} has exceeded its estimated window.`, link: '/admin/deliveries', read: false, createdAt: ago(20) },
    { role: 'admin', type: 'partner', title: 'New pharmacy application', body: 'Osu Wellness Pharmacy submitted a partner application.', link: '/admin/partners', read: false, createdAt: ago(3 * 24 * 60) },
    { role: 'admin', type: 'partner', title: 'New courier application', body: 'Kojo Frimpong applied as a motorcycle courier.', link: '/admin/partners', read: true, createdAt: ago(2 * 24 * 60) },
    { role: 'admin', type: 'support', title: 'New support ticket', body: 'Delivery failed — customer requesting redelivery.', link: '/admin/support', read: false, createdAt: ago(28 * 60) },
  ];
  return list.map((n, i) => ({ ...n, id: `ntf-seed-${i + 1}` }));
}

export function seedTickets(now: number, orders: Order[]): SupportTicket[] {
  const ago = (m: number) => new Date(now - m * 60000).toISOString();
  const failed = orders.find((o) => o.status === 'delivery-failed')!;
  const delayed = orders.find((o) => o.status === 'collected')!;
  const cancelled = orders.find((o) => o.status === 'cancelled' && o.paymentStatus === 'refund-requested')!;
  const delivered = orders.find((o) => o.status === 'delivered' && o.customerId === 'usr-customer-akua')!;
  const rx = orders.find((o) => o.prescriptionStatus === 'info-requested')!;
  return [
    { id: 'tkt-1', reference: 'TCK-2041', customerId: failed.customerId, orderId: failed.id, category: 'delivery-delay', priority: 'high', status: 'open', subject: 'Missed delivery at hostel', message: 'I was in a lecture and missed the calls. Can the order be redelivered this evening?', messages: [{ from: 'customer', author: 'Efe Agyeman', body: 'I was in a lecture and missed the calls. Can the order be redelivered this evening?', at: ago(28 * 60) }], createdAt: ago(28 * 60), updatedAt: ago(28 * 60) },
    { id: 'tkt-2', reference: 'TCK-2042', customerId: delayed.customerId, orderId: delayed.id, category: 'delivery-delay', priority: 'medium', status: 'in-progress', subject: 'Order taking longer than estimated', message: 'The tracking says collected but it has been a while.', assignedTo: 'Efua Sarpong', messages: [{ from: 'customer', author: 'Yaa Darko', body: 'The tracking says collected but it has been a while.', at: ago(18) }, { from: 'support', author: 'Efua Sarpong', body: 'Thanks Yaa — we have contacted the courier and will update you shortly.', at: ago(12) }], createdAt: ago(18), updatedAt: ago(12) },
    { id: 'tkt-3', reference: 'TCK-2039', customerId: cancelled.customerId, orderId: cancelled.id, category: 'payment', priority: 'medium', status: 'open', subject: 'Refund for cancelled order', message: 'I cancelled before preparation. When will the refund arrive?', messages: [{ from: 'customer', author: 'Kofi Owusu', body: 'I cancelled before preparation. When will the refund arrive?', at: ago(3 * 24 * 60 - 30) }], createdAt: ago(3 * 24 * 60 - 30), updatedAt: ago(3 * 24 * 60 - 30) },
    { id: 'tkt-4', reference: 'TCK-2035', customerId: delivered.customerId, orderId: delivered.id, category: 'missing-item', priority: 'low', status: 'resolved', subject: 'Receipt not showing', message: 'I paid cash but cannot see a receipt.', assignedTo: 'Efua Sarpong', resolutionNotes: 'Receipt regenerated after cash payment was recorded.', messages: [{ from: 'customer', author: 'Akua Boateng', body: 'I paid cash but cannot see a receipt.', at: ago(2 * 24 * 60 - 20) }, { from: 'support', author: 'Efua Sarpong', body: 'Your receipt is now available under My Orders.', at: ago(2 * 24 * 60 - 5) }], createdAt: ago(2 * 24 * 60 - 20), updatedAt: ago(2 * 24 * 60 - 5) },
    { id: 'tkt-5', reference: 'TCK-2043', customerId: rx.customerId, orderId: rx.id, category: 'prescription', priority: 'medium', status: 'awaiting-customer', subject: 'Pharmacist asked for more information', message: 'What do I need to send for my prescription?', assignedTo: 'Efua Sarpong', messages: [{ from: 'customer', author: 'Akua Boateng', body: 'What do I need to send for my prescription?', at: ago(150) }, { from: 'support', author: 'Efua Sarpong', body: 'The pharmacist needs a clearer photo showing the prescriber details. You can re-upload from the order page.', at: ago(120) }], createdAt: ago(150), updatedAt: ago(120) },
    { id: 'tkt-6', reference: 'TCK-2030', customerId: 'usr-customer-ama', category: 'account', priority: 'low', status: 'closed', subject: 'Change phone number', message: 'Please update my phone number on file.', assignedTo: 'Efua Sarpong', resolutionNotes: 'Customer updated number via profile.', messages: [{ from: 'customer', author: 'Ama Mensah', body: 'Please update my phone number on file.', at: ago(9 * 24 * 60) }], createdAt: ago(9 * 24 * 60), updatedAt: ago(9 * 24 * 60 - 60) },
  ];
}

export function seedAuditLogs(now: number, orders: Order[]): AuditLog[] {
  const logs: AuditLog[] = [];
  let i = 0;
  for (const o of orders) {
    logs.push({ id: `aud-seed-${++i}`, action: 'order.created', actorId: o.customerId, actorName: o.address.recipientName, actorRole: 'customer', entityType: 'order', entityId: o.id, summary: `Created order ${o.reference}`, at: o.createdAt });
    const last = o.timeline[o.timeline.length - 1];
    if (o.timeline.length > 2) {
      logs.push({ id: `aud-seed-${++i}`, action: 'order.status', actorId: last.actor, actorName: last.actor === 'pharmacy' ? 'Pharmacy staff' : last.actor === 'courier' ? 'Courier' : 'Customer', actorRole: last.actor, entityType: 'order', entityId: o.id, summary: `${o.reference} → ${last.status}`, at: last.at });
    }
  }
  logs.push(
    { id: `aud-seed-${++i}`, action: 'partner.status', actorId: 'usr-admin-efua', actorName: 'Efua Sarpong', actorRole: 'admin', entityType: 'pharmacy', entityId: 'ph-airport', summary: 'Verified Airport Pharmacy (demo verification)', at: new Date(now - 90 * 86400000).toISOString() },
    { id: `aud-seed-${++i}`, action: 'stock.updated', actorId: 'usr-pharmacy-kwame', actorName: 'Kwame Asante', actorRole: 'pharmacy', entityType: 'inventory', entityId: 'inv-community-saline-spray', summary: 'Marked Saline Nasal Spray unavailable at Community Pharmacy', at: new Date(now - 2 * 86400000).toISOString() }
  );
  return logs.sort((a, b) => b.at.localeCompare(a.at));
}

export function seedSettings(): PlatformSettings {
  return {
    fees: {
      motorcycle: { base: 0, perKm: 1.2, speedKmh: 28, enabled: true },
      vehicle: { base: 10, perKm: 1.8, speedKmh: 22, enabled: true },
      drone: { base: 6, perKm: 1.0, speedKmh: 60, enabled: true },
    },
    droneConditions: 'favourable',
    cashOnDeliveryEnabled: true,
    courierPayoutShare: 0.7,
    notifyCustomersBySms: false,
    notifyPharmaciesOnNewOrder: true,
    supportPhone: '+233 30 250 0000',
    supportEmail: 'support@medifly.demo',
    appVersion: '1.0.0-demo',
    simulatedDelayMs: 350,
  };
}
