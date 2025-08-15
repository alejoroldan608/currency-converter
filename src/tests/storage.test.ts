// src/tests/storage.test.ts
import { describe, it, expect } from 'vitest';
import { getIfFresh, setWithTTL, del } from '../app/storage';

describe('storage with TTL', () => {
  it('set and get before expiry', () => {
    const k = 'test:key';
    del(k);
    setWithTTL(k, { hello: 'world' }, 500);
    const v = getIfFresh<typeof value>(k);
    const value = { hello: 'world' };
    expect(v).toEqual(value);
  });

  it('expires properly', async () => {
    const k = 'test:exp';
    del(k);
    setWithTTL(k, 123, 50);
    await new Promise((r) => setTimeout(r, 70));
    const v = getIfFresh<number>(k);
    expect(v).toBeNull();
  });
});
