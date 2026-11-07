import type { ProductCategory, ProductType, DeliveryMethod, PaymentMethod, TicketCategory } from '@/types';

export const CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: 'pain-fever', label: 'Pain & fever' },
  { id: 'vitamins', label: 'Vitamins & supplements' },
  { id: 'digestive', label: 'Digestive health' },
  { id: 'first-aid', label: 'First aid' },
  { id: 'devices', label: 'Health devices' },
  { id: 'chronic-care', label: 'Chronic care' },
  { id: 'antibiotics', label: 'Antibiotics' },
  { id: 'respiratory', label: 'Respiratory' },
  { id: 'personal-care', label: 'Personal care' },
  { id: 'mother-baby', label: 'Mother & baby' },
];

export const categoryLabel = (id: ProductCategory) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const PRODUCT_TYPES: { id: ProductType; label: string }[] = [
  { id: 'medicine', label: 'Medicine' },
  { id: 'supplement', label: 'Supplement' },
  { id: 'device', label: 'Device' },
  { id: 'first-aid', label: 'First aid' },
  { id: 'personal-care', label: 'Personal care' },
];

export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  motorcycle: 'Motorcycle courier',
  vehicle: 'Vehicle delivery',
  drone: 'Drone (simulated)',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  'mobile-money': 'Mobile Money (simulated)',
  card: 'Bank card (simulated)',
  'cash-on-delivery': 'Cash on delivery',
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  'delivery-delay': 'Delivery delay',
  'missing-item': 'Missing or wrong item',
  payment: 'Payment or refund',
  prescription: 'Prescription',
  account: 'Account',
  other: 'Other',
};

export const GHANA_REGIONS = ['Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Volta', 'Northern'];

export const DEMO_DISCLAIMER =
  'MediFly is an academic demonstration project. All customers, pharmacies, products, orders, payments and delivery activities shown are fictional. This platform does not process real prescriptions, payments or deliveries.';

export const DEMO_PASSWORD = 'Demo123!';

export const DEMO_ACCOUNTS = [
  { role: 'customer', label: 'Customer', email: 'customer@medifly.demo', description: 'Order, pay and track' },
  { role: 'pharmacy', label: 'Pharmacy', email: 'pharmacy@medifly.demo', description: 'Confirm, review, prepare' },
  { role: 'courier', label: 'Courier', email: 'courier@medifly.demo', description: 'Collect and deliver' },
  { role: 'admin', label: 'Administrator', email: 'admin@medifly.demo', description: 'Monitor operations' },
] as const;

export const ROLE_HOME: Record<'customer' | 'pharmacy' | 'courier' | 'admin', string> = {
  customer: '/customer/dashboard',
  pharmacy: '/pharmacy/dashboard',
  courier: '/courier/dashboard',
  admin: '/admin/dashboard',
};
