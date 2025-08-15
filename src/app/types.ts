// src/app/types.ts

// Catálogo base
export const CURRENCY_CODES = [
  'USD', 'EUR', 'COP', 'JPY', 'GBP',
  'MXN', 'BRL', 'ARS', 'CLP',
  'CAD', 'AUD', 'CHF',
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

// Nota: la API puede devolver tasas parciales
export type RateMap = Partial<Record<CurrencyCode, number>>;

export interface ConversionRequest {
  base: CurrencyCode;
  target: CurrencyCode;
  amount: number; // en base
}

export interface ConversionQuote {
  base: CurrencyCode;
  target: CurrencyCode;
  rate: number;      // cuántos TARGET por 1 BASE
  timestamp: number; // epoch ms
}

export interface ConversionResult {
  request: ConversionRequest;
  quote: ConversionQuote;
  value: number; // amount * rate (numérico)
}
