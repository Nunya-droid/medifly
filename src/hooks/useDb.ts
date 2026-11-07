import { useSyncExternalStore } from 'react';
import { getDb, subscribe } from '@/services/db';
import { authService } from '@/services/authService';
import type { Database, User } from '@/types';

/** Reactive snapshot of the simulated backend. Re-renders after any service commit. */
export function useDb(): Database {
  return useSyncExternalStore(subscribe, getDb, getDb);
}

/** The signed-in demo user (or null). */
export function useCurrentUser(): User | null {
  const db = useDb();
  const userId = useSyncExternalStore(authService.subscribe, () => authService.getSessionUserId(), () => null);
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) ?? null;
}
