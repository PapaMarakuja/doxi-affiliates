import { Affiliate } from "./affiliate";

export interface Payout {
  id: string;
  affiliate_id: string | null;
  amount: number;
  pix_key: string;
  status: "pending" | "paid" | "cancelled" | null;
  paid_at: string | null;
  created_at: string | null;
  affiliate?: Affiliate;
}

export interface PayoutSummary {
  total_paid: number;
  total_pending: number;
  pending_commission: number;
  pending_achievements: number;
}
