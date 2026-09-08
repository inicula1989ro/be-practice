import express from 'express';
import path from 'path';

import authRoutes from './modules/auth/auth.routes';
import productsRoutes from './modules/products/products.routes';
import ordersRoutes from './modules/orders/orders.routes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

app.use(express.json());
// __dirname resolves relative to the compiled file's location (dist/, not
// src/), but dist/ and public/ are both direct children of the project
// root, so '..' + 'public' lands in the right place either way.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/auth', authRoutes);
app.use('/products', productsRoutes);
app.use(ordersRoutes); // declares its own full paths internally

app.use(errorHandler);
