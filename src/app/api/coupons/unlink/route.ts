import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AffiliateRepository } from "@/src/repositories/affiliate.repository";
import { NextRequest } from "next/server";

/**
 * POST /api/coupons/unlink
 * Unlinks a coupon from its current affiliate.
 * Body: { coupon_id }
 */
export async function POST(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();

    if (!body.coupon_id) {
      return Response.json(
        { error: "O campo 'coupon_id' é obrigatório." },
        { status: 400 }
      );
    }

    const repo = new AffiliateRepository();
    const coupon = await repo.unlinkCouponFromAffiliate(body.coupon_id);

    if (!coupon) {
      return Response.json({ error: "Falha ao desvincular cupom." }, { status: 500 });
    }

    return Response.json({ data: coupon });
  } catch (error) {
    console.error("Error unlinking coupon:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
