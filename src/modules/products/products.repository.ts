import { pool } from '../../config/db';
import { Product, NewProductInput } from '../../types/models';

export const productsRepository = {
  async findAll(): Promise<Product[]> {
    const { rows } = await pool.query<Product>('SELECT * FROM products ORDER BY id');
    return rows;
  },

  async create({ name, price, stock, category }: NewProductInput): Promise<Product> {
    const { rows } = await pool.query<Product>(
      'INSERT INTO products (name, price, stock, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, stock, category]
    );
    return rows[0];
  },

  async update(id: number, fields: Partial<NewProductInput>): Promise<Product | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, value] of Object.entries(fields)) {
      sets.push(`${key} = $${i++}`);
      values.push(value)
    }

    if (sets.length === 0) return null;

    values.push(id);
    const { rows } = await pool.query<Product>(
      `UPDATE products SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async remove(id: number): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0
  }
};
