export type AchievementType = 'commission' | 'engagement';
export type AchievementMetric = 'total_commission' | 'cycle_conversions' | 'total_conversions';
export type RewardType = 'coupon' | 'bonus_cash' | 'badge';
export type ResetPeriod = 'never' | 'monthly' | 'weekly';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string | null;
  type: AchievementType;
  metric: AchievementMetric;
  goal: number;
  reward_type: RewardType;
  reward_value: number;
  icon_key: string | null;
  color_hex: string;
  is_repeatable: boolean;
  sort_order: number;
  reset_period: ResetPeriod;
  reset_day: number;
  created_at?: string;
}

export interface AffiliateAchievement {
  id: string;
  affiliate_id: string;
  achievement_id: number;
  unlocked_at: string;
  reward_claimed: boolean;
  reward_claimed_at: string | null;
  value_at_unlock: number;

  // Relacionamento opcional (quando você faz o .select('*, achievement_definitions(*)'))
  achievement_definitions?: AchievementDefinition;
}
// API response of GET /api/admin/affiliates-dashboard (not a DB entity)
export interface UnlockedAchievement extends Partial<AchievementDefinition> {
  unlocked_at: string;
}

export interface AffiliateDashboardRow {
  id: string;
  name: string;
  commission_rate: number;
  active_achievements_month: number;
  orders_month: number;
  base_month: number;
  achievements_month: number;
  total_month: number;
  base_total: number;
  achievements_total: number;
  total_all_time: number;
  to_pay: number;
  last_payout_date: string | null;
  unlocked_achievements: UnlockedAchievement[];
  created_at: string;
}

export interface AffiliatesDashboardSummary {
  total_month: number;
  base_month: number;
  achievements_month: number;
  orders_month: number;
  orders_growth: number;
  active_affiliates: number;
  total_affiliates: number;
  pending_payouts: number;
  affiliates_with_pending_payouts: number;
}

export interface AffiliatesDashboardData {
  summary: AffiliatesDashboardSummary;
  affiliates: AffiliateDashboardRow[];
}

// affiliate_achievements selected with "*, achievement_definitions(*), affiliates(name)"
export interface AffiliateAchievementWithAffiliate extends AffiliateAchievement {
  affiliates: { name: string } | null;
}
