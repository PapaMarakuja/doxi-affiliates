import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Coupon, Orders, Affiliate } from "@/src/types";

export interface CouponStats {
  coupon: Coupon;
  affiliate: { name: string; commission_rate: number | null } | null;
  totalUses: number;
  totalRevenue: number;
  totalDiscount: number;
  totalCommission: number;
  monthlyUses: number;
  monthlyRevenue: number;
  monthlyDiscount: number;
  monthlyCommission: number;
}

export interface CouponsPageData {
  coupons: CouponStats[];
  totals: {
    totalUses: number;
    totalRevenue: number;
    totalDiscount: number;
    totalCommission: number;
    monthlyUses: number;
    monthlyRevenue: number;
    monthlyDiscount: number;
    monthlyCommission: number;
  };
}

/**
 * Calcula a comissão do afiliado com base nas orders.
 *
 * Base de cálculo: total_amount - total_discounts - shipping_cost
 * Comissão = base × (commission_rate / 100)
 */
function calcCommission(
  order: Pick<Orders, "total_amount" | "shipping_cost">,
  commissionRate: number | null
): number {
  if (!commissionRate || commissionRate <= 0) return 0;
  const base = order.total_amount - (order.shipping_cost ?? 0);
  if (base <= 0) return 0;
  return base * (commissionRate / 100);
}

/**
 * GET /api/coupons/stats
 *
 * Retorna todos os cupons com estatísticas calculadas da nossa base (tabela orders).
 * Inclui informações do afiliado vinculado e comissão gerada.
 * Não consulta a Shopify — apenas o banco de dados local.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const filterMonth = url.searchParams.get("month");
  const filterYear = url.searchParams.get("year");

  const { data: user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return Response.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Busca todos os cupons
    const { data: coupons, error: couponsError } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (couponsError) {
      return Response.json({ error: couponsError.message }, { status: 500 });
    }

    const typedCoupons = (coupons ?? []) as Coupon[];

    // Busca todos os afiliados para vincular ao cupom
    const affiliateIds = [
      ...new Set(typedCoupons.map((c) => c.affiliate_id).filter(Boolean)),
    ];

    let affiliateMap = new Map<string, Affiliate>();

    if (affiliateIds.length > 0) {
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("*")
        .in("id", affiliateIds);

      if (affiliates) {
        for (const aff of affiliates as Affiliate[]) {
          affiliateMap.set(aff.id, aff);
        }
      }
    }

    // Busca todas as orders pagas da nossa base
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("coupon_id, coupon_code, total_amount, total_discounts, shipping_cost, financial_status, created_at")
      .eq("financial_status", "paid");

    if (ordersError) {
      return Response.json({ error: ordersError.message }, { status: 500 });
    }

    const typedOrders = (orders ?? []) as Pick<
      Orders,
      "coupon_id" | "coupon_code" | "total_amount" | "total_discounts" | "shipping_cost" | "financial_status" | "created_at"
    >[];

    // Define o mês de referência
    const now = new Date();
    const year = filterYear ? parseInt(filterYear, 10) : now.getFullYear();
    const month = filterMonth ? parseInt(filterMonth, 10) - 1 : now.getMonth(); // Mês no JS é 0-indexed

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Agrupa orders por coupon_id, CAP at endOfMonth
    const couponIdMap = new Map<string, typeof typedOrders>();
    const couponCodeMap = new Map<string, typeof typedOrders>();

    for (const order of typedOrders) {
      const orderDate = new Date(order.created_at);
      if (orderDate > endOfMonth) continue; // Ignora ordens após o mês selecionado

      if (order.coupon_id) {
        const list = couponIdMap.get(order.coupon_id) ?? [];
        list.push(order);
        couponIdMap.set(order.coupon_id, list);
      }
      if (order.coupon_code) {
        const key = order.coupon_code.toUpperCase();
        const list = couponCodeMap.get(key) ?? [];
        list.push(order);
        couponCodeMap.set(key, list);
      }
    }

    let grandTotalUses = 0;
    let grandTotalRevenue = 0;
    let grandTotalDiscount = 0;
    let grandTotalCommission = 0;
    let grandMonthlyUses = 0;
    let grandMonthlyRevenue = 0;
    let grandMonthlyDiscount = 0;
    let grandMonthlyCommission = 0;

    const couponStats: CouponStats[] = typedCoupons.map((coupon) => {
      const matchedOrders =
        couponIdMap.get(coupon.id) ??
        couponCodeMap.get(coupon.code.toUpperCase()) ??
        [];

      // Affiliate info
      const affiliate = coupon.affiliate_id
        ? affiliateMap.get(coupon.affiliate_id) ?? null
        : null;
      const commissionRate = affiliate?.commission_rate ?? null;

      const totalUses = matchedOrders.length;
      const totalRevenue = matchedOrders.reduce((acc, o) => acc + (o.total_amount - (o.shipping_cost ?? 0)), 0);
      const totalDiscount = matchedOrders.reduce(
        (acc, o) => acc + (o.total_discounts ?? 0),
        0
      );
      const totalCommission = matchedOrders.reduce(
        (acc, o) => acc + calcCommission(o, commissionRate),
        0
      );

      const monthlyOrders = matchedOrders.filter(
        (o) => new Date(o.created_at) >= startOfMonth
      );
      const monthlyUses = monthlyOrders.length;
      const monthlyRevenue = monthlyOrders.reduce(
        (acc, o) => acc + (o.total_amount - (o.shipping_cost ?? 0)),
        0
      );
      const monthlyDiscount = monthlyOrders.reduce(
        (acc, o) => acc + (o.total_discounts ?? 0),
        0
      );
      const monthlyCommission = monthlyOrders.reduce(
        (acc, o) => acc + calcCommission(o, commissionRate),
        0
      );

      grandTotalUses += totalUses;
      grandTotalRevenue += totalRevenue;
      grandTotalDiscount += totalDiscount;
      grandTotalCommission += totalCommission;
      grandMonthlyUses += monthlyUses;
      grandMonthlyRevenue += monthlyRevenue;
      grandMonthlyDiscount += monthlyDiscount;
      grandMonthlyCommission += monthlyCommission;

      return {
        coupon,
        affiliate: affiliate
          ? { name: affiliate.name, commission_rate: affiliate.commission_rate }
          : null,
        totalUses,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalDiscount: parseFloat(totalDiscount.toFixed(2)),
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        monthlyUses,
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        monthlyDiscount: parseFloat(monthlyDiscount.toFixed(2)),
        monthlyCommission: parseFloat(monthlyCommission.toFixed(2)),
      };
    });

    const result: CouponsPageData = {
      coupons: couponStats,
      totals: {
        totalUses: grandTotalUses,
        totalRevenue: parseFloat(grandTotalRevenue.toFixed(2)),
        totalDiscount: parseFloat(grandTotalDiscount.toFixed(2)),
        totalCommission: parseFloat(grandTotalCommission.toFixed(2)),
        monthlyUses: grandMonthlyUses,
        monthlyRevenue: parseFloat(grandMonthlyRevenue.toFixed(2)),
        monthlyDiscount: parseFloat(grandMonthlyDiscount.toFixed(2)),
        monthlyCommission: parseFloat(grandMonthlyCommission.toFixed(2)),
      },
    };

    return Response.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
