import { pool } from '../../src/config/db';

// Wipes every table between tests so each test starts from a known-empty
// state, regardless of what earlier tests left behind. RESTART IDENTITY
// resets the SERIAL id counters too, and CASCADE handles the foreign-key
// dependencies between the four tables without needing a specific order.
export async function resetDb(): Promise<void> {
  await pool.query('TRUNCATE TABLE order_items, orders, products, users RESTART IDENTITY CASCADE');
}

// Closes the connection pool so the test process can exit cleanly instead
// of hanging on open database connections.
export async function closeDb(): Promise<void> {
  await pool.end();
}
