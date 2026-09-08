import { productsRepository } from './products.repository';
import { HttpError } from '../../utils/HttpError';
import { NewProductInput, UpdateProductInput } from '../../types/models';

function isValidProduct(data: unknown): data is NewProductInput {
  if (typeof data !== 'object' || data === null) return false;
  const { name, price, stock, category } = data as Record<string, unknown>;

  return (
    typeof name === 'string' &&
    name.trim().length > 0 &&
    typeof price === 'number' &&
    price > 0 &&
    typeof stock === 'number' &&
    Number.isInteger(stock) &&
    stock >= 0 &&
    typeof category === 'string' &&
    category.trim().length > 0
  );
}

function isValidProductUpdate(data: unknown): data is UpdateProductInput {
  if (typeof data !== 'object' || data === null) return false;
  const { name, price, stock, category } = data as Record<string, unknown>;

  if (name !== undefined && !(typeof name === 'string' && name.trim().length > 0)) return false;
  if (price !== undefined && !(typeof price === 'number' && price > 0)) return false;
  if (stock !== undefined && !(typeof stock === 'number' && Number.isInteger(stock) && stock >= 0)) return false;
  if (category !== undefined && !(typeof category === 'string' && category.trim().length > 0)) return false;

  return [name, price, stock, category].some((v) => v !== undefined);
}

interface PgError extends Error {
  code?: string;
}

function isPgError(err: unknown): err is PgError {
  return err instanceof Error && 'code' in err;
}

export const productsService = {
  list() {
    return productsRepository.findAll();
  },

  create(data: unknown) {
    if (!isValidProduct(data)) {
      throw new HttpError(400, 'Invalid product data');
    }
    return productsRepository.create(data);
  },

  async update(id: number, data: unknown) {
    if (!isValidProductUpdate(data)) {
      throw new HttpError(400, 'Invalid product data');
    }

    const updated = await productsRepository.update(id, data);
    if (!updated) {
      throw new HttpError(404, 'Product not found');
    }

    return updated
  },

  async remove(id: number) {
    try {
      const deleted = await productsRepository.remove(id);
      if (!deleted) {
        throw new HttpError(404, 'Product not found')
      }
    } catch (err) {
      if (isPgError(err) && err.code === '23503') {
        throw new HttpError(409, 'Cannot delete a product with existing orders');
      }

      throw err;
    }
  }
};
