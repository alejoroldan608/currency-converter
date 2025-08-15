// src/app/api.ts
import { CURRENCY_CODES, type CurrencyCode, type RateMap } from './types';
import { getIfFresh, setWithTTL } from './storage';

export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: string; status?: number };
export type Result<T> = Ok<T> | Err;

const BASE_URL = 'https://api.exchangerate.host';
const TIMEOUT_MS = 10_000;
const TTL_MS = 30 * 60 * 1000; // 30 min

// Guard: string → CurrencyCode
function isCurrencyCode(s: string): s is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(s);
}

async function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    // @ts-expect-error signal type is fine in DOM lib
    return await p.then((r) => r);
  } finally {
    clearTimeout(t);
  }
}

/**
 * Trae símbolos soportados y devuelve solo los que estén en nuestro catálogo.
 * Cachea en memoria + localStorage por TTL_MS.
 */
export async function getSymbols(): Promise<Result<CurrencyCode[]>> {
  const cacheKey = 'api:symbols';
  const cached = getIfFresh<CurrencyCode[]>(cacheKey);
  if (cached) return { ok: true, data: cached };

  try {
    const url = `${BASE_URL}/symbols`;
    const res = await withTimeout(fetch(url));
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    const json = (await res.json()) as {
      success?: boolean;
      symbols?: Record<string, { code: string; description: string }>;
    };
    const all = Object.keys(json.symbols ?? {});
    const filtered = all.filter(isCurrencyCode) as CurrencyCode[];
    // Fallback por si la API falla o devuelve vacío
    const data = filtered.length ? filtered : CURRENCY_CODES.slice();
    setWithTTL(cacheKey, data, TTL_MS);
    return { ok: true, data };
  } catch (e) {
    // Fallback a catálogo local si hay error de red
    return { ok: true, data: CURRENCY_CODES.slice() };
  }
}

/**
 * Trae tasas más recientes para una base. Si se pasan symbols[], limita respuesta.
 * Devuelve RateMap parcial o total según symbols.
 */
export async function getLatestRates(
  base: CurrencyCode,
  symbols?: CurrencyCode[],
): Promise<Result<RateMap>> {
  const list = symbols && symbols.length ? symbols : (CURRENCY_CODES as CurrencyCode[]);
  const key = `api:rates:${base}:${list.join(',')}`;
  const cached = getIfFresh<RateMap>(key);
  if (cached) return { ok: true, data: cached };

  const params = new URLSearchParams({ base });
  if (symbols && symbols.length) params.set('symbols', symbols.join(','));

  try {
    const url = `${BASE_URL}/latest?${params.toString()}`;
    const res = await withTimeout(fetch(url));
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };

    const json = (await res.json()) as {
      success?: boolean;
      base?: string;
      rates?: Record<string, number>;
    };

    const rawRates = json.rates ?? {};
    // Filtramos y tipamos a nuestro RateMap (solo nuestras CurrencyCode)
    const typedEntries = Object.entries(rawRates)
      .filter(([k]) => isCurrencyCode(k))
      .map(([k, v]) => [k as CurrencyCode, Number(v)] as const);

    // Construimos RateMap con solo las solicitadas. Las que falten no se incluyen.
    const result = {} as RateMap;
    for (const [code, rate] of typedEntries) {
      (result as any)[code] = rate;
    }

    setWithTTL(key, result, TTL_MS);
    return { ok: true, data: result };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'fetch error' };
  }
}
