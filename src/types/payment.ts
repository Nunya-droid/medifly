export type PaymentMethod = 'mobile-money' | 'card' | 'cash-on-delivery';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refund-requested' | 'refunded' | 'cash-due';

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  method: PaymentMethod;
  /** Display-only descriptor such as a network name. Never credentials. */
  methodDetail?: string;
  amount: number;
  status: PaymentStatus;
  /** Simulated transaction reference. */
  reference: string;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}
