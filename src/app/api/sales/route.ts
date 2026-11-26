import { getAuthenticatedAffiliate } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { calculateOrderCommission, getAffiliateDataStartDate, getOrderItemName } from "@/src/lib/utils";
import type { OrderWithItems } from "@/src/types/orders";

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
        external_order_id,
        created_at,
        financial_status,
        total_amount,
        total_discounts,
        shipping_cost,
        cancelled_at,
        order_items (
          product_name,
          variant_label,
          products ( name ),
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

    // Without generated DB types, supabase-js types the many-to-one `products` embed as an array (it is an object at runtime).
    const sales = ((ordersData || []) as unknown as OrderWithItems[]).map((o) => {
      const commission = calculateOrderCommission(o, rate);

      // Determine if it's paid or pending (warranty period)
      // Generic logic: if paid and older than 7 days, it's liberated.
      // Otherwise it's pending.
      const orderDate = new Date(o.created_at);
      const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));

      const isPaid = o.financial_status === "paid";
      const isLiberated = isPaid && daysSinceOrder >= 7;
      // Sync maps "cancelled before payment" to unpaid; show it as cancelled with no earnings instead of "Aguardando Pagamento".
      const isCancelledUnpaid = !!o.cancelled_at && o.financial_status === "unpaid";

      if (isPaid) {
        totalConversions += 1;
        totalCommissions += commission;
        if (!isLiberated) {
          pendingCommissions += commission;
        }
      }

      return {
        id: o.external_order_id || o.id,
        created_at: o.created_at,
        commission: isCancelledUnpaid || o.financial_status === "refunded" ? 0 : parseFloat(commission.toFixed(2)),
        status: isCancelledUnpaid ? "voided" : o.financial_status,
        isLiberated,
        items: (o.order_items || []).map((item) => ({
          product_name: getOrderItemName(item),
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
