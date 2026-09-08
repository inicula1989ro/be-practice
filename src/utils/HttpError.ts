// Replaces the old `Object.assign(new Error(msg), { status })` idiom from
// the JS version — a real class gives TypeScript something concrete to
// check with `instanceof` in the error handler, instead of an `any`-typed
// bag of properties bolted onto a plain Error.
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}
