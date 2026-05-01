import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { AuthService } from "@/src/services/auth.service";
import { getAffiliateDataStartDate, calculateOrderCommission } from "@/src/lib/utils";

export async function GET(request: Request) {
  try {
    const authService = new AuthService();
    const { data: authData } = await authService.getProfile();
    
    if (!authData || authData.profile.role !== "admin") {
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || new Date().getMonth().toString());
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    const supabase = await createSupabaseServerClient();

    const [
      { data: affiliates },
      { data: orders },
      { data: affAchievements },
      { data: payouts }
    ] = await Promise.all([
      supabase.from("affiliates").select("*"),
      supabase.from("orders").select("id, affiliate_id, total_amount, total_discounts, shipping_cost, created_at, financial_status").eq('financial_status', 'paid'), // Consider only paid orders for commission? The image shows "Pedidos no mês: 138". Maybe all orders? Let's get all and filter inside.
      supabase.from("affiliate_achievements").select("*, achievement_definitions(*)"),
      supabase.from("payouts").select("*")
    ]);

    const { data: allOrders } = await supabase.from("orders").select("id, affiliate_id, total_amount, total_discounts, shipping_cost, created_at, financial_status");

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    // For % calculation, previous month
    const prevStartDate = new Date(year, month - 1, 1);
    const prevEndDate = new Date(year, month, 0, 23, 59, 59, 999);

    let globalBaseCommissionMonth = 0;
    let globalAchievementsCommissionMonth = 0;
    let globalOrdersMonth = 0;
    let globalPrevOrdersMonth = 0;
    let globalPendingPayouts = 0;
    let activeAffiliatesCount = 0;

    const affiliateDetails = (affiliates || []).map(affiliate => {
      const rate = affiliate.commission_rate ?? 0;

      // Filter orders
      const registrationStartDate = getAffiliateDataStartDate(affiliate.created_at) || new Date(0).toISOString();
      const regStartTime = new Date(registrationStartDate).getTime();
      
      const affOrders = (allOrders || []).filter(o => 
        o.affiliate_id === affiliate.id && 
        new Date(o.created_at).getTime() >= regStartTime
      );
      const affOrdersMonth = affOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= startDate && d <= endDate;
      });
      const affOrdersPrevMonth = affOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= prevStartDate && d <= prevEndDate;
      });

      globalOrdersMonth += affOrdersMonth.length;
      globalPrevOrdersMonth += affOrdersPrevMonth.length;

      // Base commission
      let baseTotal = 0;
      let baseMonth = 0;

      affOrders.forEach(o => {
        if (o.financial_status === "paid") {
          const commission = calculateOrderCommission(o, rate);
          baseTotal += commission;
          
          const d = new Date(o.created_at);
          if (d >= startDate && d <= endDate) {
            baseMonth += commission;
          }
        }
      });

      // Achievements commission
      let achievementsTotal = 0;
      let achievementsMonth = 0;
      let activeAchievementsMonthCount = 0;

      const myAchievements = (affAchievements || []).filter(a => 
        a.affiliate_id === affiliate.id && 
        new Date(a.unlocked_at).getTime() >= regStartTime
      );
      
      // Calculate total achievements (all time)
      // Group by month to deduplicate repeatable achievements per month
      const processAchievements = (achList: any[]) => {
        let sum = 0;
        // Group by month-year
        const groups: Record<string, any[]> = {};
        achList.forEach(a => {
          const d = new Date(a.unlocked_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(a);
        });

        for (const key in groups) {
          const achs = groups[key];
          const deduplicated = new Set();
          achs.forEach(a => {
            if (a.achievement_definitions) {
              if (a.achievement_definitions.is_repeatable) {
                if (!deduplicated.has(a.achievement_id)) {
                  deduplicated.add(a.achievement_id);
                  sum += Number(a.achievement_definitions.reward_value || 0);
                }
              } else {
                if (!deduplicated.has(a.achievement_id)) {
                  deduplicated.add(a.achievement_id);
                  sum += Number(a.achievement_definitions.reward_value || 0);
                }
              }
            }
          });
        }
        return sum;
      };

      achievementsTotal = processAchievements(myAchievements);
      
      const myAchievementsMonth = myAchievements.filter(a => {
        const d = new Date(a.unlocked_at);
        return d >= startDate && d <= endDate;
      });
      
      achievementsMonth = processAchievements(myAchievementsMonth);

      // Count active achievements this month
      const dedupSet = new Set();
      myAchievementsMonth.forEach(a => {
        if (!dedupSet.has(a.achievement_id)) {
          dedupSet.add(a.achievement_id);
          activeAchievementsMonthCount++;
        }
      });

      globalBaseCommissionMonth += baseMonth;
      globalAchievementsCommissionMonth += achievementsMonth;

      if (affOrdersMonth.length > 0 || activeAchievementsMonthCount > 0) {
        activeAffiliatesCount++;
      }

      // Payouts
      const myPayouts = (payouts || []).filter(p => p.affiliate_id === affiliate.id);
      const paidAndProcessing = myPayouts
        .filter(p => p.status === 'paid' || p.status === 'pending')
        .reduce((acc, p) => acc + Number(p.amount), 0);

      const totalCommissionAllTime = baseTotal + achievementsTotal;
      const toPay = Math.max(0, totalCommissionAllTime - paidAndProcessing);

      globalPendingPayouts += toPay;

      const paidPayouts = myPayouts.filter(p => p.status === 'paid');
      const lastPayout = paidPayouts.length > 0 
        ? paidPayouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
        : null;
      const lastPayoutDate = lastPayout ? lastPayout.created_at : null;

      // Group unlocked achievements to return for the modal
      const unlockedAchievements = myAchievements.map(a => ({
        ...a.achievement_definitions,
        unlocked_at: a.unlocked_at
      }));

      return {
        id: affiliate.id,
        name: affiliate.name,
        commission_rate: rate,
        active_achievements_month: activeAchievementsMonthCount,
        orders_month: affOrdersMonth.length,
        base_month: baseMonth,
        achievements_month: achievementsMonth,
        total_month: baseMonth + achievementsMonth,
        base_total: baseTotal,
        achievements_total: achievementsTotal,
        total_all_time: totalCommissionAllTime,
        to_pay: toPay,
        last_payout_date: lastPayoutDate,
        unlocked_achievements: unlockedAchievements, // the list for the modal
        created_at: affiliate.created_at
      };

    });

    const ordersGrowth = globalPrevOrdersMonth > 0 
      ? ((globalOrdersMonth - globalPrevOrdersMonth) / globalPrevOrdersMonth) * 100 
      : 0;

    return Response.json({
      data: {
        summary: {
          total_month: globalBaseCommissionMonth + globalAchievementsCommissionMonth,
          base_month: globalBaseCommissionMonth,
          achievements_month: globalAchievementsCommissionMonth,
          orders_month: globalOrdersMonth,
          orders_growth: ordersGrowth,
          active_affiliates: activeAffiliatesCount,
          total_affiliates: affiliates?.length || 0,
          pending_payouts: globalPendingPayouts,
          affiliates_with_pending_payouts: affiliateDetails.filter(a => a.to_pay > 0).length
        },
        affiliates: affiliateDetails.sort((a, b) => b.total_month - a.total_month)
      }
    });

  } catch (error) {
    console.error("Erro em admin/affiliates-dashboard:", error);
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
