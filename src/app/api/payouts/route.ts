import { getAuthenticatedAffiliate } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAffiliateDataStartDate } from "@/src/lib/utils";

export async function GET(request: Request) {
  const { data: affiliate, error: authError } = await getAuthenticatedAffiliate();

  if (authError || !affiliate) {
    return Response.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const affiliateDataStartDate = getAffiliateDataStartDate(affiliate.created_at);

    // Buscar os IDs dos cupons do afiliado
    const { data: coupons } = await supabase
      .from("coupons")
      .select("id")
      .eq("affiliate_id", affiliate.id);

    const couponIds = coupons?.map((c) => c.id) || [];

    let totalCommissions = 0;
    let pendingCommissions = 0;

    if (couponIds.length > 0) {
      let ordersQuery = supabase
        .from("orders")
        .select(`
          created_at,
          financial_status,
          total_amount,
          total_discounts,
          shipping_cost
        `)
        .in("coupon_id", couponIds);

      if (affiliateDataStartDate) {
        ordersQuery = ordersQuery.gte("created_at", affiliateDataStartDate);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      const rate = affiliate.commission_rate ?? 0;
      const now = new Date();

      (ordersData || []).forEach((o: any) => {
        const base = o.total_amount - (o.total_discounts ?? 0) - (o.shipping_cost ?? 0);
        let commission = 0;
        if (base > 0 && rate > 0) {
          commission = base * (rate / 100);
        }

        const orderDate = new Date(o.created_at);
        const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));
        const isPaid = o.financial_status === "paid";
        const isLiberated = isPaid && daysSinceOrder >= 7;

        if (isPaid) {
          totalCommissions += commission;
          if (!isLiberated) {
            pendingCommissions += commission;
          }
        }
      });
    }

    // Buscar histórico de pagamentos
    let payoutsQuery = supabase
      .from("payouts")
      .select("*")
      .eq("affiliate_id", affiliate.id);

    if (affiliateDataStartDate) {
      payoutsQuery = payoutsQuery.gte("created_at", affiliateDataStartDate);
    }

    const { data: payouts, error: payoutsError } = await payoutsQuery.order("created_at", { ascending: false });

    if (payoutsError) throw payoutsError;

    // Calcular o que já foi pago ou está em processamento
    const totalPaid = (payouts || []).filter(p => p.status === 'paid').reduce((acc, p) => acc + Number(p.amount), 0);
    const totalProcessing = (payouts || []).filter(p => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0);

    const liberatedCommissions = totalCommissions - pendingCommissions;
    const availableToWithdraw = Math.max(0, liberatedCommissions - totalPaid - totalProcessing);

    const lastPayout = (payouts || []).find(p => p.status === 'paid') || null;

    // Pegar chaves PIX
    // @ts-ignore - pix_key is not strongly typed yet in affiliate type
    const pixKey = affiliate.pix_key || "";

    return Response.json({
      data: {
        totalCommissions: parseFloat(totalCommissions.toFixed(2)),
        pendingCommissions: parseFloat(pendingCommissions.toFixed(2)),
        availableToWithdraw: parseFloat(availableToWithdraw.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        totalProcessing: parseFloat(totalProcessing.toFixed(2)),
        lastPayout,
        pixKey,
        payouts: payouts || []
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
