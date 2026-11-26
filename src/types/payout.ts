import { Affiliate, PayoutMethod } from "./affiliate";

export interface Payout {
  id: string;
  affiliate_id: string | null;
  amount: number;
  pix_key: string;
  status: "pending" | "paid" | "cancelled" | null;
  paid_at: string | null;
  created_at: string | null;
  affiliates?: Affiliate | null; // joined via select("*, affiliates(*)")
}

export interface PayoutSummary {
  total_paid: number;
  total_pending: number;
  pending_commission: number;
  pending_achievements: number;
}

// Result of PayoutService.calculateAffiliateOwed (API DTO, not a DB entity)
export interface AffiliateOwedCalculation {
  affiliateId: string;
  name: string;
  pixKey: string;
  payoutMethod: PayoutMethod;
  baseCommission: number;
  achievementsCommission: number;
  totalEarned: number;
  alreadyPaid: number;
  owed: number;
  orderCount: number;
  lastPayoutDate: string | null;
}
