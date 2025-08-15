// src/app/types.ts

// Catálogo base (puedes ampliar luego)
export const CURRENCY_CODES = [
  'USD', 'EUR', 'COP', 'JPY', 'GBP',
  'MXN', 'BRL', 'ARS', 'CLP',
  'CAD', 'AUD', 'CHF',
] as const;

export type CurrencyCode = typeof CURRENCY_CODES[number];

// Mapa de tasas relativo a una base (ej: base = USD → rates.EUR = 0.91)
export type RateMap = Record<CurrencyCode, number>;

export interface ConversionRequest {
  base: CurrencyCode;
  target: CurrencyCode;
  amount: number; // en base
}

export interface ConversionQuote {
  base: CurrencyCode;
  target: CurrencyCode;
  rate: number;     // cuántos TARGET por 1 BASE
  timestamp: number; // epoch ms
}

export interface ConversionResult {
  request: ConversionRequest;
  quote: ConversionQuote;
  value: number; // amount * rate (sin formato, valor numérico)
}
