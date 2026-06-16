import { getAuthenticatedAffiliate } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAffiliateDataStartDate, calculateOrderCommission } from "@/src/lib/utils";

/**
 * GET /api/payouts
 *
 * Retorna o resumo financeiro e o histórico de pagamentos do afiliado logado.
 *
 * Regras idênticas ao PayoutService (lado admin):
 *  - Orders filtradas por affiliate_id + financial_status = "paid" + desde registrationStart
 *  - BCC calculado via calculateOrderCommission (centralizado)
 *  - Conquistas (affiliate_achievements) somadas ao total ganho
 *  - Deduções: payouts com status "paid" ou "pending" (não cancelados)
 *  - availableToWithdraw = totalEarned - alreadyPaidOrPending
 */
export async function GET() {
  const { data: affiliate, error: authError } = await getAuthenticatedAffiliate();

  if (authError || !affiliate) {
    return Response.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    const rate = affiliate.commission_rate ?? 0;
    const registrationStart = getAffiliateDataStartDate(affiliate.created_at) || new Date(0).toISOString();

    // Buscar orders, conquistas e payouts em paralelo — mesma lógica do PayoutService
    const [
      { data: orders },
      { data: achievements },
      { data: payouts },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total_amount, total_discounts, shipping_cost, created_at, financial_status")
        .eq("affiliate_id", affiliate.id)
        .eq("financial_status", "paid")
        .gte("created_at", registrationStart),
      supabase
        .from("affiliate_achievements")
        .select("*, achievement_definitions(*)")
        .eq("affiliate_id", affiliate.id)
        .gte("unlocked_at", registrationStart),
      supabase
        .from("payouts")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false }),
    ]);

    // Comissão base — usa a mesma função centralizada do PayoutService
    let baseCommission = 0;
    (orders || []).forEach((o) => {
      baseCommission += calculateOrderCommission(o, rate);
    });

    // Comissão de conquistas
    let achievementsCommission = 0;
    (achievements || []).forEach((a) => {
      if (a.achievement_definitions) {
        achievementsCommission += Number(a.achievement_definitions.reward_value || 0);
      }
    });

    const totalEarned = baseCommission + achievementsCommission;

    // Já pago ou em processamento (pending) — mesmo critério do PayoutService
    const alreadyPaidOrPending = (payouts || [])
      .filter((p) => p.status === "paid" || p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const availableToWithdraw = Math.max(0, totalEarned - alreadyPaidOrPending);

    const totalPaid = (payouts || [])
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalProcessing = (payouts || [])
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const lastPayout = (payouts || []).find((p) => p.status === "paid") || null;

    return Response.json({
      data: {
        totalCommissions: parseFloat(totalEarned.toFixed(2)),
        pendingCommissions: parseFloat(achievementsCommission.toFixed(2)), // mantido por compatibilidade de interface
        availableToWithdraw: parseFloat(availableToWithdraw.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        totalProcessing: parseFloat(totalProcessing.toFixed(2)),
        lastPayout,
        pixKey: affiliate.pix_key || "",
        payouts: payouts || [],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
