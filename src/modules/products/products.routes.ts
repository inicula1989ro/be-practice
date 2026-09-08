import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { productsController } from './products.controller';

const router = Router();

router.get('/', productsController.list);
router.post('/', requireAuth, productsController.create);
router.patch('/:id', requireAuth, productsController.update);
router.delete('/:id', requireAuth, productsController.delete);


export default router;
