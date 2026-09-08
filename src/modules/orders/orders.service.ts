import { pool } from '../../config/db';
import { ordersRepository } from './orders.repository';
import { HttpError } from '../../utils/HttpError';

interface OrderItemInput {
  productId: number;
  quantity: number;
  unitPrice?: string;
}

export const ordersService = {
  async create(userId: number, items: OrderItemInput[]): Promise<number> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const item of items) {
        const product = await ordersRepository.getProductForUpdate(client, item.productId);

        if (!product) {
          throw new HttpError(404, `Product ${item.productId} not found`);
        }
        if (product.stock < item.quantity) {
          throw new HttpError(409, `Insufficient stock for product ${item.productId}`);
        }

        item.unitPrice = product.price;
      }

      const orderId = await ordersRepository.createOrder(client, userId);

      for (const item of items) {
        await ordersRepository.addOrderItem(client, {
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice as string,
        });
        await ordersRepository.decrementStock(client, item.productId, item.quantity);
      }

      await client.query('COMMIT');
      return orderId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getForUser(userId: number | string) {
    return ordersRepository.findByUserId(userId);
  },
};
