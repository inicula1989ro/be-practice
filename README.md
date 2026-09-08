# mag-be — Corner Store API

A small e-commerce REST API: product catalog, JWT-based auth, and order
placement backed by a real database transaction (stock is checked and
decremented atomically, with rollback on failure). API-only — the frontend
lives in a separate repo, [mag-fe](../mag-fe).

## Stack

- Node.js + Express 5, written in TypeScript
- PostgreSQL via `pg` (raw SQL, no ORM)
- `bcryptjs` for password hashing, `jsonwebtoken` for auth
- `cors`, since the frontend is now a separate origin

## Prerequisites

- Node.js
- PostgreSQL, either via Docker or a native install

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Start Postgres**
   ```
   docker compose up -d
   ```
   Or use a native Postgres install if you have one running already.

3. **Create the database**
   ```
   docker compose exec postgres psql -U postgres -c "CREATE DATABASE ecommerce;"
   ```

4. **Create the schema and seed the product catalog**
   ```
   docker compose exec -T postgres psql -U postgres -d ecommerce < db/schema.sql
   docker compose exec -T postgres psql -U postgres -d ecommerce < db/seed.sql
   ```

5. **Configure environment variables** — copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
   The defaults match the Docker setup above and Vite's default dev port
   (`5173`) for `FRONTEND_ORIGIN`, so this usually needs no edits for local
   development.

6. **Run it**
   ```
   npm run dev
   ```
   Or build and run the compiled JavaScript, closer to how you'd deploy it:
   ```
   npm run build
   npm start
   ```
   The API listens on `http://localhost:3000` — there's no UI here, pair it
   with [mag-fe](../mag-fe) running on `http://localhost:5173`, or hit it
   directly with Postman/curl.

There's no seeded user account — register one through `POST /auth/register`.

## Project structure

```
tsconfig.json               TypeScript compiler config
render.yaml                 Render Blueprint (web service + Postgres)
docker-compose.yml          local Postgres for development
src/
  server.ts                 entrypoint — requires app.ts and listens
  app.ts                    assembles middleware + routes (CORS, JSON, error handling)
  config/db.ts               pg connection pool
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
tests/
  unit/                      no-DB validation tests
  integration/                full HTTP request tests against a real database
  helpers/                    resetDb/closeDb, registerAndLogin
```

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
rejects expired/invalid tokens with `401`).

## CORS

`FRONTEND_ORIGIN` (env var, comma-separated if you need more than one) lists
which origins are allowed to call this API from a browser. Defaults to
`http://localhost:5173`, Vite's default dev port. Update it (locally in
`.env`, and on Render as a service env var) whenever mag-fe's URL changes —
a mismatch here surfaces as a CORS error in the browser console, not
anything server-side.

## Testing

Vitest + Supertest, split into unit tests (validation logic, no DB) and
integration tests (full HTTP requests through the real Express `app` and a
real database).

1. **Create a separate test database**:
   ```
   docker compose exec postgres psql -U postgres -c "CREATE DATABASE ecommerce_test;"
   ```

2. **Apply the schema to it:**
   ```
   docker compose exec -T postgres psql -U postgres -d ecommerce_test < db/schema.sql
   ```

3. **Create `.env.test`** in this folder (gitignored):
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce_test
   JWT_SECRET=test-secret-do-not-use-in-production
   ```

4. **Run the suite:**
   ```
   npm test
   ```

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`: spins up a
throwaway Postgres, type-checks, applies the schema, and runs the test
suite. Deploys to Render via `render.yaml` (a Blueprint — web service +
managed Postgres) once pushed to GitHub and connected on Render's side.

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
