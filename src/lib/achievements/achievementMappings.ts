import { AchievementType, AchievementMetric, RewardType, ResetPeriod } from "@/src/types/achievements";

export const ACHIEVEMENT_TYPE_LABELS: Record<AchievementType, string> = {
  commission: "Comissão",
  engagement: "Engajamento",
};

export const ACHIEVEMENT_METRIC_LABELS: Record<AchievementMetric, string> = {
  total_commission: "Comissão Total",
  cycle_conversions: "Vendas no Ciclo",
  total_conversions: "Vendas Totais",
};

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  coupon: "Cupom",
  bonus_cash: "Bônus (Dinheiro)",
  badge: "Medalha/Brinde",
};

export const RESET_PERIOD_LABELS: Record<ResetPeriod, string> = {
  never: "Nunca (Vitalício)",
  monthly: "Mensal",
  weekly: "Semanal",
};

export const ACHIEVEMENT_TYPE_OPTIONS = Object.entries(ACHIEVEMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const ACHIEVEMENT_METRIC_OPTIONS = Object.entries(ACHIEVEMENT_METRIC_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const REWARD_TYPE_OPTIONS = Object.entries(REWARD_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const RESET_PERIOD_OPTIONS = Object.entries(RESET_PERIOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));
