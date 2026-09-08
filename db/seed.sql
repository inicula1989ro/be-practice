-- Demo products only — run once, after schema.sql.
-- Users are created for real through POST /auth/register (or the /auth.html
-- form), so there's no fake/passwordless seed data for them here.
--   psql -U postgres -d ecommerce -f db/seed.sql

INSERT INTO products (name, price, stock, category) VALUES
  ('Wireless Mouse', 25.00, 100, 'electronics'),
  ('Mechanical Keyboard', 89.00, 50, 'electronics'),
  ('USB-C Hub', 35.00, 75, 'electronics'),
  ('Node.js in Action', 40.00, 30, 'books'),
  ('SQL Cookbook', 45.00, 20, 'books'),
  ('Desk Lamp', 22.00, 60, 'home');
