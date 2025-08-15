// src/app/api.ts
import { CURRENCY_CODES, type CurrencyCode, type RateMap } from './types';
import { getIfFresh, setWithTTL } from './storage';

export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: string; status?: number };
export type Result<T> = Ok<T> | Err;

const BASE_HOST = 'https://api.exchangerate.host';
const TTL_MS = 30 * 60 * 1000; // 30 min

function isCurrencyCode(s: string): s is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(s);
}

/* ---------- Símbolos con caché ---------- */
export async function getSymbols(): Promise<Result<CurrencyCode[]>> {
  const cacheKey = 'api:symbols';
  const cached = getIfFresh<CurrencyCode[]>(cacheKey);
  if (cached) return { ok: true, data: cached };

  try {
    const res = await fetch(`${BASE_HOST}/symbols`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    const json = (await res.json()) as { symbols?: Record<string, { code: string }> };
    const all = Object.keys(json.symbols ?? {});
    const filtered = all.filter(isCurrencyCode) as CurrencyCode[];
    const data = filtered.length ? filtered : CURRENCY_CODES.slice();
    setWithTTL(cacheKey, data, TTL_MS);
    return { ok: true, data };
  } catch {
    return { ok: true, data: CURRENCY_CODES.slice() };
  }
}

/* ---------- Últimas tasas con caché ---------- */
export async function getLatestRates(
  base: CurrencyCode,
  symbols?: CurrencyCode[],
): Promise<Result<RateMap>> {
  // 👇 Usa un tipo readonly para evitar el error de conversión
  const list: readonly CurrencyCode[] = symbols?.length ? symbols : CURRENCY_CODES;
  const key = `api:rates:${base}:${list.join(',')}`;

  const cached = getIfFresh<RateMap>(key);
  if (cached) return { ok: true, data: cached };

  const params = new URLSearchParams({ base });
  if (symbols?.length) params.set('symbols', symbols.join(','));

  try {
    const res = await fetch(`${BASE_HOST}/latest?${params.toString()}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    const json = (await res.json()) as { rates?: Record<string, number> };

    const out: RateMap = {};
    for (const [k, v] of Object.entries(json.rates ?? {})) {
      if (isCurrencyCode(k)) (out as any)[k] = Number(v);
    }
    setWithTTL(key, out, TTL_MS);
    return { ok: true, data: out };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'fetch error' };
  }
}

/* ---------- Convert directo ---------- */
export async function convertRemote(
  from: CurrencyCode,
  to: CurrencyCode,
  amount: number,
): Promise<Result<{ rate: number; result: number }>> {
  const params = new URLSearchParams({ from, to, amount: String(amount) });
  try {
    const res = await fetch(`${BASE_HOST}/convert?${params.toString()}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };

    const json = (await res.json()) as { info?: { rate?: number }; result?: number };
    const resultRaw = Number(json.result);
    let rate = Number(json.info?.rate);

    // Fallback: si no vino rate pero sí result
    if (!Number.isFinite(rate) && Number.isFinite(resultRaw) && amount > 0) {
      rate = resultRaw / amount;
    }

    if (!Number.isFinite(rate) || !Number.isFinite(resultRaw) || rate <= 0 || resultRaw <= 0) {
      return { ok: false, error: 'invalid data' };
    }
    return { ok: true, data: { rate, result: resultRaw } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'fetch error' };
  }
}

/* ---------- Convert con fallbacks ---------- */
export async function convertAmount(
  from: CurrencyCode,
  to: CurrencyCode,
  amount: number,
): Promise<Result<{ rate: number; value: number; source: string }>> {
  const r1 = await convertRemote(from, to, amount);
  if (r1.ok) return { ok: true, data: { rate: r1.data.rate, value: r1.data.result, source: 'host-convert' } };

  const r2 = await getLatestRates(from, [to]);
  if (r2.ok) {
    const rate = Number((r2.data as any)[to]);
    if (Number.isFinite(rate) && rate > 0) {
      return { ok: true, data: { rate, value: amount * rate, source: 'host-latest' } };
    }
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    if (res.ok) {
      const json = (await res.json()) as { rates?: Record<string, number> };
      const rate = Number(json.rates?.[to]);
      if (Number.isFinite(rate) && rate > 0) {
        return { ok: true, data: { rate, value: amount * rate, source: 'erapi-latest' } };
      }
    }
  } catch {}

  const FALLBACK: Record<string, number> = {
    'USD->COP': 4000, 'EUR->COP': 4400, 'USD->EUR': 0.9, 'EUR->USD': 1.1,
    'USD->MXN': 17, 'USD->BRL': 5, 'USD->CLP': 900, 'USD->JPY': 155, 'USD->GBP': 0.78,
  };
  const key = `${from}->${to}`;
  if (FALLBACK[key]) {
    const rate = FALLBACK[key];
    return { ok: true, data: { rate, value: amount * rate, source: 'fallback-local' } };
  }

  return { ok: false, error: 'no-rate-found' };
}
