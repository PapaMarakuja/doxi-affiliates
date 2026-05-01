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