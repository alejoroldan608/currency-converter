// src/app/domain.ts
import type {
  ConversionRequest,
  ConversionResult,
  ConversionQuote,
  CurrencyCode,
  RateMap,
} from './types';

// ❌ Evitar "parameter properties" por 'erasableSyntaxOnly'
export class DomainError extends Error {
  code: 'INVALID_AMOUNT' | 'INVALID_RATE' | 'MISSING_RATE' | 'SAME_CURRENCY';
  constructor(code: 'INVALID_AMOUNT' | 'INVALID_RATE' | 'MISSING_RATE' | 'SAME_CURRENCY', detail?: string) {
    super(`[${code}] ${detail ?? code}`);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function round(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError('INVALID_AMOUNT', `Monto inválido: ${amount}`);
  }
}

export function assertValidRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new DomainError('INVALID_RATE', `Tasa inválida: ${rate}`);
  }
}

export function rateFromMap(target: CurrencyCode, rates: RateMap): number {
  const rate = rates[target];
  if (!Number.isFinite(rate as number)) {
    throw new DomainError('MISSING_RATE', `No hay tasa para ${target}`);
  }
  return rate as number;
}

export function convert(amount: number, rate: number, opts?: { decimals?: number }): number {
  assertValidAmount(amount);
  assertValidRate(rate);
  return round(amount * rate, opts?.decimals ?? 4);
}

export function makeConversion(
  req: ConversionRequest,
  rate: number,
  now: number = Date.now(),
  opts?: { decimals?: number },
): ConversionResult { // ✅ usamos ConversionResult para evitar TS6196
  if (req.base === req.target) {
    throw new DomainError('SAME_CURRENCY', 'Base y destino no pueden ser iguales');
  }
  const value = convert(req.amount, rate, opts);
  const quote: ConversionQuote = { base: req.base, target: req.target, rate, timestamp: now };
  return { request: req, quote, value };
}

export function formatMoney(value: number, currency: CurrencyCode, locale = navigator.language): string {
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency });
  return fmt.format(value);
}
