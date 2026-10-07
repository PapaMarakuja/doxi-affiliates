import { Coupon } from "./coupon";

export type PayoutMethod = "pix" | "cupom";

export interface Affiliate {
  id: string;
  name: string;
  commission_rate: number | null;
  created_at: string;
  profile_id: string | null;
  pix_key: string | null;
  payout_method: PayoutMethod | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export interface AffiliateWithCoupons extends Affiliate {
  coupons: Coupon[];
}