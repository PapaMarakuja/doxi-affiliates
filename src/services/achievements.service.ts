import { createSupabaseServerClient, createSupabaseServiceClient } from "@/src/lib/supabase/server";
import { AuthService } from "./auth.service";
import type { ApiResponse } from "@/src/types";
import type { AchievementDefinition, AffiliateAchievement } from "@/src/types/achievements";
import { getAffiliateDataStartDate } from "@/src/lib/utils";

type ClaimByAchievementInput = {
  affiliateId: string;
  achievementId: string;
};

export class AchievementsService {
  async getAchievements(): Promise<ApiResponse<AchievementDefinition[]>> {
    const supabase = await createSupabaseServerClient();

    const { data: definitions, error: defError } = await supabase
      .from("achievement_definitions")
      .select("*")
      .order("sort_order", { ascending: true });

    if (defError) {
      return { data: null, error: defError.message };
    }

    return { data: definitions, error: null };
  }

  async getAffiliateAchievements(affiliateId: string): Promise<ApiResponse<AffiliateAchievement[]>> {
    const supabase = await createSupabaseServerClient();
    const { data: affiliateAchievements, error: affError } = await supabase
      .from("affiliate_achievements")
      .select("*, achievement_definitions(*)")
      .eq("affiliate_id", affiliateId);

    if (affError) {
      return { data: null, error: affError.message };
    }

    return { data: affiliateAchievements, error: null };
  }

  async getAllAffiliateAchievements(affiliateId?: string): Promise<ApiResponse<any[]>> {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("affiliate_achievements")
      .select("*, achievement_definitions(*), affiliates(name)");

    if (affiliateId) {
      query = query.eq("affiliate_id", affiliateId);
    }

    const { data: affiliateAchievements, error: affError } = await query;

    if (affError) {
      return { data: null, error: affError.message };
    }

    return { data: affiliateAchievements, error: null };
  }


  async createAchievement(payload: Partial<AchievementDefinition>): Promise<ApiResponse<AchievementDefinition>> {
    const authService = new AuthService();
    const { data: authData } = await authService.getProfile();
    if (!authData || authData.profile.role !== "admin") {
      return { data: null, error: "Acesso negado." };
    }

    const supabase = await createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("achievement_definitions")
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async updateAchievement(id: string | number, payload: Partial<AchievementDefinition>): Promise<ApiResponse<AchievementDefinition>> {
    const authService = new AuthService();
    const { data: authData } = await authService.getProfile();
    if (!authData || authData.profile.role !== "admin") {
      return { data: null, error: "Acesso negado." };
    }

    const supabase = await createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("achievement_definitions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async deleteAchievement(id: string | number): Promise<ApiResponse<{ success: boolean }>> {
    const authService = new AuthService();
    const { data: authData } = await authService.getProfile();
    if (!authData || authData.profile.role !== "admin") {
      return { data: null, error: "Acesso negado." };
    }

    const supabase = await createSupabaseServiceClient();
    const { error } = await supabase
      .from("achievement_definitions")
      .delete()
      .eq("id", id);

    if (error) return { data: null, error: error.message };
    return { data: { success: true }, error: null };
  }

  async claimReward(achievementRowId: string): Promise<ApiResponse<any>> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc("claim_achievement_reward", {
      achievement_row_id: achievementRowId
    });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async claimRewardByAchievement({
    affiliateId,
    achievementId
  }: ClaimByAchievementInput): Promise<ApiResponse<any>> {
    const definitionResult = await this.getAchievementDefinitionById(achievementId);
    if (definitionResult.error) return { data: null, error: definitionResult.error };
    if (!definitionResult.data) return { data: null, error: "Conquista não encontrada." };

    const definition = definitionResult.data;

    const metricResult = await this.getAffiliateMetricValue({
      affiliateId,
      metric: definition.metric,
      resetPeriod: definition.reset_period,
      resetDay: definition.reset_day
    });
    if (metricResult.error) return { data: null, error: metricResult.error };

    const metricValue = metricResult.data ?? 0;
    console.log('🐒 - metricResult.data:', metricResult.data);
    console.log('🐒 - metricValue:', metricValue);
    if (metricValue < definition.goal) {
      return { data: null, error: "Meta ainda não foi atingida para esta conquista." };
    }

    const previousResult = await this.getLatestAffiliateAchievementRow(
      affiliateId,
      achievementId
    );
    if (previousResult.error) return { data: null, error: previousResult.error };

    const latestRow = previousResult.data;
    const now = new Date();

    if (!definition.is_repeatable && latestRow) {
      return { data: null, error: "Esta conquista não é repetível e já foi resgatada." };
    }

    if (definition.is_repeatable && latestRow) {
      const cycleStart = this.getCycleStartDate(
        now,
        definition.reset_period,
        definition.reset_day
      );

      if (!cycleStart) {
        return {
          data: null,
          error: "Configuração de reset inválida para conquista repetível."
        };
      }

      const lastUnlocked = latestRow.unlocked_at ? new Date(latestRow.unlocked_at) : null;
      if (lastUnlocked && lastUnlocked >= cycleStart) {
        return { data: null, error: "Conquista já resgatada no ciclo atual." };
      }
    }

    const createResult = await this.createAndClaimAchievement({
      affiliateId,
      achievementId,
      valueAtUnlock: metricValue
    });

    if (createResult.error) return { data: null, error: createResult.error };
    return { data: createResult.data, error: null };
  }

  private async getAchievementDefinitionById(
    achievementId: string
  ): Promise<ApiResponse<AchievementDefinition | null>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("achievement_definitions")
      .select("*")
      .eq("id", achievementId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data ?? null, error: null };
  }

  private async getLatestAffiliateAchievementRow(
    affiliateId: string,
    achievementId: string
  ): Promise<ApiResponse<{ id: string; unlocked_at: string | null } | null>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("affiliate_achievements")
      .select("id, unlocked_at")
      .eq("affiliate_id", affiliateId)
      .eq("achievement_id", achievementId)
      .order("unlocked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data ?? null, error: null };
  }

  private async getAffiliateMetricValue(params: {
    affiliateId: string;
    metric: AchievementDefinition["metric"];
    resetPeriod: AchievementDefinition["reset_period"];
    resetDay: number;
  }): Promise<ApiResponse<number>> {
    const supabase = await createSupabaseServerClient();
    const affiliateBaseResult = await this.getAffiliateBaseInfo(params.affiliateId);
    if (affiliateBaseResult.error) return { data: null, error: affiliateBaseResult.error };
    const affiliateBase = affiliateBaseResult.data;
    if (!affiliateBase) return { data: null, error: "Afiliado não encontrado." };

    const affiliateDataStartDate = getAffiliateDataStartDate(affiliateBase.created_at);
    const { data: coupons, error: couponError } = await supabase
      .from("coupons")
      .select("id")
      .eq("affiliate_id", params.affiliateId);

    if (couponError) return { data: null, error: couponError.message };

    const couponIds = (coupons ?? []).map((coupon) => coupon.id);
    if (!couponIds.length) return { data: 0, error: null };

    let ordersQuery = supabase
      .from("orders")
      .select("created_at, financial_status, total_amount, total_discounts, shipping_cost")
      .in("coupon_id", couponIds)
      .eq("financial_status", "paid");

    if (affiliateDataStartDate) {
      ordersQuery = ordersQuery.gte("created_at", affiliateDataStartDate);
    }

    const { data: orders, error: orderError } = await ordersQuery;

    if (orderError) return { data: null, error: orderError.message };

    const paidOrders = orders ?? [];
    if (["total_conversions", 'cycle_conversions'].includes(params.metric)) {
      return { data: paidOrders.length, error: null };
    }

    if (params.metric === "total_commission") {
      const rate = Number(affiliateBase.commission_rate ?? 0);
      const totalCommission = paidOrders.reduce((acc, order) => {
        const base =
          Number(order.total_amount || 0) -
          Number(order.total_discounts || 0) -
          Number(order.shipping_cost || 0);

        if (base <= 0 || rate <= 0) return acc;
        return acc + base * (rate / 100);
      }, 0);

      return { data: Number(totalCommission.toFixed(2)), error: null };
    }

    const cycleStart = this.getCycleStartDate(new Date(), params.resetPeriod, params.resetDay);
    if (!cycleStart) {
      return { data: null, error: "Configuração de ciclo inválida para esta conquista." };
    }

    const cycleConversions = paidOrders.filter((order) => {
      if (!order.created_at) return false;
      return new Date(order.created_at) >= cycleStart;
    }).length;

    return { data: cycleConversions, error: null };
  }

  private async getAffiliateBaseInfo(
    affiliateId: string
  ): Promise<ApiResponse<{ commission_rate: number | null; created_at: string } | null>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("affiliates")
      .select("commission_rate, created_at")
      .eq("id", affiliateId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return {
      data: data
        ? {
          commission_rate: data.commission_rate,
          created_at: data.created_at,
        }
        : null,
      error: null,
    };
  }

  private getCycleStartDate(
    referenceDate: Date,
    resetPeriod: AchievementDefinition["reset_period"],
    resetDay: number
  ): Date | null {
    if (resetPeriod === "never") return new Date(0);

    if (resetPeriod === "monthly") {
      const safeDay = Math.min(Math.max(resetDay || 1, 1), 28);
      const now = new Date(referenceDate);
      const start = new Date(now.getFullYear(), now.getMonth(), safeDay);
      if (now.getDate() < safeDay) {
        return new Date(now.getFullYear(), now.getMonth() - 1, safeDay);
      }
      return start;
    }

    if (resetPeriod === "weekly") {
      const rawDay = Number.isFinite(resetDay) ? resetDay : 1;
      const normalizedDay = ((Math.max(1, Math.min(7, rawDay)) % 7) + 7) % 7;
      const now = new Date(referenceDate);
      const currentWeekday = now.getDay();
      const diff = (currentWeekday - normalizedDay + 7) % 7;
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    return null;
  }

  private async createAndClaimAchievement(params: {
    affiliateId: string;
    achievementId: string;
    valueAtUnlock: number;
  }): Promise<ApiResponse<any>> {
    const supabase = await createSupabaseServiceClient();

    const { data: createdRow, error: createError } = await supabase
      .from("affiliate_achievements")
      .insert({
        affiliate_id: params.affiliateId,
        achievement_id: params.achievementId,
        value_at_unlock: params.valueAtUnlock,
        reward_claimed: false
      })
      .select("*")
      .single();

    if (createError || !createdRow) {
      return { data: null, error: createError?.message ?? "Erro ao criar conquista desbloqueada." };
    }

    const claimResult = await this.claimReward(createdRow.id);
    if (claimResult.error) {
      await supabase
        .from("affiliate_achievements")
        .delete()
        .eq("id", createdRow.id);

      return { data: null, error: claimResult.error };
    }

    return { data: claimResult.data ?? createdRow, error: null };
  }
}
