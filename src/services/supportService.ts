import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';
import { authService } from './authService';
import { auditEntry } from './auditService';
import { buildNotifications } from './notificationService';
import { createId } from '@/utils/id';

export const supportService = {
  createTicket(input: { orderId?: string; category: TicketCategory; subject: string; message: string }): Promise<SupportTicket> {
    return request(() => {
      const user = authService.requireUser(['customer']);
      const db = getDb();
      if (input.subject.trim().length < 4) throw new ServiceError('VALIDATION', 'Please add a short subject.');
      if (input.message.trim().length < 10) throw new ServiceError('VALIDATION', 'Please describe the issue in a little more detail.');
      if (input.orderId && !db.orders.some((o) => o.id === input.orderId && o.customerId === user.id)) throw new ServiceError('FORBIDDEN', 'That order is not on your account.');
      const at = nowIso();
      const priority: TicketPriority = input.category === 'delivery-delay' || input.category === 'missing-item' ? 'high' : 'medium';
      const ticket: SupportTicket = {
        id: createId('tkt'),
        reference: `TCK-${db.meta.ticketSequence}`,
        customerId: user.id,
        orderId: input.orderId,
        category: input.category,
        priority,
        status: 'open',
        subject: input.subject.trim(),
        message: input.message.trim(),
        messages: [{ from: 'customer', author: user.name, body: input.message.trim(), at }],
        createdAt: at,
        updatedAt: at,
      };
      commit({
        tickets: [ticket, ...db.tickets],
        meta: { ...db.meta, ticketSequence: db.meta.ticketSequence + 1 },
        notifications: [
          ...buildNotifications([
            { role: 'admin', type: 'support', title: 'New support ticket', body: `${ticket.reference}: ${ticket.subject}`, link: '/admin/support' },
            { userId: user.id, type: 'support', title: 'Support request received', body: `${ticket.reference} — our team will respond in the app.`, link: '/customer/support' },
          ]),
          ...db.notifications,
        ],
      });
      return ticket;
    });
  },

  addMessage(ticketId: string, body: string): Promise<SupportTicket> {
    return request(() => {
      const user = authService.requireUser(['customer', 'admin']);
      const db = getDb();
      const t = db.tickets.find((x) => x.id === ticketId);
      if (!t) throw new ServiceError('NOT_FOUND', 'Ticket not found.');
      if (user.role === 'customer' && t.customerId !== user.id) throw new ServiceError('FORBIDDEN', 'Not your ticket.');
      if (!body.trim()) throw new ServiceError('VALIDATION', 'Message cannot be empty.');
      const at = nowIso();
      const fromSupport = user.role === 'admin';
      const next: SupportTicket = {
        ...t,
        status: fromSupport ? (t.status === 'open' ? 'in-progress' : t.status) : t.status === 'awaiting-customer' ? 'in-progress' : t.status,
        assignedTo: fromSupport ? t.assignedTo ?? user.name : t.assignedTo,
        messages: [...t.messages, { from: fromSupport ? 'support' : 'customer', author: user.name, body: body.trim(), at }],
        updatedAt: at,
      };
      commit({
        tickets: db.tickets.map((x) => (x.id === ticketId ? next : x)),
        notifications: [
          ...buildNotifications([
            fromSupport
              ? { userId: t.customerId, type: 'support', title: 'Support replied', body: `${t.reference}: ${body.trim().slice(0, 90)}`, link: '/customer/support' }
              : { role: 'admin', type: 'support', title: 'Customer replied', body: `${t.reference}: ${body.trim().slice(0, 90)}`, link: '/admin/support' },
          ]),
          ...db.notifications,
        ],
      });
      return next;
    }, { delay: 250 });
  },

  updateTicket(ticketId: string, patch: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string; resolutionNotes?: string }): Promise<SupportTicket> {
    return request(() => {
      const admin = authService.requireUser(['admin']);
      const db = getDb();
      const t = db.tickets.find((x) => x.id === ticketId);
      if (!t) throw new ServiceError('NOT_FOUND', 'Ticket not found.');
      if ((patch.status === 'resolved' || patch.status === 'closed') && !(patch.resolutionNotes ?? t.resolutionNotes)?.trim()) {
        throw new ServiceError('VALIDATION', 'Add resolution notes before resolving.');
      }
      const next = { ...t, ...patch, updatedAt: nowIso() };
      const resolved = patch.status && patch.status !== t.status && (patch.status === 'resolved' || patch.status === 'closed');
      commit({
        tickets: db.tickets.map((x) => (x.id === ticketId ? next : x)),
        notifications: resolved ? [...buildNotifications([{ userId: t.customerId, type: 'support', title: 'Support ticket resolved', body: `${t.reference}: ${next.resolutionNotes}`, link: '/customer/support' }]), ...db.notifications] : db.notifications,
        auditLogs: [auditEntry(admin, 'support.updated', 'ticket', ticketId, `${t.reference} updated${patch.status ? ` → ${patch.status}` : ''}`), ...db.auditLogs],
      });
      return next;
    });
  },
};
