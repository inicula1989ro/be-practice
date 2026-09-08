# Corner Store — Node + Express + PostgreSQL

A small e-commerce API and store frontend: product catalog, JWT-based auth,
and order placement backed by a real database transaction (stock is checked
and decremented atomically, with rollback on failure).

## Stack

- Node.js + Express 5, written in TypeScript
- PostgreSQL via `pg` (raw SQL, no ORM)
- `bcryptjs` for password hashing, `jsonwebtoken` for auth
- Vanilla HTML/CSS/JS frontend (no TypeScript, no build step), served as
  static files by the same server

## Prerequisites

- Node.js
- PostgreSQL, either via Docker or a native install

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Start Postgres**

   Using the `docker-compose.yml` one level up (`backend-starter/`):
   ```
   cd ..
   docker compose up -d
   cd phase-3
   ```
   Or use a native Postgres install if you have one running already.

3. **Create the database**
   ```
   docker compose exec postgres psql -U postgres -c "CREATE DATABASE ecommerce;"
   ```
   (drop `docker compose exec postgres` if connecting to a native install instead)

4. **Create the schema and seed the product catalog**
   ```
   psql -U postgres -d ecommerce -f db/schema.sql
   psql -U postgres -d ecommerce -f db/seed.sql
   ```
   If you're going through Docker rather than a local `psql`:
   ```
   docker compose exec -T postgres psql -U postgres -d ecommerce < db/schema.sql
   docker compose exec -T postgres psql -U postgres -d ecommerce < db/seed.sql
   ```

5. **Configure environment variables** — create a `.env` file in this folder:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce
   JWT_SECRET=change-this-to-something-long-and-random
   ```

6. **Run it**

   For development, with automatic restarts on file changes:
   ```
   npm run dev
   ```
   Or build and run the compiled JavaScript, closer to how you'd deploy it:
   ```
   npm run build
   npm start
   ```
   Then open `http://localhost:3000/` — you'll be redirected to `/auth.html`
   since there's no logged-in session yet. Register an account, log in, and
   you're in the store.

There's no seeded user account — register one through the UI (or
`POST /auth/register`) rather than using a pre-made login.

## Project structure

```
tsconfig.json               TypeScript compiler config
src/
  server.ts                 entrypoint — requires app.ts and listens
  app.ts                    assembles middleware + routes, serves public/
  config/db.ts              pg connection pool
  middleware/
    auth.ts                 requireAuth — verifies the JWT, sets req.userId
    errorHandler.ts          centralized error responses (HttpError-aware)
  modules/
    auth/                   routes -> controller -> service -> repository
    products/                "
    orders/                   "
  types/
    models.ts               shared row/DTO interfaces (User, Product, ...)
    express.d.ts             augments Express's Request with `userId`
  utils/
    HttpError.ts             typed error class carrying an HTTP status
dist/                        compiled output (npm run build) — gitignored
db/
  schema.sql                table definitions, constraints, indexes
  seed.sql                  demo product catalog
public/
  index.html, app.js        the store (product grid, cart, checkout, order history)
  auth.html, auth.js        login / register
  new-product.html, .js     add-product form
  style.css                 shared styles
```

The frontend (`public/`) is deliberately still plain JavaScript — it's
served as-is with no build step, only the backend is TypeScript.

## API reference

| Method | Path                | Auth required | Description |
|--------|---------------------|:---:|---|
| POST   | `/auth/register`    | no  | Create an account. Body: `{ email, password }` (password min 8 chars). |
| POST   | `/auth/login`       | no  | Returns `{ token, user }` on success. |
| GET    | `/products`         | no  | List all products with current stock. |
| POST   | `/products`         | yes | Create a product. Body: `{ name, price, stock, category }`. Any authenticated user can do this — there's no admin/regular-user distinction yet. |
| PATCH  | `/products/:id`     | yes | Update a product. Body: any subset of `{ name, price, stock, category }` (must be non-empty). `404` if the product doesn't exist. |
| DELETE | `/products/:id`     | yes | Delete a product. `404` if it doesn't exist, `409` if it's referenced by an existing order. |
| POST   | `/orders`           | yes | Place an order. Body: `{ items: [{ productId, quantity }] }`. Runs as a single DB transaction — stock is checked and decremented atomically; insufficient stock rolls back the whole order (`409`). |
| GET    | `/users/:id/orders` | yes | Order history for a user. `:id` must match the authenticated user (`403` otherwise). |

Authenticated requests need `Authorization: Bearer <token>`, using the token
returned from `/auth/login`. Tokens expire after 1 hour (`requireAuth`
rejects expired/invalid tokens with `401`); the frontend handles this by
redirecting back to `/auth.html`.

## Testing

Vitest + Supertest, split into unit tests (validation logic, no DB) and
integration tests (full HTTP requests through the real Express `app` and a
real database).

1. **Create a separate test database** — never point tests at your dev
   database, since every test run truncates all tables:
   ```
   docker compose exec postgres psql -U postgres -c "CREATE DATABASE ecommerce_test;"
   ```
   (drop `docker compose exec postgres` if using a native install)

2. **Apply the schema to it:**
   ```
   docker compose exec -T postgres psql -U postgres -d ecommerce_test < db/schema.sql
   ```
   (seed data isn't needed — tests create their own products/users)

3. **Create `.env.test`** in this folder (already gitignored):
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce_test
   JWT_SECRET=test-secret-do-not-use-in-production
   ```

4. **Run the suite:**
   ```
   npm test
   ```
   or `npm run test:watch` to re-run on file changes.

`src/config/db.ts` loads `.env.test` instead of `.env` whenever
`process.env.VITEST` is set (Vitest sets this automatically), so `npm test`
never touches your dev database as long as step 3 is done.

Each integration test file truncates all tables before every test
(`tests/helpers/testDb.ts`), so tests don't depend on each other's data or
on running order.

## CI

`.github/workflows/ci.yml` (one level up, at `backend-starter/`) runs on
every push/PR to `main`: spins up a throwaway `postgres:16` service
container, installs deps, type-checks (`tsc --noEmit`), applies
`db/schema.sql` to it, then runs `npm test`. No secrets or `.env` files
needed — `DATABASE_URL`/`JWT_SECRET` are set directly as job env vars.

This only runs once the project is pushed to GitHub. There's no git repo
here yet — to enable it:
```
cd ..
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Notes

- `GET /products` is intentionally public — browsing doesn't require login,
  only placing an order does.
- The order-placement transaction uses `SELECT ... FOR UPDATE` to lock each
  product row for the duration of the transaction, preventing two concurrent
  orders from both succeeding against the same limited stock.
- Login returns `404` (not `401`) for both "no such user" and "wrong
  password," using the same message for both — this avoids revealing whether
  an email is registered, even though the status code itself is a slightly
  unconventional choice for an auth failure.
