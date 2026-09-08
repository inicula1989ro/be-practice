import dotenv from 'dotenv';
import { Pool } from 'pg';

// Vitest sets process.env.VITEST = 'true' for any process it runs, which is
// how tests get their own database instead of accidentally touching your
// real dev data in `ecommerce`.
dotenv.config({ path: process.env.VITEST ? '.env.test' : '.env' });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's managed Postgres presents a self-signed cert, so verifying it
  // against a public CA (the pg default) fails; this trusts it without
  // trying to validate the chain. Only applied in production — local/dev
  // and CI both talk to plain, unencrypted Postgres.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
