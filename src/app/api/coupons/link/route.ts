import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AffiliateRepository } from "@/src/repositories/affiliate.repository";
import { NextRequest } from "next/server";

/**
 * POST /api/coupons/link
 * Links an existing coupon to an affiliate.
 * Body: { coupon_id, affiliate_id }
 */
export async function POST(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();

    if (!body.coupon_id || !body.affiliate_id) {
      return Response.json(
        { error: "Os campos 'coupon_id' e 'affiliate_id' são obrigatórios." },
        { status: 400 }
      );
    }

    const repo = new AffiliateRepository();
    const coupon = await repo.linkCouponToAffiliate(body.coupon_id, body.affiliate_id);

    if (!coupon) {
      return Response.json({ error: "Falha ao vincular cupom." }, { status: 500 });
    }

    return Response.json({ data: coupon });
  } catch (error) {
    console.error("Error linking coupon:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
