import type { Role, Session, User } from '@/types';
import { commit, getDb } from './db';
import { request, ServiceError, nowIso } from './api';
import { createId, demoDigest } from '@/utils/id';
import { auditEntry } from './auditService';

/**
 * DEMONSTRATION authentication only — not production-grade security.
 * The session is kept per browser tab (sessionStorage) so different roles can be
 * opened side by side in separate tabs while sharing the same demo data.
 */
const SESSION_KEY = 'medifly:v1:session';
let memorySession: Session | null = null;
const listeners = new Set<() => void>();

function sessionStore(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
  } catch {
    /* ignore */
  }
  return null;
}

function readSession(): Session | null {
  const s = sessionStore();
  if (!s) return memorySession;
  try {
    const raw = s.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  memorySession = session;
  const s = sessionStore();
  if (s) {
    try {
      if (session) s.setItem(SESSION_KEY, JSON.stringify(session));
      else s.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export const authService = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Primitive snapshot for React subscriptions. */
  getSessionUserId(): string | null {
    return readSession()?.userId ?? null;
  },

  getSession(): Session | null {
    const session = readSession();
    if (!session) return null;
    // Guard against sessions pointing to users removed by a demo reset.
    const user = getDb().users.find((u) => u.id === session.userId);
    return user ? session : null;
  },

  getCurrentUser(): User | null {
    const session = this.getSession();
    if (!session) return null;
    return getDb().users.find((u) => u.id === session.userId) ?? null;
  },

  async login(email: string, password: string): Promise<User> {
    return request(() => {
      const db = getDb();
      const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || user.passwordDigest !== demoDigest(password)) {
        throw new ServiceError('UNAUTHENTICATED', 'Incorrect email or password. Try a demo account below.');
      }
      writeSession({ userId: user.id, role: user.role, signedInAt: nowIso() });
      commit({ auditLogs: [auditEntry(user, 'auth.login', 'user', user.id, `${user.name} signed in`), ...db.auditLogs] });
      return user;
    });
  },

  async register(input: { name: string; email: string; phone: string; password: string }): Promise<User> {
    return request(() => {
      const db = getDb();
      if (db.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
        throw new ServiceError('CONFLICT', 'An account with this email already exists.');
      }
      const user: User = {
        id: createId('usr'),
        role: 'customer',
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        passwordDigest: demoDigest(input.password),
        createdAt: nowIso(),
        addresses: [],
      };
      commit({ users: [...db.users, user] });
      writeSession({ userId: user.id, role: user.role, signedInAt: nowIso() });
      return user;
    });
  },

  logout() {
    writeSession(null);
  },

  /** Throws unless a user is signed in (and optionally has one of the roles). */
  requireUser(roles?: Role[]): User {
    const user = this.getCurrentUser();
    if (!user) throw new ServiceError('UNAUTHENTICATED', 'Please sign in to continue.');
    if (roles && !roles.includes(user.role)) throw new ServiceError('FORBIDDEN', 'You do not have permission for this action.');
    return user;
  },

  /** Test hook. */
  _setSessionForTests(userId: string | null) {
    if (!userId) return writeSession(null);
    const user = getDb().users.find((u) => u.id === userId);
    if (user) writeSession({ userId, role: user.role, signedInAt: nowIso() });
  },
};
