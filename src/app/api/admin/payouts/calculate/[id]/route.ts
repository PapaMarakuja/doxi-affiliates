import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { PayoutService } from "@/src/services/payout.service";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { id: affiliateId } = await params;
  if (!affiliateId) {
    return Response.json({ error: "ID do afiliado é obrigatório" }, { status: 400 });
  }

  try {
    const service = new PayoutService();
    const data = await service.calculateAffiliateOwed(affiliateId);
    return Response.json({ data });
  } catch (error: any) {
    console.error("GET /api/admin/payouts/calculate/[id] error:", error);
    return Response.json({ error: error.message || "Erro interno do servidor" }, { status: 500 });
  }
}
