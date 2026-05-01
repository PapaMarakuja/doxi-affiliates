import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { PayoutRepository } from "@/src/repositories/payout.repository";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAffiliateDataStartDate, calculateOrderCommission } from "@/src/lib/utils";

export async function GET() {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const repo = new PayoutRepository();
    const summary = await repo.getPayoutSummary();
    
    // We can use the already existing dashboard data for pending commissions
    const supabase = await createSupabaseServerClient();
    
    // Total pending calculation across all affiliates
    // Reusing the summary logic from affiliates-dashboard
    const { data: affiliates } = await supabase.from("affiliates").select("id, commission_rate, created_at");
    const { data: allOrders } = await supabase.from("orders").select("affiliate_id, total_amount, total_discounts, shipping_cost, created_at").eq('financial_status', 'paid');
    const { data: allAchievements } = await supabase.from("affiliate_achievements").select("affiliate_id, unlocked_at, achievement_definitions(reward_value)");
    const { data: allPayouts } = await supabase.from("payouts").select("affiliate_id, amount, status").not("status", "eq", "cancelled");

    let totalOwedCommission = 0;
    let totalOwedAchievements = 0;

    (affiliates || []).forEach(aff => {
      const rate = aff.commission_rate ?? 0;
      const registrationStartDate = getAffiliateDataStartDate(aff.created_at) || new Date(0).toISOString();
      const regStartTime = new Date(registrationStartDate).getTime();
      
      // Orders
      const affOrders = (allOrders || []).filter(o => 
        o.affiliate_id === aff.id && 
        new Date(o.created_at).getTime() >= regStartTime
      );
      let affBase = 0;
      affOrders.forEach(o => {
        affBase += calculateOrderCommission(o, rate);
      });

      // Achievements
      const affAchs = (allAchievements || []).filter(a => 
        a.affiliate_id === aff.id && 
        new Date(a.unlocked_at || 0).getTime() >= regStartTime
      );
      let affAchRewards = 0;
      affAchs.forEach(a => {
        if (a.achievement_definitions) affAchRewards += Number((a.achievement_definitions as any).reward_value || 0);
      });

      // Already paid/pending
      const affPayouts = (allPayouts || []).filter(p => p.affiliate_id === aff.id);
      const paidOrPending = affPayouts
        .filter(p => p.status === 'paid' || p.status === 'pending')
        .reduce((acc, p) => acc + Number(p.amount), 0);

      const totalEarned = affBase + affAchRewards;
      const owed = Math.max(0, totalEarned - paidOrPending);
      
      // Proportionally split owed between commission and achievements if we want granularity
      // For now, let's just sum them up for the summary
      totalOwedCommission += affBase;
      totalOwedAchievements += affAchRewards;
    });

    // Adjust pending commission to be "total earned - total paid/pending"
    const totalEarnedGlobal = totalOwedCommission + totalOwedAchievements;
    const totalPaidOrPendingGlobal = (allPayouts || [])
      .filter(p => p.status === 'paid' || p.status === 'pending')
      .reduce((acc, p) => acc + Number(p.amount), 0);
    
    summary.pending_commission = Math.max(0, totalEarnedGlobal - totalPaidOrPendingGlobal);

    return Response.json({ data: summary });
  } catch (error) {
    console.error("GET /api/admin/payouts/summary error:", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
