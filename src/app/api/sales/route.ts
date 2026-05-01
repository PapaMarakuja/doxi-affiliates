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

    if (couponIds.length === 0) {
      return Response.json({
        data: {
          sales: [],
          stats: {
            totalCommissions: 0,
            pendingCommissions: 0,
            totalConversions: 0,
          },
        },
      });
    }

    // Buscar as orders e os order_items aninhados
    let ordersQuery = supabase
      .from("orders")
      .select(`
        id,
        shopify_order_id,
        created_at,
        financial_status,
        total_amount,
        total_discounts,
        shipping_cost,
        order_items (
          product_name,
          quantity
        )
      `)
      .in("coupon_id", couponIds);

    if (affiliateDataStartDate) {
      ordersQuery = ordersQuery.gte("created_at", affiliateDataStartDate);
    }

    const { data: ordersData, error: ordersError } = await ordersQuery.order("created_at", { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const rate = affiliate.commission_rate ?? 0;
    const now = new Date();

    let totalCommissions = 0;
    let pendingCommissions = 0;
    let totalConversions = 0;

    const sales = (ordersData || []).map((o: any) => {
      // Calculate commission
      const base = o.total_amount - (o.total_discounts ?? 0) - (o.shipping_cost ?? 0);
      let commission = 0;
      if (base > 0 && rate > 0) {
        commission = base * (rate / 100);
      }

      // Determine if it's paid or pending (warranty period)
      // Generic logic: if paid and older than 7 days, it's liberated.
      // Otherwise it's pending.
      const orderDate = new Date(o.created_at);
      const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));

      const isPaid = o.financial_status === "paid";
      const isLiberated = isPaid && daysSinceOrder >= 7;

      if (isPaid) {
        totalConversions += 1;
        totalCommissions += commission;
        if (!isLiberated) {
          pendingCommissions += commission;
        }
      }

      return {
        id: o.shopify_order_id,
        created_at: o.created_at,
        commission: parseFloat(commission.toFixed(2)),
        status: o.financial_status,
        isLiberated,
        items: o.order_items.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
        })),
      };
    });

    return Response.json({
      data: {
        sales,
        stats: {
          totalCommissions: parseFloat(totalCommissions.toFixed(2)),
          pendingCommissions: parseFloat(pendingCommissions.toFixed(2)),
          totalConversions,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
