import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'js-yaml';
import fs from 'fs';
import path from 'path';

import authRoutes from './modules/auth/auth.routes';
import productsRoutes from './modules/products/products.routes';
import ordersRoutes from './modules/orders/orders.routes';
import { errorHandler } from './middleware/errorHandler';

const openapiDocument = YAML.load(
  fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8')
) as Record<string, any>;

export const app = express();

// FRONTEND_ORIGIN can be a single URL or a comma-separated list, so the
// same env var works whether there's one deployed frontend or several
// (e.g. production + a preview deploy). Falls back to the Vite dev server's
// default port so local development works with no env setup at all.
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.use('/auth', authRoutes);
app.use('/products', productsRoutes);
app.use(ordersRoutes); // declares its own full paths internally

app.use(errorHandler);
