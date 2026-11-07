import type { Database } from '@/types';
import { buildSeedDatabase, DB_VERSION } from '@/data/seed';
import { storageService } from './storageService';

/**
 * The simulated backend's data store.
 * Each collection is persisted under its own localStorage key. The in-memory copy is
 * treated as immutable: services replace collections via `commit`, which persists the
 * touched keys and notifies subscribers (the React DataProvider).
 */
type Collection = keyof Database;
const COLLECTIONS: Collection[] = [
  'users',
  'products',
  'inventory',
  'pharmacies',
  'serviceAreas',
  'orders',
  'deliveries',
  'couriers',
  'prescriptions',
  'payments',
  'notifications',
  'tickets',
  'auditLogs',
  'carts',
  'favorites',
  'settings',
  'meta',
];

let db: Database | null = null;
const listeners = new Set<() => void>();
/** Incremented whenever a collection is replaced — cheap change detection for data fetches. */
const versions: Partial<Record<Collection, number>> = {};

export function getCollectionVersion(name: Collection): number {
  return versions[name] ?? 0;
}

function bumpAll() {
  for (const c of COLLECTIONS) versions[c] = (versions[c] ?? 0) + 1;
}

function isValid(name: Collection, value: unknown): boolean {
  if (value == null) return false;
  if (name === 'carts' || name === 'favorites' || name === 'settings' || name === 'meta') return typeof value === 'object' && !Array.isArray(value);
  return Array.isArray(value);
}

/**
 * Load persisted data. Seeds on first launch only; never overwrites an existing dataset.
 * Missing or malformed collections are repaired individually from the seed.
 */
export function loadDb(): Database {
  const meta = storageService.readOptional<Database['meta']>('meta');
  if (!meta || meta.version !== DB_VERSION) {
    const fresh = buildSeedDatabase();
    for (const c of COLLECTIONS) storageService.write(c, fresh[c]);
    db = fresh;
    return db;
  }
  let seed: Database | null = null;
  const loaded = {} as Record<Collection, unknown>;
  for (const c of COLLECTIONS) {
    const value = storageService.readOptional<unknown>(c);
    if (isValid(c, value)) {
      loaded[c] = value;
    } else {
      seed ??= buildSeedDatabase();
      loaded[c] = seed[c];
      storageService.write(c, seed[c]);
      console.warn(`[MediFly] Repaired malformed demo collection "${c}"`);
    }
  }
  db = loaded as unknown as Database;
  return db;
}

export function getDb(): Database {
  return db ?? loadDb();
}

export function commit(patch: Partial<Database>) {
  const current = getDb();
  db = { ...current, ...patch };
  for (const key of Object.keys(patch) as Collection[]) {
    storageService.write(key, db[key]);
    versions[key] = (versions[key] ?? 0) + 1;
  }
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const l of listeners) l();
}

/** Replace all data with a freshly generated seed. */
export function resetDb() {
  const fresh = buildSeedDatabase();
  for (const c of COLLECTIONS) storageService.write(c, fresh[c]);
  db = fresh;
  bumpAll();
  emit();
}

/**
 * Re-read from storage (used when another tab in the same browser changes data).
 * Data is NOT synchronised across browsers or devices.
 */
export function reloadFromStorage() {
  db = null;
  loadDb();
  bumpAll();
  emit();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(storageService.prefix) && !e.key.endsWith('session')) reloadFromStorage();
  });
}
