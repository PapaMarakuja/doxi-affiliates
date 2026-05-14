import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { PayoutService } from "@/src/services/payout.service";
import { PayoutRepository } from "@/src/repositories/payout.repository";

const payoutService = new PayoutService();
const payoutRepository = new PayoutRepository();

export async function GET() {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: affiliates, error } = await supabase
      .from("affiliates")
      .select("id, name")
      .order("name");

    if (error) throw error;

    // Calculate owed for all affiliates in parallel (batched to avoid overload)
    const results = await Promise.all(
      (affiliates || []).map(async (a) => {
        try {
          const data = await payoutService.calculateAffiliateOwed(a.id);
          return { ...data, error: null };
        } catch (err: any) {
          return {
            affiliateId: a.id,
            name: a.name,
            pixKey: null,
            baseCommission: 0,
            achievementsCommission: 0,
            totalEarned: 0,
            alreadyPaid: 0,
            owed: 0,
            orderCount: 0,
            lastPayoutDate: null,
            error: err.message || "Erro ao calcular",
          };
        }
      })
    );

    // Sort: affiliates with owed > 0 first (desc by owed), then zeroes
    results.sort((a, b) => b.owed - a.owed);

    return Response.json({ data: results });
  } catch (err: any) {
    console.error("GET /api/admin/payouts/batch-calculate error:", err);
    return Response.json({ error: err.message || "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();
    const { affiliateId, amount, pixKey } = body as { affiliateId: string; amount: number; pixKey: string };

    if (!affiliateId || !amount || amount <= 0) {
      return Response.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const payout = await payoutRepository.createPayout({
      affiliate_id: affiliateId,
      amount,
      pix_key: pixKey || "Não cadastrada",
      status: "pending",
      paid_at: null,
    });

    if (!payout) {
      return Response.json({ error: "Falha ao criar pagamento" }, { status: 500 });
    }

    return Response.json({ data: payout }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/payouts/batch-calculate error:", err);
    return Response.json({ error: err.message || "Erro interno do servidor" }, { status: 500 });
  }
}
