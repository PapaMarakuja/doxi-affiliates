export interface Coupon {
  id: string;
  code: string;
  affiliate_id: string | null;
  discount_percentage: number | null;
  active: boolean;
  created_at: string;
}