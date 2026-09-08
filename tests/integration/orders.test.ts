import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { resetDb, closeDb } from '../helpers/testDb';
import { registerAndLogin } from '../helpers/auth';

interface ProductOverrides {
  name?: string;
  price?: number;
  stock?: number;
  category?: string;
}

async function createProduct(token: string, overrides: ProductOverrides = {}) {
  const res = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Widget', price: 10, stock: 5, category: 'test', ...overrides });
  return res.body.data;
}

describe('Orders', () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it('rejects placing an order without a token', async () => {
    const res = await request(app).post('/orders').send({ items: [] });
    expect(res.status).toBe(401);
  });

  it('places an order and decrements stock accordingly', async () => {
    const { token } = await registerAndLogin();
    const product = await createProduct(token, { stock: 10 });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 3 }] });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(expect.any(Number)); // the new order id

    const productsRes = await request(app).get('/products');
    const updated = productsRes.body.data.find((p: { id: number }) => p.id === product.id);
    expect(updated.stock).toBe(7);
  });

  // This is the one that matters most — it's the whole point of wrapping
  // order placement in a database transaction back in Phase 3/4. Without
  // the transaction, a failed order could still leave a partial trail:
  // stock decremented with no matching order, or an order with no items.
  it('rolls back the entire order when requested stock exceeds what is available', async () => {
    const { token, userId } = await registerAndLogin();
    const product = await createProduct(token, { stock: 2 });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 999 }] });

    expect(res.status).toBe(409);

    // Stock must be completely unchanged — proves nothing was committed.
    const productsRes = await request(app).get('/products');
    const unchanged = productsRes.body.data.find((p: { id: number }) => p.id === product.id);
    expect(unchanged.stock).toBe(2);

    // No order should exist at all, not even a half-created one.
    const ordersRes = await request(app)
      .get(`/users/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`);
    expect(ordersRes.body.data).toEqual([]);
  });

  it('blocks the whole multi-item order if any single item cannot be fulfilled', async () => {
    const { token, userId } = await registerAndLogin();
    const inStock = await createProduct(token, { name: 'In Stock', stock: 10 });
    const shortStock = await createProduct(token, { name: 'Short Stock', stock: 1 });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { productId: inStock.id, quantity: 5 },
          { productId: shortStock.id, quantity: 999 },
        ],
      });

    expect(res.status).toBe(409);

    // The item that WAS available must still be untouched too — a failure
    // on one line item can't leave the other partially applied.
    const productsRes = await request(app).get('/products');
    const inStockAfter = productsRes.body.data.find((p: { id: number }) => p.id === inStock.id);
    expect(inStockAfter.stock).toBe(10);

    const ordersRes = await request(app)
      .get(`/users/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`);
    expect(ordersRes.body.data).toEqual([]);
  });

  it('404s ordering a product that does not exist', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: 999999, quantity: 1 }] });

    expect(res.status).toBe(404);
  });

  it('returns order history with items joined in', async () => {
    const { token, userId } = await registerAndLogin();
    const product = await createProduct(token, { name: 'Gadget', stock: 10 });

    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product.id, quantity: 2 }] })
      .expect(201);

    const res = await request(app)
      .get(`/users/${userId}/orders`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      product_name: 'Gadget',
      quantity: 2,
      status: 'paid',
    });
  });

  it("403s viewing another user's order history", async () => {
    const userA = await registerAndLogin();
    const userB = await registerAndLogin();

    const res = await request(app)
      .get(`/users/${userA.userId}/orders`)
      .set('Authorization', `Bearer ${userB.token}`);

    expect(res.status).toBe(403);
  });
});
