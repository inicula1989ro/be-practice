// Shared row/DTO shapes used across repositories, services, and controllers.

export interface User {
  id: number;
  email: string;
  password_hash: string | null;
  created_at?: Date;
}

export interface Product {
  id: number;
  name: string;
  // node-postgres returns NUMERIC columns as strings (to avoid float
  // precision loss), not numbers — this matches actual runtime behavior.
  price: string;
  stock: number;
  category: string;
}

export interface NewProductInput {
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface OrderItemRow {
  order_id: number;
  status: string;
  created_at: Date;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
}

// Named TokenPayload (not JwtPayload) to avoid colliding with the
// jsonwebtoken library's own, much looser JwtPayload type.
export interface TokenPayload {
  sub: number;
  email: string;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  stock?: number;
  category?: string;
}
