import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { PayoutRepository } from "@/src/repositories/payout.repository";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || undefined;
  const affiliateId = searchParams.get("affiliateId") || undefined;

  const repo = new PayoutRepository();
  const payouts = await repo.getPayouts({ 
    status: statusFilter, 
    affiliateId 
  });

  return Response.json({ data: payouts });
}

export async function POST(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();
    const { affiliate_id, amount, pix_key, status } = body;

    if (!affiliate_id || amount === undefined || !pix_key) {
      return Response.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const repo = new PayoutRepository();
    const payout = await repo.createPayout({
      affiliate_id,
      amount: Number(amount),
      pix_key,
      status: status || "pending",
      paid_at: status === "paid" ? new Date().toISOString() : null
    });

    if (!payout) {
      return Response.json({ error: "Erro ao criar pagamento no banco" }, { status: 500 });
    }

    return Response.json({ data: payout }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/payouts error:", error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
