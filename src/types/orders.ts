export type OrderSource = "shopify" | "nuvemshop";

export interface Orders {
  id: string;
  external_order_id: string;
  source: OrderSource;
  affiliate_id: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  customer_id: string | null;
  total_amount: number;
  total_discounts: number;
  shipping_cost: number;
  currency: string;
  financial_status: "paid" | "refunded" | "processing" | "unpaid";
  created_at: string;
  updated_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  synced_at: string;
}

export interface DashboardData {
  isAdmin: boolean;
  lastSyncedAt: string | null;
  stats: {
    activeCoupons: number;
    totalCommissions: number;
    monthlyCommissions: number;
    totalRevenue: number;
    monthlyRevenue: number;
    couponSales: number;
  };
  orders: Orders[];
  chartMonthly: { label: string; value: number }[];
  chartDaily: { label: string; value: number }[];
  syncResult: DashboardSyncResult | null;
}

export interface StoreSyncResult {
  newOrders: number;
  updatedOrders: number;
  apiStatus: string;
  error: string | null;
}

export interface DashboardSyncResult {
  shopify: StoreSyncResult | null;
  nuvemshop: StoreSyncResult | null;
}

/** Row of `order_items`. Mirrors the DB schema. */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null; // FK products.id
  /** Legacy snapshot — only filled when the item could not be linked to `products`. */
  product_name: string | null;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  created_at: string | null;
}

// Shape of `order_items` selected with its linked product (query DTO).
export type OrderItemSummary = Pick<OrderItem, "product_name" | "variant_label" | "quantity"> & {
  unit_price?: number | null;
  products: { name: string } | null;
};

export type OrderWithItems = Pick<
  Orders,
  "id" | "external_order_id" | "created_at" | "financial_status" | "total_amount" | "total_discounts" | "shipping_cost"
> & {
  cancelled_at?: string | null;
  coupon_code?: string | null;
  order_items: OrderItemSummary[] | null;
};
