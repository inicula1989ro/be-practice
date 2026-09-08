import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/HttpError';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message } });
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({ error: { message } });
}
