import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';

export const ordersController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = await ordersService.create(req.userId as number, req.body.items);
      res.status(201).json({ data: orderId });
    } catch (err) {
      next(err);
    }
  },

  async listForUser(req: Request, res: Response, next: NextFunction) {
    if (Number(req.params.id) !== req.userId) {
      return res.status(403).json({ error: { message: "Cannot view another user's orders" } });
    }

    try {
      const orders = await ordersService.getForUser(String(req.params.id));
      res.json({ data: orders });
    } catch (err) {
      next(err);
    }
  },
};
