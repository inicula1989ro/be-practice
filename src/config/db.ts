import dotenv from 'dotenv';
import { Pool } from 'pg';

// Vitest sets process.env.VITEST = 'true' for any process it runs, which is
// how tests get their own database instead of accidentally touching your
// real dev data in `ecommerce`.
dotenv.config({ path: process.env.VITEST ? '.env.test' : '.env' });

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
