import type { Payment, PaymentMethod } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';
import { authService } from './authService';
import { auditEntry } from './auditService';
import { buildNotifications } from './notificationService';
import { createId, randomReference } from '@/utils/id';

/**
 * SIMULATED payments. No real money moves and no card numbers, Mobile Money PINs or other
 * credentials are ever requested or stored. Only a display label (e.g. network name) is kept.
 */
export interface DemoPaymentInput {
  method: PaymentMethod;
  amount: number;
  /** Display-only label, e.g. "MTN MoMo (simulated)". */
  methodDetail?: string;
  /** Demo switch to rehearse a declined payment. */
  simulateDecline?: boolean;
}

export interface DemoPaymentResult {
  approved: boolean;
  reference: string;
  status: Payment['status'];
}

export function authorizeDemoPayment(input: DemoPaymentInput): DemoPaymentResult {
  if (!(input.amount > 0)) throw new ServiceError('VALIDATION', 'Payment amount must be greater than zero.');
  if (input.method === 'cash-on-delivery') {
    if (!getDb().settings.cashOnDeliveryEnabled) throw new ServiceError('VALIDATION', 'Cash on delivery is currently disabled.');
    return { approved: true, reference: randomReference('COD'), status: 'cash-due' };
  }
  if (input.simulateDecline) {
    throw new ServiceError('VALIDATION', 'The simulated payment was declined. No money was taken — choose another method or try again.');
  }
  return { approved: true, reference: randomReference('SIM'), status: 'paid' };
}

export const paymentService = {
  /** Standalone simulated authorisation (used by checkout before order creation). */
  processDemoPayment(input: DemoPaymentInput): Promise<DemoPaymentResult> {
    return request(() => authorizeDemoPayment(input), { delay: 900 });
  },

  requestRefund(paymentId: string, reason: string): Promise<Payment> {
    return request(() => {
      const user = authService.requireUser(['customer', 'admin']);
      const db = getDb();
      const payment = db.payments.find((p) => p.id === paymentId);
      if (!payment) throw new ServiceError('NOT_FOUND', 'Payment not found.');
      if (user.role === 'customer' && payment.customerId !== user.id) throw new ServiceError('FORBIDDEN', 'Not your payment.');
      if (payment.status !== 'paid') throw new ServiceError('INVALID_TRANSITION', 'Only completed payments can be refunded.');
      if (!reason.trim()) throw new ServiceError('VALIDATION', 'Please give a reason for the refund.');
      const next: Payment = { ...payment, status: 'refund-requested', refundReason: reason, updatedAt: nowIso() };
      commit({
        payments: db.payments.map((p) => (p.id === paymentId ? next : p)),
        orders: db.orders.map((o) => (o.id === payment.orderId ? { ...o, paymentStatus: 'refund-requested' } : o)),
        notifications: [...buildNotifications([{ role: 'admin', type: 'support', title: 'Refund requested', body: `${payment.reference}: ${reason}`, link: '/admin/payments' }]), ...db.notifications],
      });
      return next;
    });
  },

  /** Admin: approve (simulated refund) or decline a refund request. */
  processRefund(paymentId: string, decision: 'approve' | 'decline', note?: string): Promise<Payment> {
    return request(() => {
      const admin = authService.requireUser(['admin']);
      const db = getDb();
      const payment = db.payments.find((p) => p.id === paymentId);
      if (!payment) throw new ServiceError('NOT_FOUND', 'Payment not found.');
      if (payment.status !== 'refund-requested') throw new ServiceError('INVALID_TRANSITION', 'There is no pending refund request for this payment.');
      const status: Payment['status'] = decision === 'approve' ? 'refunded' : 'paid';
      const next: Payment = { ...payment, status, refundedAt: decision === 'approve' ? nowIso() : undefined, refundReason: note ? `${payment.refundReason ?? ''} — ${note}` : payment.refundReason, updatedAt: nowIso() };
      const order = db.orders.find((o) => o.id === payment.orderId);
      commit({
        payments: db.payments.map((p) => (p.id === paymentId ? next : p)),
        orders: db.orders.map((o) => (o.id === payment.orderId ? { ...o, paymentStatus: status } : o)),
        notifications: [
          ...buildNotifications([
            { userId: payment.customerId, type: 'order', title: decision === 'approve' ? 'Refund processed (simulated)' : 'Refund request declined', body: `${order?.reference ?? payment.reference}${note ? `: ${note}` : ''}`, link: order ? `/customer/orders/${order.id}` : '/customer/orders' },
          ]),
          ...db.notifications,
        ],
        auditLogs: [auditEntry(admin, 'refund.processed', 'payment', paymentId, `Refund ${decision === 'approve' ? 'approved' : 'declined'} for ${order?.reference ?? payment.reference} (simulated)`), ...db.auditLogs],
      });
      return next;
    });
  },

  createRecord(orderId: string, customerId: string, input: DemoPaymentInput, result: DemoPaymentResult): Payment {
    const at = nowIso();
    return { id: createId('pay'), orderId, customerId, method: input.method, methodDetail: input.methodDetail, amount: input.amount, status: result.status, reference: result.reference, createdAt: at, updatedAt: at };
  },
};
