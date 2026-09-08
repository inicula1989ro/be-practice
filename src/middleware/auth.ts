import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types/models';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing or malformed token' } });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    // jsonwebtoken's own JwtPayload type is deliberately loose (every field
    // optional) since it can't know our token's actual shape — `as unknown`
    // first, then to our real shape, is the standard way to assert this.
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as TokenPayload;
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}
