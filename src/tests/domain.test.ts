// src/tests/domain.test.ts
import { describe, it, expect } from 'vitest';
import { convert, round, makeConversion, DomainError } from '../app/domain';
import { type ConversionRequest } from '../app/types';

describe('round()', () => {
  it('redondea a 4 decimales por defecto', () => {
    expect(round(1.23456)).toBe(1.2346);
  });
  it('permite especificar decimales', () => {
    expect(round(1.23456, 2)).toBe(1.23);
  });
});

describe('convert()', () => {
  it('convierte amount * rate con redondeo', () => {
    expect(convert(100, 3.98765)).toBe(398.765); // 3 decimales tras 4 decimales globales ≈ 398.765
  });

  it('lanza error con amount inválido', () => {
    expect(() => convert(0, 1.2)).toThrowError(/INVALID_AMOUNT/);
    expect(() => convert(NaN, 1.2)).toThrowError(/INVALID_AMOUNT/);
  });

  it('lanza error con rate inválido', () => {
    expect(() => convert(10, 0)).toThrowError(/INVALID_RATE/);
  });
});

describe('makeConversion()', () => {
  const req: ConversionRequest = { base: 'USD', target: 'COP', amount: 10 };

  it('arma un ConversionResult coherente', () => {
    const result = makeConversion(req, 4000, 1700000000000);
    expect(result.value).toBe(40000);
    expect(result.quote.base).toBe('USD');
    expect(result.quote.target).toBe('COP');
    expect(result.quote.rate).toBe(4000);
    expect(result.quote.timestamp).toBe(1700000000000);
  });

  it('falla si base == target', () => {
    const badReq: ConversionRequest = { base: 'USD', target: 'USD', amount: 10 };
    expect(() => makeConversion(badReq, 1)).toThrowError(DomainError);
  });
});
