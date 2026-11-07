/**
 * Storage abstraction for the demo backend.
 * Web: window.localStorage. Elsewhere (tests, native without storage): an in-memory map.
 * All reads are defensive — malformed JSON returns the fallback instead of throwing.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

const PREFIX = 'medifly:v1:';

class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  keys() {
    return [...this.map.keys()];
  }
}

function detectLocalStorage(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = `${PREFIX}__probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    const ls = window.localStorage;
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
      keys: () => Object.keys(ls),
    };
  } catch {
    return null;
  }
}

let backend: KeyValueStore = detectLocalStorage() ?? new MemoryStore();
let persistent = backend instanceof MemoryStore ? false : true;

export const storageService = {
  key(name: string) {
    return PREFIX + name;
  },
  /** True when data survives a browser refresh (localStorage available). */
  isPersistent() {
    return persistent;
  },
  read<T>(name: string, fallback: T): T {
    try {
      const raw = backend.getItem(PREFIX + name);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  /** Returns undefined for missing or malformed values so callers can repair them. */
  readOptional<T>(name: string): T | undefined {
    try {
      const raw = backend.getItem(PREFIX + name);
      if (raw == null) return undefined;
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  write(name: string, value: unknown): boolean {
    try {
      backend.setItem(PREFIX + name, JSON.stringify(value));
      return true;
    } catch (err) {
      // Quota exceeded or storage disabled; keep running in memory.
      console.warn('[MediFly] Could not persist', name, err);
      return false;
    }
  },
  remove(name: string) {
    try {
      backend.removeItem(PREFIX + name);
    } catch {
      /* ignore */
    }
  },
  clearAll() {
    for (const k of backend.keys()) if (k.startsWith(PREFIX)) backend.removeItem(k);
  },
  /** Test hook: swap in a fresh in-memory store. */
  useMemoryStore() {
    backend = new MemoryStore();
    persistent = false;
  },
  prefix: PREFIX,
};
