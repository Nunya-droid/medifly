import type {
  Delivery,
  DeliveryMethod,
  DeliveryStatus,
  InventoryItem,
  Order,
  OrderEvent,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Pharmacy,
  Prescription,
  PrescriptionStatus,
  Product,
  ServiceArea,
  User,
} from '@/types';
import { ORDER_FLOW } from '@/constants/status';
import { roadDistanceKm, round1, roundFee } from '@/utils/geo';

interface OrderSpec {
  customer: string;
  pharmacy: string;
  address?: number;
  items: [string, number][];
  status: OrderStatus;
  method?: DeliveryMethod;
  minutesAgo: number;
  pay: PaymentMethod;
  courier?: string;
  offeredTo?: string;
  rx?: PrescriptionStatus;
  reason?: string;
  delayed?: boolean;
  paymentOverride?: PaymentStatus;
}

const D = 24 * 60;

const SPECS: OrderSpec[] = [
  { customer: 'usr-customer-ama', pharmacy: 'ph-community', items: [['prd-paracetamol', 2], ['prd-ors', 1]], status: 'delivered', minutesAgo: 12 * D + 200, pay: 'mobile-money', courier: 'cr-yaw' },
  { customer: 'usr-customer-kofi', pharmacy: 'ph-adenta', items: [['prd-vitamin-c', 1], ['prd-zinc', 2]], status: 'delivered', minutesAgo: 11 * D + 90, pay: 'card', courier: 'cr-kwesi' },
  { customer: 'usr-customer-efe', pharmacy: 'ph-east-legon', items: [['prd-paracetamol', 1], ['prd-cough-syrup', 1]], status: 'delivered', method: 'drone', minutesAgo: 10 * D + 300, pay: 'mobile-money', courier: 'cr-skylift' },
  { customer: 'usr-customer-yaa', pharmacy: 'ph-east-legon', items: [['prd-bp-monitor', 1]], status: 'delivered', method: 'vehicle', minutesAgo: 9 * D + 120, pay: 'card', courier: 'cr-esi' },
  { customer: 'usr-customer-akua', pharmacy: 'ph-madina-care', items: [['prd-antacid', 1], ['prd-ors', 2]], status: 'delivered', minutesAgo: 8 * D + 400, pay: 'cash-on-delivery', courier: 'cr-kwesi' },
  { customer: 'usr-customer-ama', pharmacy: 'ph-community', address: 1, items: [['prd-multivitamin', 1], ['prd-thermometer', 1]], status: 'delivered', minutesAgo: 7 * D + 260, pay: 'mobile-money', courier: 'cr-yaw' },
  { customer: 'usr-customer-nii', pharmacy: 'ph-airport', items: [['prd-masks', 1], ['prd-sanitiser', 1]], status: 'delivered', minutesAgo: 6 * D + 180, pay: 'card', courier: 'cr-abena' },
  { customer: 'usr-customer-ama', pharmacy: 'ph-community', items: [['prd-glucose-strips', 1]], status: 'cancelled', minutesAgo: 6 * D + 30, pay: 'mobile-money', reason: 'Ordered by mistake (customer cancelled).', paymentOverride: 'refunded' },
  { customer: 'usr-customer-kofi', pharmacy: 'ph-adenta', items: [['prd-amlodipine', 1]], status: 'delivered', minutesAgo: 5 * D + 220, pay: 'mobile-money', courier: 'cr-kwesi', rx: 'approved' },
  { customer: 'usr-customer-efe', pharmacy: 'ph-community', items: [['prd-first-aid-kit', 1]], status: 'delivered', minutesAgo: 4 * D + 140, pay: 'mobile-money', courier: 'cr-yaw' },
  { customer: 'usr-customer-kofi', pharmacy: 'ph-madina-care', items: [['prd-glucose-strips', 1]], status: 'cancelled', minutesAgo: 3 * D + 120, pay: 'mobile-money', reason: 'Customer found the item elsewhere.', paymentOverride: 'refund-requested' },
  { customer: 'usr-customer-yaa', pharmacy: 'ph-east-legon', items: [['prd-insulin', 1]], status: 'delivered', method: 'vehicle', minutesAgo: 3 * D + 60, pay: 'card', courier: 'cr-esi', rx: 'approved' },
  { customer: 'usr-customer-nii', pharmacy: 'ph-airport', items: [['prd-ibuprofen', 1]], status: 'rejected', minutesAgo: 2 * D + 300, pay: 'card', reason: 'Requested pack size not in stock; customer advised to reorder.', paymentOverride: 'refunded' },
  { customer: 'usr-customer-akua', pharmacy: 'ph-community', items: [['prd-paracetamol', 1], ['prd-vitamin-c', 1]], status: 'delivered', minutesAgo: 2 * D + 100, pay: 'cash-on-delivery', courier: 'cr-yaw' },
  { customer: 'usr-customer-efe', pharmacy: 'ph-community', items: [['prd-antiseptic', 1], ['prd-bandages', 1]], status: 'delivery-failed', minutesAgo: 30 * 60, pay: 'mobile-money', courier: 'cr-yaw', reason: 'Recipient unreachable at hostel gate after 3 calls.' },
  { customer: 'usr-customer-ama', pharmacy: 'ph-community', address: 2, items: [['prd-masks', 1]], status: 'delivered', minutesAgo: 26 * 60, pay: 'mobile-money', courier: 'cr-yaw' },
  // Today — active pipeline
  { customer: 'usr-customer-akua', pharmacy: 'ph-adenta', items: [['prd-metformin', 1]], status: 'awaiting-pharmacy', minutesAgo: 180, pay: 'mobile-money', rx: 'info-requested' },
  { customer: 'usr-customer-ama', pharmacy: 'ph-community', items: [['prd-ors', 2], ['prd-zinc', 1]], status: 'en-route', minutesAgo: 75, pay: 'mobile-money', courier: 'cr-kwesi' },
  { customer: 'usr-customer-akua', pharmacy: 'ph-community', items: [['prd-paracetamol', 2]], status: 'courier-assigned', minutesAgo: 70, pay: 'cash-on-delivery', courier: 'cr-yaw' },
  { customer: 'usr-customer-yaa', pharmacy: 'ph-east-legon', items: [['prd-saline-spray', 1], ['prd-vitamin-c', 1]], status: 'collected', minutesAgo: 85, pay: 'card', courier: 'cr-abena', delayed: true },
  { customer: 'usr-customer-kofi', pharmacy: 'ph-community', items: [['prd-thermometer', 1], ['prd-sanitiser', 1]], status: 'ready-for-collection', minutesAgo: 50, pay: 'card' },
  { customer: 'usr-customer-akua', pharmacy: 'ph-madina-care', items: [['prd-cough-syrup', 1]], status: 'ready-for-collection', minutesAgo: 42, pay: 'mobile-money', offeredTo: 'cr-yaw' },
  { customer: 'usr-customer-efe', pharmacy: 'ph-community', items: [['prd-ibuprofen', 1], ['prd-masks', 1]], status: 'preparing', minutesAgo: 35, pay: 'mobile-money' },
  { customer: 'usr-customer-yaa', pharmacy: 'ph-community', items: [['prd-vitamin-c', 2]], status: 'pharmacy-confirmed', minutesAgo: 28, pay: 'card' },
  { customer: 'usr-customer-ama', pharmacy: 'ph-community', items: [['prd-amoxicillin', 1], ['prd-paracetamol', 1]], status: 'awaiting-pharmacy', minutesAgo: 22, pay: 'mobile-money', rx: 'pending' },
  { customer: 'usr-customer-nii', pharmacy: 'ph-airport', items: [['prd-first-aid-kit', 1]], status: 'awaiting-pharmacy', minutesAgo: 15, pay: 'card' },
  { customer: 'usr-customer-kofi', pharmacy: 'ph-community', items: [['prd-ors', 1], ['prd-antacid', 1]], status: 'awaiting-pharmacy', minutesAgo: 8, pay: 'cash-on-delivery' },
];

/** Minutes after creation at which each happy-path status is reached. */
const OFFSETS: Record<string, number> = {
  placed: 0,
  'awaiting-pharmacy': 0,
  'pharmacy-confirmed': 6,
  preparing: 9,
  'ready-for-collection': 24,
  'courier-assigned': 29,
  collected: 41,
  'en-route': 43,
  delivered: 72,
};

const METHOD_PREMIUM: Record<DeliveryMethod, number> = { motorcycle: 0, vehicle: 10, drone: 6 };

function deliveryStatusFor(order: OrderStatus, offered: boolean): DeliveryStatus {
  switch (order) {
    case 'ready-for-collection':
      return offered ? 'offered' : 'open';
    case 'courier-assigned':
      return 'accepted';
    case 'collected':
      return 'collected';
    case 'en-route':
      return 'en-route';
    case 'delivered':
      return 'delivered';
    case 'delivery-failed':
      return 'failed';
    case 'rejected':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export interface SeededOrders {
  orders: Order[];
  deliveries: Delivery[];
  payments: Payment[];
  prescriptions: Prescription[];
  nextSequence: number;
}

export function seedOrders(
  now: number,
  ctx: { users: User[]; products: Product[]; inventory: InventoryItem[]; pharmacies: Pharmacy[]; serviceAreas: ServiceArea[] }
): SeededOrders {
  const year = new Date(now).getFullYear();
  const orders: Order[] = [];
  const deliveries: Delivery[] = [];
  const payments: Payment[] = [];
  const prescriptions: Prescription[] = [];
  let seq = 1001;

  SPECS.forEach((spec, idx) => {
    const customer = ctx.users.find((u) => u.id === spec.customer)!;
    const pharmacy = ctx.pharmacies.find((p) => p.id === spec.pharmacy)!;
    const addr = customer.addresses![spec.address ?? 0];
    const area = ctx.serviceAreas.find((a) => a.id === addr.serviceAreaId)!;
    const method: DeliveryMethod = spec.method ?? 'motorcycle';
    const created = now - spec.minutesAgo * 60000;
    const at = (min: number) => new Date(Math.min(created + min * 60000, now - 60000)).toISOString();

    const items = spec.items.map(([productId, quantity]) => {
      const p = ctx.products.find((x) => x.id === productId)!;
      const inv = ctx.inventory.find((i) => i.productId === productId && i.pharmacyId === pharmacy.id);
      return { productId, name: p.name, strength: p.strength, packSize: p.packSize, quantity, unitPrice: inv?.price ?? 10, requiresPrescription: p.requiresPrescription };
    });
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const distanceKm = round1(roadDistanceKm(pharmacy, area));
    const deliveryFee = roundFee(area.baseFee + METHOD_PREMIUM[method] + Math.max(0, distanceKm - 3) * 1.2);
    const total = subtotal + deliveryFee;
    const id = `ord-${seq}`;
    const reference = `MF-${year}-${seq}`;
    seq++;

    // Timeline
    const timeline: OrderEvent[] = [];
    const terminalBranch = ['rejected', 'cancelled', 'delivery-failed'].includes(spec.status);
    let flowEnd: OrderStatus = spec.status;
    if (spec.status === 'rejected' || spec.status === 'cancelled') flowEnd = 'awaiting-pharmacy';
    if (spec.status === 'delivery-failed') flowEnd = 'en-route';
    for (const s of ORDER_FLOW) {
      const actor = s === 'placed' ? 'customer' : s === 'awaiting-pharmacy' ? 'system' : ['pharmacy-confirmed', 'preparing', 'ready-for-collection'].includes(s) ? 'pharmacy' : 'courier';
      timeline.push({ status: s, at: at(OFFSETS[s]), actor });
      if (s === flowEnd) break;
    }
    if (terminalBranch) {
      const actor = spec.status === 'cancelled' ? 'customer' : spec.status === 'rejected' ? 'pharmacy' : 'courier';
      const last = OFFSETS[flowEnd] ?? 0;
      timeline.push({ status: spec.status, at: at(last + 6), actor, note: spec.reason });
    }

    // Prescription
    const requiresPrescription = items.some((i) => i.requiresPrescription);
    let prescriptionId: string | undefined;
    if (requiresPrescription) {
      prescriptionId = `rx-${idx + 1}`;
      const status = spec.rx ?? 'approved';
      prescriptions.push({
        id: prescriptionId,
        customerId: customer.id,
        pharmacyId: pharmacy.id,
        orderId: id,
        fileName: `sample-prescription-${idx + 1}.png`,
        fileSize: 184_000 + idx * 1500,
        mimeType: 'image/png',
        isSampleDocument: true,
        patientName: addr.recipientName,
        customerNote: status === 'info-requested' ? 'Repeat prescription.' : undefined,
        status,
        pharmacistNote:
          status === 'approved'
            ? 'Demo review: details legible and consistent with the order.'
            : status === 'info-requested'
              ? 'Demo review: prescriber details are cut off. Please upload a clearer image.'
              : undefined,
        reviewedBy: status === 'pending' ? undefined : 'Pharmacist (demo)',
        reviewedAt: status === 'pending' ? undefined : at(5),
        submittedAt: at(0),
      });
    }

    // Payment
    let paymentStatus: PaymentStatus;
    if (spec.paymentOverride) paymentStatus = spec.paymentOverride;
    else if (spec.pay === 'cash-on-delivery') paymentStatus = spec.status === 'delivered' ? 'paid' : 'cash-due';
    else paymentStatus = 'paid';
    const paymentId = `pay-${seq - 1}`;
    payments.push({
      id: paymentId,
      orderId: id,
      customerId: customer.id,
      method: spec.pay,
      methodDetail: spec.pay === 'mobile-money' ? 'MTN MoMo (simulated)' : spec.pay === 'card' ? 'Visa •••• 4242 (test)' : 'Pay courier on delivery',
      amount: total,
      status: paymentStatus,
      reference: `SIM-${(1000000 + idx * 7919).toString(36).toUpperCase()}`,
      refundReason: paymentStatus === 'refunded' || paymentStatus === 'refund-requested' ? spec.reason : undefined,
      refundedAt: paymentStatus === 'refunded' ? at(30) : undefined,
      createdAt: at(0),
      updatedAt: at(OFFSETS[flowEnd] ?? 0),
    });

    // Delivery
    const deliveryId = `dlv-${seq - 1}`;
    const dStatus = deliveryStatusFor(spec.status, !!spec.offeredTo);
    const speed = method === 'drone' ? 60 : method === 'vehicle' ? 22 : 28;
    const travel = Math.round((distanceKm / speed) * 60);
    const etaMin = pharmacy.prepMinutes + travel + 10;
    const dEvents = timeline
      .filter((e) => ['ready-for-collection', 'courier-assigned', 'collected', 'en-route', 'delivered', 'delivery-failed'].includes(e.status))
      .map((e) => ({ status: deliveryStatusFor(e.status, false), at: e.at, note: e.note }));
    deliveries.push({
      id: deliveryId,
      orderId: id,
      method,
      courierId: ['accepted', 'collected', 'en-route', 'delivered', 'failed'].includes(dStatus) ? spec.courier : undefined,
      offeredToCourierId: spec.offeredTo,
      declinedBy: [],
      status: dStatus,
      distanceKm,
      fee: deliveryFee,
      payout: roundFee(deliveryFee * 0.7),
      etaMinutes: { min: etaMin, max: etaMin + 15 },
      events: dEvents,
      failureReason: spec.status === 'delivery-failed' ? spec.reason : undefined,
      delayed: spec.delayed,
      createdAt: at(0),
      updatedAt: timeline[timeline.length - 1].at,
    });

    orders.push({
      id,
      reference,
      customerId: customer.id,
      pharmacyId: pharmacy.id,
      items,
      status: spec.status,
      requiresPrescription,
      prescriptionId,
      prescriptionStatus: requiresPrescription ? (spec.rx ?? 'approved') : 'not-required',
      address: { recipientName: addr.recipientName, phone: addr.phone, region: addr.region, city: addr.city, serviceAreaId: addr.serviceAreaId, area: addr.area, landmark: addr.landmark, instructions: addr.instructions },
      deliveryMethod: method,
      deliveryId,
      courierId: ['courier-assigned', 'collected', 'en-route', 'delivered', 'delivery-failed'].includes(spec.status) ? spec.courier : undefined,
      subtotal,
      deliveryFee,
      total,
      paymentMethod: spec.pay,
      paymentStatus,
      paymentId,
      etaMinutes: { min: etaMin, max: etaMin + 15 },
      recommendationSummary:
        method === 'drone'
          ? 'Simulated drone scenario: route, product and conditions marked eligible in demo data.'
          : method === 'vehicle'
            ? 'Vehicle selected for product handling requirements.'
            : 'Motorcycle courier available within the service area.',
      rejectionReason: spec.status === 'rejected' ? spec.reason : undefined,
      cancellationReason: spec.status === 'cancelled' ? spec.reason : undefined,
      failureReason: spec.status === 'delivery-failed' ? spec.reason : undefined,
      timeline,
      createdAt: at(0),
      updatedAt: timeline[timeline.length - 1].at,
    });
  });

  // Standalone prescriptions (not yet linked to an order)
  prescriptions.push(
    { id: 'rx-standalone-1', customerId: 'usr-customer-ama', pharmacyId: 'ph-community', fileName: 'repeat-prescription-demo.png', fileSize: 211_400, mimeType: 'image/png', isSampleDocument: true, patientName: 'Grace Mensah', customerNote: "For my mother's repeat medicine.", status: 'pending', submittedAt: new Date(now - 4 * 3600000).toISOString() },
    { id: 'rx-standalone-2', customerId: 'usr-customer-nii', pharmacyId: 'ph-airport', fileName: 'scan-0042.pdf', fileSize: 402_800, mimeType: 'application/pdf', isSampleDocument: true, patientName: 'Nii Armah', status: 'rejected', pharmacistNote: 'Demo review: document unreadable. Please upload a clear photo.', reviewedBy: 'Pharmacist (demo)', reviewedAt: new Date(now - 20 * 3600000).toISOString(), submittedAt: new Date(now - 22 * 3600000).toISOString() }
  );

  return { orders, deliveries, payments, prescriptions, nextSequence: seq };
}
