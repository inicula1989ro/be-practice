import { pool } from '../../config/db';
import { User } from '../../types/models';

export const authRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },

  async emailExists(email: string): Promise<boolean> {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    return rows.length > 0;
  },

  async create({
    email,
    passwordHash,
  }: {
    email: string;
    passwordHash: string;
  }): Promise<{ id: number; email: string }> {
    const { rows } = await pool.query<{ id: number; email: string }>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );
    return rows[0];
  },
};
