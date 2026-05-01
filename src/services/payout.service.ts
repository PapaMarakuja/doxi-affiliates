import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { AffiliateRepository } from "@/src/repositories/affiliate.repository";
import { getAffiliateDataStartDate, calculateOrderCommission } from "@/src/lib/utils";

export class PayoutService {
  async calculateAffiliateOwed(affiliateId: string) {
    const supabase = await createSupabaseServerClient();
    
    // Get affiliate info including profile for pix_key
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("*, profiles(pix_key)")
      .eq("id", affiliateId)
      .single();

    if (!affiliate) throw new Error("Afiliado não encontrado");

    const rate = affiliate.commission_rate ?? 0;
    // Pega o início do mês do cadastro conforme regra do BCC
    const registrationStartDate = getAffiliateDataStartDate(affiliate.created_at) || new Date(0).toISOString();

    // Get orders, achievements, and existing payouts
    const [
      { data: orders },
      { data: achievements },
      { data: payouts }
    ] = await Promise.all([
      supabase.from("orders")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .eq("financial_status", "paid")
        .gte("created_at", registrationStartDate),
      supabase.from("affiliate_achievements")
        .select("*, achievement_definitions(*)")
        .eq("affiliate_id", affiliateId)
        .gte("unlocked_at", registrationStartDate),
      supabase.from("payouts")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .not("status", "eq", "cancelled")
    ]);

    // Calculate base commission using centralized function
    let baseCommissionTotal = 0;
    (orders || []).forEach(o => {
      baseCommissionTotal += calculateOrderCommission(o, rate);
    });

    // Calculate achievements commission
    let achievementsCommissionTotal = 0;
    (achievements || []).forEach(a => {
      if (a.achievement_definitions) {
        achievementsCommissionTotal += Number(a.achievement_definitions.reward_value || 0);
      }
    });

    const totalEarned = baseCommissionTotal + achievementsCommissionTotal;
    const alreadyPaidOrPending = (payouts || [])
      .filter(p => p.status === "paid" || p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const owed = Math.max(0, totalEarned - alreadyPaidOrPending);

    // Get last payout date
    const paidPayouts = (payouts || []).filter(p => p.status === "paid");
    const lastPayout = paidPayouts.length > 0 
      ? paidPayouts.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0] 
      : null;

    return {
      affiliateId,
      name: affiliate.name,
      pixKey: affiliate.profiles?.pix_key || "Não cadastrada",
      baseCommission: baseCommissionTotal,
      achievementsCommission: achievementsCommissionTotal,
      totalEarned,
      alreadyPaid: alreadyPaidOrPending,
      owed,
      orderCount: (orders || []).length,
      lastPayoutDate: lastPayout?.paid_at || lastPayout?.created_at || null
    };
  }
}
