import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export const authController = {
  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const result = await authService.activate(token);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
};
