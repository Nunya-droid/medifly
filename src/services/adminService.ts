import type { PlatformSettings, ServiceArea, VerificationStatus } from '@/types';
import { commit, getDb, resetDb } from './db';
import { request, ServiceError } from './api';
import { authService } from './authService';
import { auditEntry } from './auditService';
import { buildNotifications } from './notificationService';
import { fileStore } from './fileStore';

const PARTNER_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  pending: ['verified', 'rejected'],
  verified: ['suspended'],
  suspended: ['verified'],
  rejected: ['pending'],
};

export const adminService = {
  /** Demo verification only — never represents real regulatory approval. */
  setPartnerStatus(kind: 'pharmacy' | 'courier', id: string, status: VerificationStatus, note?: string): Promise<void> {
    return request(() => {
      const admin = authService.requireUser(['admin']);
      const db = getDb();
      const current = kind === 'pharmacy' ? db.pharmacies.find((p) => p.id === id) : db.couriers.find((c) => c.id === id);
      if (!current) throw new ServiceError('NOT_FOUND', 'Partner not found.');
      if (!PARTNER_TRANSITIONS[current.verification].includes(status)) throw new ServiceError('INVALID_TRANSITION', `Cannot change from ${current.verification} to ${status}.`);
      if ((status === 'rejected' || status === 'suspended') && !note?.trim()) throw new ServiceError('VALIDATION', 'Please record a reason.');
      const verb = { verified: current.verification === 'suspended' ? 'Reactivated' : 'Approved', rejected: 'Rejected', suspended: 'Suspended', pending: 'Reopened' }[status];
      const patch =
        kind === 'pharmacy'
          ? { pharmacies: db.pharmacies.map((p) => (p.id === id ? { ...p, verification: status, verificationNote: note?.trim() || p.verificationNote, acceptingOrders: status === 'verified' } : p)) }
          : { couriers: db.couriers.map((c) => (c.id === id ? { ...c, verification: status, verificationNote: note?.trim() || c.verificationNote, availability: status === 'verified' ? c.availability : ('offline' as const) } : c)) };
      const staff = kind === 'pharmacy' ? db.users.filter((u) => u.pharmacyId === id) : db.users.filter((u) => u.courierId === id);
      commit({
        ...patch,
        notifications: [
          ...buildNotifications(staff.map((u) => ({ userId: u.id, type: 'partner' as const, title: `Partner account ${verb.toLowerCase()}`, body: note?.trim() || 'Demo verification status updated by MediFly operations.', link: u.role === 'pharmacy' ? '/pharmacy/profile' : '/courier/profile' }))),
          ...db.notifications,
        ],
        auditLogs: [auditEntry(admin, 'partner.status', kind, id, `${verb} ${current.name} (demo verification)${note ? `: ${note}` : ''}`), ...db.auditLogs],
      });
    });
  },

  updateServiceArea(id: string, patch: Partial<Pick<ServiceArea, 'active' | 'supportedMethods' | 'baseFee' | 'etaRange' | 'droneRouteEligible' | 'notes'>>): Promise<ServiceArea> {
    return request(() => {
      const admin = authService.requireUser(['admin']);
      const db = getDb();
      const area = db.serviceAreas.find((a) => a.id === id);
      if (!area) throw new ServiceError('NOT_FOUND', 'Service area not found.');
      const next = { ...area, ...patch };
      if (next.supportedMethods.length === 0) throw new ServiceError('VALIDATION', 'Keep at least one delivery method.');
      if (!(next.baseFee > 0)) throw new ServiceError('VALIDATION', 'Base fee must be greater than zero.');
      if (next.etaRange.min <= 0 || next.etaRange.max < next.etaRange.min) throw new ServiceError('VALIDATION', 'Estimated delivery range is invalid.');
      if (!next.supportedMethods.includes('drone')) next.droneRouteEligible = false;
      commit({
        serviceAreas: db.serviceAreas.map((a) => (a.id === id ? next : a)),
        auditLogs: [auditEntry(admin, 'service-area.updated', 'service-area', id, `Updated ${area.name} service area`), ...db.auditLogs],
      });
      return next;
    });
  },

  updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return request(() => {
      const admin = authService.requireUser(['admin']);
      const db = getDb();
      const next = { ...db.settings, ...patch };
      for (const m of Object.values(next.fees)) {
        if (m.base < 0 || m.perKm < 0 || m.speedKmh <= 0) throw new ServiceError('VALIDATION', 'Fees must be zero or more and speeds above zero.');
      }
      commit({ settings: next, auditLogs: [auditEntry(admin, 'settings.updated', 'settings', 'platform', 'Updated platform settings'), ...db.auditLogs] });
      return next;
    });
  },

  /** Public "partner with us" interest form. Creates an admin notification (no account needed). */
  submitPartnerInterest(input: { pharmacyName: string; contactName: string; phone: string; area: string; message?: string }): Promise<void> {
    return request(() => {
      if (input.pharmacyName.trim().length < 2 || input.contactName.trim().length < 2) throw new ServiceError('VALIDATION', 'Pharmacy and contact names are required.');
      if (!/^(\+233|0)[\s\d]{9,13}$/.test(input.phone.trim())) throw new ServiceError('VALIDATION', 'Enter a Ghanaian phone number.');
      const db = getDb();
      commit({
        notifications: [
          ...buildNotifications([{ role: 'admin', type: 'partner', title: 'Pharmacy partnership interest', body: `${input.pharmacyName.trim()} (${input.area}) — ${input.contactName.trim()}, ${input.phone.trim()}${input.message ? `: ${input.message.trim()}` : ''}`, link: '/admin/partners' }]),
          ...db.notifications,
        ],
      });
    }, { delay: 700 });
  },

  /** Restores the original fictional dataset. Available to any signed-in demo user. */
  async resetDemoData(): Promise<void> {
    await request(() => undefined, { delay: 600 });
    await fileStore.clear();
    resetDb();
    const db = getDb();
    commit({ auditLogs: [auditEntry(null, 'demo.reset', 'database', 'all', 'Demo data reset to the initial dataset'), ...db.auditLogs] });
  },
};
