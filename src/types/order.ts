import type { DeliveryMethod } from './delivery';
import type { PaymentMethod, PaymentStatus } from './payment';
import type { PrescriptionStatus } from './prescription';
import type { Role } from './user';

export type OrderStatus =
  | 'placed'
  | 'awaiting-pharmacy'
  | 'pharmacy-confirmed'
  | 'preparing'
  | 'ready-for-collection'
  | 'courier-assigned'
  | 'collected'
  | 'en-route'
  | 'delivered'
  | 'rejected'
  | 'cancelled'
  | 'delivery-failed';

export interface OrderItem {
  productId: string;
  name: string;
  strength?: string;
  packSize: string;
  quantity: number;
  unitPrice: number;
  requiresPrescription: boolean;
}

export interface DeliveryAddress {
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  serviceAreaId: string;
  area: string;
  landmark: string;
  instructions?: string;
}

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  actor: Role | 'system';
  note?: string;
}

export interface Order {
  id: string;
  reference: string;
  customerId: string;
  pharmacyId: string;
  items: OrderItem[];
  status: OrderStatus;
  requiresPrescription: boolean;
  prescriptionId?: string;
  /** 'not-required' when no item needs a prescription. */
  prescriptionStatus: PrescriptionStatus | 'not-required';
  address: DeliveryAddress;
  deliveryMethod: DeliveryMethod;
  deliveryId?: string;
  courierId?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  etaMinutes: { min: number; max: number };
  recommendationSummary?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  failureReason?: string;
  timeline: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  pharmacyId: string;
  items: { productId: string; quantity: number }[];
  address: DeliveryAddress;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  paymentMethodDetail?: string;
  prescriptionId?: string;
}
