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
