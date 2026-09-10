import { pool } from '../../config/db';
import { User } from '../../types/models';

export const authRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
      'SELECT id, email, password_hash, email_verified FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },

  async findByActivationToken(token: string): Promise<(User & { activation_token_expires: Date | null }) | null> {
    const { rows } = await pool.query(
      'SELECT id, email, activation_token_expires FROM users WHERE activation_token = $1',
      [token]
    );
    return rows[0] || null;
  },

  async activate(id: number): Promise<void> {
    await pool.query(
      'UPDATE users SET email_verified = true, activation_token = NULL, activation_token_expires = NULL WHERE id = $1',
      [id]
    );
  },

  async emailExists(email: string): Promise<boolean> {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    return rows.length > 0;
  },

  async create({
    email,
    passwordHash,
    activationToken,
    activationTokenExpires,
  }: {
    email: string;
    passwordHash: string;
    activationToken: string;
    activationTokenExpires: Date;
  }): Promise<{ id: number; email: string }> {
    const { rows } = await pool.query<{ id: number; email: string }>(
      `INSERT INTO users (email, password_hash, activation_token, activation_token_expires)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email`,
      [email, passwordHash, activationToken, activationTokenExpires]
    );
    return rows[0];
  },
};
