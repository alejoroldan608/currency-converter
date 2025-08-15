// src/app/domain.ts
import { ConversionRequest, ConversionResult, ConversionQuote, CurrencyCode, RateMap } from './types';

// Errores tipados para facilitar debugging / tests
export class DomainError extends Error {
  constructor(
    public code: 'INVALID_AMOUNT' | 'INVALID_RATE' | 'MISSING_RATE' | 'SAME_CURRENCY',
    detail?: string
  ) {
    // Incluimos el código en el mensaje para que los tests por regex coincidan
    super(`[${code}] ${detail ?? code}`);
    this.name = 'DomainError';
  }
}


// Utilidad: redondeo bancario simple para presentación/consistencia en pruebas.
// Nota: el cálculo interno puede trabajar con más precisión si lo necesitas.
export function round(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

// Valida monto
export function assertValidAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError('INVALID_AMOUNT', `Monto inválido: ${amount}`);
  }
}

// Valida tasa
export function assertValidRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new DomainError('INVALID_RATE', `Tasa inválida: ${rate}`);
  }
}

// Obtiene la tasa para convertir base→target desde un RateMap (base ya aplicada en la API)
export function rateFromMap(target: CurrencyCode, rates: Partial<RateMap>): number {
  const rate = rates[target];
  if (!Number.isFinite(rate as number)) {
    throw new DomainError('MISSING_RATE', `No hay tasa para ${target}`);
  }
  return rate as number;
}

// Conversión numérica pura (sin formatear)
export function convert(amount: number, rate: number, opts?: { decimals?: number }): number {
  assertValidAmount(amount);
  assertValidRate(rate);
  const value = amount * rate;
  return round(value, opts?.decimals ?? 4);
}

// Crea un objeto ConversionResult listo para UI y/o persistencia
export function makeConversion(
  req: ConversionRequest,
  rate: number,
  now: number = Date.now(),
  opts?: { decimals?: number },
): ConversionResult {
  if (req.base === req.target) {
    throw new DomainError('SAME_CURRENCY', 'Base y destino no pueden ser iguales');
  }
  const value = convert(req.amount, rate, opts);
  const quote: ConversionQuote = {
    base: req.base,
    target: req.target,
    rate,
    timestamp: now,
  };
  return { request: req, quote, value };
}

// Helper de formateo monetario (para UI; puedes moverlo a otra capa si prefieres)
export function formatMoney(value: number, currency: CurrencyCode, locale = navigator.language): string {
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency });
  return fmt.format(value);
}
