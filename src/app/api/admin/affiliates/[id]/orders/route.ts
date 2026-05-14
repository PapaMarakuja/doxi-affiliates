import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAffiliateDataStartDate, calculateOrderCommission } from "@/src/lib/utils";

import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { id: affiliateId } = await params;

  try {
    const supabase = await createSupabaseServerClient();

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("commission_rate, created_at")
      .eq("id", affiliateId)
      .single();

    if (!affiliate) {
      return Response.json({ error: "Afiliado não encontrado" }, { status: 404 });
    }

    const rate = affiliate.commission_rate ?? 0;
    const startDate = getAffiliateDataStartDate(affiliate.created_at) || new Date(0).toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        shopify_order_id,
        created_at,
        financial_status,
        total_amount,
        total_discounts,
        shipping_cost,
        coupon_code,
        order_items (
          product_name,
          quantity,
          unit_price
        )
      `)
      .eq("affiliate_id", affiliateId)
      .eq("financial_status", "paid")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const result = (orders || []).map((o: any) => {
      // Uses the centralized util function — BCC = total_amount - shipping_cost - total_discounts
      const commission = calculateOrderCommission(o, rate);
      const bcc = o.total_amount - (o.shipping_cost || 0) - (o.total_discounts || 0);

      const items = o.order_items || [];

      // Sum of all item prices that have unit_price — used as distribution base
      // so that item commissions always sum to the order commission
      const itemsPriceSum = items.reduce((acc: number, item: any) =>
        item.unit_price != null ? acc + item.unit_price * item.quantity : acc, 0
      );

      return {
        id: o.id,
        shopify_order_id: o.shopify_order_id,
        created_at: o.created_at,
        financial_status: o.financial_status,
        total_amount: o.total_amount,
        total_discounts: o.total_discounts,
        shipping_cost: o.shipping_cost,
        coupon_code: o.coupon_code,
        bcc,
        commission: parseFloat(commission.toFixed(2)),
        items: items.map((item: any) => {
          // Distribute the order commission proportionally by item price share
          // item_commission = (item_total / items_price_sum) * order_commission
          let itemCommission: number | null = null;
          if (item.unit_price != null && itemsPriceSum > 0 && commission > 0) {
            const itemTotal = item.unit_price * item.quantity;
            itemCommission = parseFloat(((itemTotal / itemsPriceSum) * commission).toFixed(2));
          }
          return {
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price ?? null,
            item_commission: itemCommission,
          };
        }),
      };
    });

    return Response.json({
      data: {
        orders: result,
        commission_rate: rate,
        period_start: startDate,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/affiliates/[id]/orders error:", err);
    return Response.json({ error: err.message || "Erro interno do servidor" }, { status: 500 });
  }
}
