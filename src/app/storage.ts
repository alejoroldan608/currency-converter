// src/app/storage.ts
type JsonValue = unknown;

export interface CacheEntry<T = JsonValue> {
  value: T;
  expiresAt: number; // epoch ms
}

const mem = new Map<string, CacheEntry>();

function now(): number {
  return Date.now();
}

function isExpired(entry: CacheEntry | undefined): boolean {
  return !entry || entry.expiresAt <= now();
}

export function setWithTTL<T>(key: string, value: T, ttlMs: number): void {
  const entry: CacheEntry<T> = { value, expiresAt: now() + ttlMs };
  mem.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Si el storage está lleno o denegado, seguimos con la caché en memoria
  }
}

export function getIfFresh<T>(key: string): T | null {
  // 1) memoria
  const m = mem.get(key);
  if (!isExpired(m)) return m!.value as T;

  // 2) localStorage
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (isExpired(parsed)) {
      localStorage.removeItem(key);
      mem.delete(key);
      return null;
    }
    // sincroniza memoria
    mem.set(key, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

export function del(key: string): void {
  mem.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
