// Augments Express's Request type with the custom `userId` property that
// requireAuth attaches after verifying a JWT. Without this, `req.userId`
// anywhere in the app would be a type error — Express's own Request type
// has no idea this property existss.
export {};

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}
