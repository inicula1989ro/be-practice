import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { resetDb, closeDb } from '../helpers/testDb';
import { registerAndLogin } from '../helpers/auth';

describe('Products', () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it('lists products without requiring auth', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('rejects creating a product without a token', async () => {
    const res = await request(app)
      .post('/products')
      .send({ name: 'Mouse', price: 25, stock: 10, category: 'electronics' });

    expect(res.status).toBe(401);
  });

  it('creates a product with a valid token', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mouse', price: 25, stock: 10, category: 'electronics' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Mouse', stock: 10, category: 'electronics' });
    expect(res.body.data.id).toEqual(expect.any(Number));
  });

  it('rejects invalid product data with 400', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '', price: -5, stock: 10, category: 'electronics' });

    expect(res.status).toBe(400);
  });

  it('updates a product with a partial body', async () => {
    const { token } = await registerAndLogin();

    const created = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mouse', price: 25, stock: 10, category: 'electronics' });

    const res = await request(app)
      .patch(`/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 30 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe('30.00');
    expect(res.body.data.name).toBe('Mouse'); // untouched fields survive
  });

  it('rejects an update with an empty body', async () => {
    const { token } = await registerAndLogin();

    const created = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mouse', price: 25, stock: 10, category: 'electronics' });

    const res = await request(app)
      .patch(`/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('404s updating a product that does not exist', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .patch('/products/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 30 });

    expect(res.status).toBe(404);
  });

  it('deletes a product with no orders', async () => {
    const { token } = await registerAndLogin();

    const created = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mouse', price: 25, stock: 10, category: 'electronics' });

    const res = await request(app)
      .delete(`/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const listRes = await request(app).get('/products');
    expect(listRes.body.data).toEqual([]);
  });

  it('404s deleting a product that does not exist', async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .delete('/products/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('refuses to delete a product referenced by an existing order (409)', async () => {
    const { token } = await registerAndLogin();

    const created = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mouse', price: 25, stock: 10, category: 'electronics' });

    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: created.body.data.id, quantity: 1 }] })
      .expect(201);

    const res = await request(app)
      .delete(`/products/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);

    // And it's still there, since the delete was blocked.
    const listRes = await request(app).get('/products');
    expect(listRes.body.data).toHaveLength(1);
  });
});
