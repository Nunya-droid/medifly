import type { AppNotification, Database, User } from '@/types';
import { createId } from '@/utils/id';
import { commit, getDb } from './db';
import { request } from './api';

type NewNotification = Omit<AppNotification, 'id' | 'read' | 'createdAt'>;

export function buildNotifications(list: NewNotification[]): AppNotification[] {
  const at = new Date().toISOString();
  return list.map((n) => ({ ...n, id: createId('ntf'), read: false, createdAt: at }));
}

/** Whether a notification is addressed to this user. */
export function isForUser(n: AppNotification, user: User): boolean {
  if (n.userId) return n.userId === user.id;
  if (n.role !== user.role) return false;
  if (n.pharmacyId && n.pharmacyId !== user.pharmacyId) return false;
  if (n.courierId && n.courierId !== user.courierId) return false;
  return true;
}

export function selectNotificationsFor(db: Database, user: User | null): AppNotification[] {
  if (!user) return [];
  return db.notifications.filter((n) => isForUser(n, user)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const notificationService = {
  async markRead(id: string) {
    return request(() => {
      const db = getDb();
      commit({ notifications: db.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    }, { delay: 0 });
  },
  async markAllRead(user: User) {
    return request(() => {
      const db = getDb();
      commit({ notifications: db.notifications.map((n) => (isForUser(n, user) ? { ...n, read: true } : n)) });
    }, { delay: 100 });
  },
  getForUser(user: User) {
    return selectNotificationsFor(getDb(), user);
  },
};
