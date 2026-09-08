import { PoolClient } from 'pg';
import { pool } from '../../config/db';
import { OrderItemRow } from '../../types/models';

interface ProductForUpdate {
  price: string;
  stock: number;
}

export const ordersRepository = {
  // Write methods take an explicit `client: PoolClient` so they can run
  // inside the transaction managed by orders.service.js — never the shared
  // pool, which could hand out a different underlying connection per call.
  async getProductForUpdate(client: PoolClient, productId: number): Promise<ProductForUpdate | null> {
    const { rows } = await client.query<ProductForUpdate>(
      'SELECT price, stock FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );
    return rows[0] || null;
  },

  async createOrder(client: PoolClient, userId: number): Promise<number> {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO orders (user_id, status) VALUES ($1, 'paid') RETURNING id`,
      [userId]
    );
    return rows[0].id;
  },

  async addOrderItem(
    client: PoolClient,
    {
      orderId,
      productId,
      quantity,
      unitPrice,
    }: { orderId: number; productId: number; quantity: number; unitPrice: string }
  ): Promise<void> {
    await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [orderId, productId, quantity, unitPrice]
    );
  },

  async decrementStock(client: PoolClient, productId: number, quantity: number): Promise<void> {
    await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, productId]);
  },

  // Plain read, no transaction needed — uses the pool directly.
  async findByUserId(userId: number | string): Promise<OrderItemRow[]> {
    const { rows } = await pool.query<OrderItemRow>(
      `SELECT
         o.id AS order_id,
         o.status,
         o.created_at,
         oi.product_id,
         p.name AS product_name,
         oi.quantity,
         oi.unit_price
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
       ORDER BY o.id`,
      [userId]
    );
    return rows;
  },
};
