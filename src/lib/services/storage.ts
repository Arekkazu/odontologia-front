/**
 * LocalStorage helper and ID generator for Odonto Gestión frontend
 *
 * This module centralizes interaction with browser localStorage, providing:
 * - Namespaced read/write/remove operations with robust JSON handling
 * - Optional TTL (time-to-live) for stored items
 * - Simple auto-increment ID generator per namespace
 * - RFC4122-like random ID generator as fallback
 *
 * Notes:
 * - All storage is namespaced to avoid collisions.
 * - Values are serialized as JSON with metadata when TTL is used.
 */

export type StorageNamespace =
  | 'pacientes'
  | 'consultas'
  | 'tratamientos'
  | 'pagos'
  | 'laboratorios'
  | 'trabajos_laboratorio'
  | 'horario_laboral'
  | 'pausas'
  | 'formulas_medicas'
  | 'tipos_identificacion'
  | 'app'; // general app state (theme, auth flag, etc.)

type StoredPayload<T> =
  | {
      v: T;
      // unix ms when stored
      ts: number;
      // optional expiresAt in unix ms
      exp?: number;
    }
  | null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function nsKey(namespace: StorageNamespace, key: string): string {
  return `og:${namespace}:${key}`;
}

/**
 * Safely parse JSON string to object. Returns fallback on error.
 */
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Stringify a value safely.
 */
function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    // As a last resort, store a string representation
    return String(obj);
  }
}

/**
 * Save a value under a namespaced key. Optionally set TTL in milliseconds.
 *
 * @param namespace logical bucket (e.g., 'pacientes')
 * @param key item key within the namespace
 * @param value any JSON-serializable value
 * @param ttlMs optional time-to-live in ms; if provided, the item auto-expires
 */
export function save<T>(namespace: StorageNamespace, key: string, value: T, ttlMs?: number): void {
  if (!isBrowser()) return;
  const record: StoredPayload<T> = {
    v: value,
    ts: Date.now(),
    exp: typeof ttlMs === 'number' && ttlMs > 0 ? Date.now() + ttlMs : undefined
  };
  const k = nsKey(namespace, key);
  window.localStorage.setItem(k, safeStringify(record));
}

/**
 * Load a value from a namespaced key. If the record expired, it is removed
 * and the fallback is returned.
 *
 * @param namespace logical bucket
 * @param key item key
 * @param fallback returned when missing/expired/invalid
 */
export function load<T>(namespace: StorageNamespace, key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const k = nsKey(namespace, key);
  const raw = window.localStorage.getItem(k);
  const payload = safeParse<StoredPayload<T>>(raw, null);

  if (!payload || typeof payload !== 'object') {
    // invalid or missing
    return fallback;
  }

  if (payload.exp && Date.now() > payload.exp) {
    // expired, cleanup
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore cleanup failures
    }
    return fallback;
  }

  return payload.v ?? fallback;
}

/**
 * Remove a namespaced item.
 */
export function remove(namespace: StorageNamespace, key: string): void {
  if (!isBrowser()) return;
  const k = nsKey(namespace, key);
  window.localStorage.removeItem(k);
}

/**
 * List keys within a namespace. Returns logical item keys (without prefix).
 */
export function listKeys(namespace: StorageNamespace): string[] {
  if (!isBrowser()) return [];
  const prefix = `og:${namespace}:`;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const fullKey = window.localStorage.key(i);
    if (fullKey && fullKey.startsWith(prefix)) {
      keys.push(fullKey.substring(prefix.length));
    }
  }
  return keys;
}

/**
 * Clear all items under a namespace.
 */
export function clearNamespace(namespace: StorageNamespace): void {
  if (!isBrowser()) return;
  const prefix = `og:${namespace}:`;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const fullKey = window.localStorage.key(i);
    if (fullKey && fullKey.startsWith(prefix)) {
      toRemove.push(fullKey);
    }
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k));
}

/**
 * Generate a sequential numeric ID scoped to a namespace.
 * It stores the counter in localStorage under `og:<ns>:__id_counter`.
 *
 * @returns next integer ID (>=1)
 */
export function generateSeqId(namespace: StorageNamespace): number {
  if (!isBrowser()) {
    // Fallback when not in browser; produce a pseudo-random positive int
    return Math.floor(Math.random() * 1_000_000_000) + 1;
  }
  const counterKey = nsKey(namespace, '__id_counter');
  const raw = window.localStorage.getItem(counterKey);
  const current = raw ? Number(raw) : 0;
  const next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
  window.localStorage.setItem(counterKey, String(next));
  return next;
}

/**
 * Generate a random RFC4122-like ID (UUID v4 style).
 * Note: This uses crypto if available, else falls back to Math.random.
 */
export function generateRandomId(): string {
  const cryptoObj: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;

  if (cryptoObj && 'getRandomValues' in cryptoObj) {
    const buf = new Uint8Array(16);
    cryptoObj.getRandomValues(buf);
    // Per RFC4122 v4: set bits 6-7 of the clock_seq_hi_and_reserved to 10, and version to 4
    buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
    buf[8] = (buf[8] & 0x3f) | 0x80; // variant 10
    const hex = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
    return (
      hex.substring(0, 8) +
      '-' +
      hex.substring(8, 12) +
      '-' +
      hex.substring(12, 16) +
      '-' +
      hex.substring(16, 20) +
      '-' +
      hex.substring(20)
    );
  }

  // Fallback: non-crypto (less secure but stable for mock IDs)
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/**
 * Convenience helper to get now in milliseconds.
 */
export function nowMs(): number {
  return Date.now();
}

/**
 * Quick helpers to persist and retrieve JSON arrays under a namespace.
 * Useful for mocking table storage like pacientes/tratamientos in dev.
 */
export function saveCollection<T>(namespace: StorageNamespace, key: string, items: T[]): void {
  save<T[]>(namespace, key, items);
}

export function loadCollection<T>(namespace: StorageNamespace, key: string): T[] {
  return load<T[]>(namespace, key, []);
}

export function upsertInCollection<T extends { id?: number | string }>(
  namespace: StorageNamespace,
  key: string,
  item: T,
  idGenerator: () => number | string = () => generateSeqId(namespace)
): T[] {
  const col = loadCollection<T>(namespace, key);
  const id = item.id ?? idGenerator();
  const nextItem = { ...item, id };
  const idx = col.findIndex((x) => x && (x as any).id === id);
  if (idx >= 0) {
    col[idx] = nextItem;
  } else {
    col.push(nextItem);
  }
  saveCollection(namespace, key, col);
  return col;
}

export function removeFromCollection<T extends { id?: number | string }>(
  namespace: StorageNamespace,
  key: string,
  id: number | string
): T[] {
  const col = loadCollection<T>(namespace, key);
  const next = col.filter((x) => x && (x as any).id !== id);
  saveCollection(namespace, key, next);
  return next;
}
