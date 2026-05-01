export interface Orders {
  id: string;
  shopify_order_id: string;
  affiliate_id: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  total_amount: number;
  total_discounts: number;
  shipping_cost: number;
  currency: string;
  financial_status: "paid" | "refunded" | "processing" | "unpaid";
  created_at: string;
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
  syncResult: {
    synced: number;
    apiStatus: string;
    error: string | null;
  } | null;
}
