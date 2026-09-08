import { describe, it, expect } from 'vitest';
import { productsService } from '../../src/modules/products/products.service';
import { HttpError } from '../../src/utils/HttpError';

// These never touch the database — validation in productsService throws
// (or rejects) before productsRepository is ever called, so there's
// nothing to connect to here. Fast, no setup required.
describe('productsService validation (no DB required)', () => {
  it('rejects create() with missing fields', () => {
    expect(() => productsService.create({})).toThrow(HttpError);
  });

  it('rejects create() with a non-positive price', () => {
    expect(() =>
      productsService.create({ name: 'Bad', price: -5, stock: 10, category: 'x' })
    ).toThrow(HttpError);
  });

  it('rejects create() with a negative stock', () => {
    expect(() =>
      productsService.create({ name: 'Bad', price: 5, stock: -1, category: 'x' })
    ).toThrow(HttpError);
  });

  it('rejects create() with a blank name', () => {
    expect(() =>
      productsService.create({ name: '   ', price: 5, stock: 1, category: 'x' })
    ).toThrow(HttpError);
  });

  // The "valid data succeeds" case is deliberately left to the integration
  // tests instead of being tested here — proving it actually works means
  // proving it reaches the database, which isn't something a unit test
  // with no DB connection can meaningfully assert without either leaving
  // an unawaited (and eventually rejecting) promise dangling, or being
  // flaky depending on whether a database happens to be reachable.

  // update() is declared `async`, so even a validation failure that never
  // touches the DB comes back as a rejected Promise, not a sync throw —
  // hence `rejects` here instead of a plain `toThrow`.
  it('rejects update() with an empty body', async () => {
    await expect(productsService.update(1, {})).rejects.toThrow(HttpError);
  });

  it('rejects update() with an invalid price even if other fields are omitted', async () => {
    await expect(productsService.update(1, { price: -10 })).rejects.toThrow(HttpError);
  });

  it('rejects update() with a non-integer stock', async () => {
    await expect(productsService.update(1, { stock: 1.5 })).rejects.toThrow(HttpError);
  });
});
