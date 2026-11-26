/** Row of `restock_subscriptions` ("Avise-me quando chegar" / Notify Me). Mirrors the DB schema. */
export interface RestockSubscription {
  id: string; // uuid
  product_id: number; // int8
  variant_id: number; // int8
  variant_label: string;
  email: string;
  consent_at: string; // timestamptz
  created_at: string; // timestamptz
  notified_at: string | null; // timestamptz — null while the customer was not notified yet
}

// ── API DTOs (GET /api/admin/restock-subscriptions) ──

export interface RestockVariantSummary {
  variant_id: number;
  variant_label: string;
  total: number;
  pending: number;
  notified: number;
}

export interface RestockProductSummary {
  product_id: number;
  /** From `products` (filled by the order sync); null when the product was never sold yet. */
  name: string | null;
  url: string | null;
  total: number;
  pending: number;
  notified: number;
  last_subscribed_at: string;
  variants: RestockVariantSummary[];
}

export interface RestockSubscriptionsOverview {
  total: number;
  pending: number;
  notified: number;
  products: RestockProductSummary[];
}
