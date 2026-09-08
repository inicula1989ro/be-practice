import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { ordersController } from './orders.controller';

const router = Router();

// Declares its own full paths rather than being mounted under a prefix,
// since it covers both /orders and /users/:id/orders.
router.post('/orders', requireAuth, ordersController.create);
router.get('/users/:id/orders', requireAuth, ordersController.listForUser);

export default router;
