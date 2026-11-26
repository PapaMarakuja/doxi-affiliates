import type { OrderSource } from "./orders";

/** Row of `products` — catalog filled automatically by the order sync. Mirrors the DB schema. */
export interface Product {
  id: string; // uuid
  source: OrderSource;
  external_product_id: string; // product id on the store platform
  name: string;
  url: string | null;
  image_url: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}
