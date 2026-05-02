import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { AffiliateService } from "@/src/services/affiliate.service";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const affiliateService = new AffiliateService();
    const affiliate = await affiliateService.getAffiliateByUserId(user.id);

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    const coupons = await affiliateService.getAffiliateCoupons(affiliate.id);

    return NextResponse.json({
      data: {
        affiliate,
        coupons,
      },
    });
  } catch (error) {
    console.error("Error fetching affiliate benefits:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
