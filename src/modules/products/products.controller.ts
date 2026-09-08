import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { Product } from '../../types/models';

export const productsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productsService.list();
      res.json({ data: products });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const newProduct: Product = await productsService.create(req.body);
      res.status(201).json({ data: newProduct });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updatedProduct: Product = await productsService.update(Number(id), req.body)
      res.json({ data: updatedProduct })
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.remove(Number(req.params.id))
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};
