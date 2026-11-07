import type { Database, Prescription, PrescriptionStatus, User } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';
import { authService } from './authService';
import { auditEntry } from './auditService';
import { buildNotifications } from './notificationService';
import { transitionOrder } from './orderLifecycle';
import { createId } from '@/utils/id';

export const MAX_PRESCRIPTION_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PRESCRIPTION_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export interface SubmitPrescriptionInput {
  pharmacyId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileKey?: string;
  patientName: string;
  customerNote?: string;
}

export function visiblePrescriptions(db: Database, user: User | null, pharmacyOverride?: string): Prescription[] {
  if (!user) return [];
  let list = db.prescriptions;
  if (user.role === 'customer') list = list.filter((p) => p.customerId === user.id);
  else if (user.role === 'pharmacy') list = list.filter((p) => p.pharmacyId === user.pharmacyId);
  else if (user.role === 'admin' && pharmacyOverride) list = list.filter((p) => p.pharmacyId === pharmacyOverride);
  else if (user.role === 'courier') list = [];
  return [...list].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function validatePrescriptionFile(name: string, size: number, mime: string): string | null {
  if (!ACCEPTED_PRESCRIPTION_TYPES.includes(mime)) return 'Please upload a JPG, PNG, WEBP image or a PDF.';
  if (size > MAX_PRESCRIPTION_BYTES) return 'Files must be 5 MB or smaller.';
  if (!name) return 'The file needs a name.';
  return null;
}

export const prescriptionService = {
  /** Customer submits a (fictional, demo) prescription for pharmacist review. */
  submit(input: SubmitPrescriptionInput): Promise<Prescription> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      const db = getDb();
      const err = validatePrescriptionFile(input.fileName, input.fileSize, input.mimeType);
      if (err) throw new ServiceError('VALIDATION', err);
      const pharmacy = db.pharmacies.find((p) => p.id === input.pharmacyId && p.verification === 'verified');
      if (!pharmacy) throw new ServiceError('VALIDATION', 'Please choose a participating pharmacy.');
      if (!input.patientName.trim()) throw new ServiceError('VALIDATION', 'Patient name is required.');
      const rx: Prescription = {
        id: createId('rx'),
        customerId: user.id,
        pharmacyId: input.pharmacyId,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileKey: input.fileKey,
        isSampleDocument: !input.fileKey,
        patientName: input.patientName.trim(),
        customerNote: input.customerNote?.trim() || undefined,
        status: 'pending',
        submittedAt: nowIso(),
      };
      commit({
        prescriptions: [rx, ...db.prescriptions],
        notifications: [
          ...buildNotifications([
            { role: 'pharmacy', pharmacyId: pharmacy.id, type: 'prescription', title: 'Prescription submitted', body: `${user.name} submitted a prescription for review.`, link: '/pharmacy/prescriptions' },
            { userId: user.id, type: 'prescription', title: 'Prescription received', body: `${pharmacy.name} will review your prescription. This is a demo review only.`, link: '/customer/prescription' },
          ]),
          ...db.notifications,
        ],
        auditLogs: [auditEntry(user, 'prescription.submitted', 'prescription', rx.id, `Prescription submitted to ${pharmacy.name}`), ...db.auditLogs],
      });
      return rx;
    }, { delay: 900 });
  },

  /** Customer replaces the file after the pharmacist requested more information. */
  resubmit(prescriptionId: string, file: { fileName: string; fileSize: number; mimeType: string; fileKey?: string }, note?: string): Promise<Prescription> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      const db = getDb();
      const rx = db.prescriptions.find((p) => p.id === prescriptionId && p.customerId === user.id);
      if (!rx) throw new ServiceError('NOT_FOUND', 'Prescription not found.');
      if (rx.status !== 'info-requested') throw new ServiceError('INVALID_TRANSITION', 'This prescription is not awaiting more information.');
      const err = validatePrescriptionFile(file.fileName, file.fileSize, file.mimeType);
      if (err) throw new ServiceError('VALIDATION', err);
      const next: Prescription = { ...rx, ...file, isSampleDocument: !file.fileKey, status: 'pending', customerNote: note?.trim() || rx.customerNote, submittedAt: nowIso() };
      commit({
        prescriptions: db.prescriptions.map((p) => (p.id === rx.id ? next : p)),
        orders: db.orders.map((o) => (o.id === rx.orderId ? { ...o, prescriptionStatus: 'pending' } : o)),
        notifications: [...buildNotifications([{ role: 'pharmacy', pharmacyId: rx.pharmacyId, type: 'prescription', title: 'Prescription re-submitted', body: `${user.name} uploaded the requested information.`, link: '/pharmacy/prescriptions' }]), ...db.notifications],
      });
      return next;
    }, { delay: 800 });
  },

  /**
   * Pharmacist decision (demo). Approval here is a simulated workflow state, not a clinical
   * assessment. Rejecting a prescription linked to an order rejects that order.
   */
  reviewPrescription(prescriptionId: string, decision: Exclude<PrescriptionStatus, 'pending'>, note: string): Promise<Prescription> {
    return request(() => {
      const user = authService.requireUser(['pharmacy', 'admin']);
      const db = getDb();
      const rx = db.prescriptions.find((p) => p.id === prescriptionId);
      if (!rx) throw new ServiceError('NOT_FOUND', 'Prescription not found.');
      if (user.role === 'pharmacy' && rx.pharmacyId !== user.pharmacyId) throw new ServiceError('FORBIDDEN', 'You can only review prescriptions sent to your pharmacy.');
      if (rx.status !== 'pending') throw new ServiceError('INVALID_TRANSITION', 'Only pending prescriptions can be reviewed.');
      if ((decision === 'rejected' || decision === 'info-requested') && !note.trim()) throw new ServiceError('VALIDATION', 'Please add a note for the customer.');

      const next: Prescription = { ...rx, status: decision, pharmacistNote: note.trim() || undefined, reviewedBy: user.name, reviewedAt: nowIso() };
      let working: Database = { ...db, prescriptions: db.prescriptions.map((p) => (p.id === rx.id ? next : p)) };
      const order = rx.orderId ? working.orders.find((o) => o.id === rx.orderId) : undefined;
      if (order) {
        working = { ...working, orders: working.orders.map((o) => (o.id === order.id ? { ...o, prescriptionStatus: decision } : o)) };
        if (decision === 'rejected' && ['awaiting-pharmacy', 'placed', 'pharmacy-confirmed'].includes(order.status)) {
          working = { ...working, ...transitionOrder(working, order.id, 'rejected', user, { note: `Prescription not approved: ${note.trim()}` }) };
        }
      }
      const labels = { approved: 'approved (demo review)', rejected: 'not approved', 'info-requested': 'needs more information' } as const;
      const pharmacy = db.pharmacies.find((p) => p.id === rx.pharmacyId);
      commit({
        prescriptions: working.prescriptions,
        orders: working.orders,
        deliveries: working.deliveries,
        inventory: working.inventory,
        payments: working.payments,
        notifications: [
          ...buildNotifications([
            { userId: rx.customerId, type: 'prescription', title: `Prescription ${labels[decision]}`, body: `${pharmacy?.name}${note.trim() ? `: ${note.trim()}` : ''}`, link: order ? `/customer/orders/${order.id}` : '/customer/prescription' },
          ]),
          ...working.notifications,
        ],
        auditLogs: [auditEntry(user, 'prescription.reviewed', 'prescription', rx.id, `Prescription ${labels[decision]}${order ? ` for ${order.reference}` : ''}`), ...working.auditLogs],
      });
      return next;
    });
  },
};
