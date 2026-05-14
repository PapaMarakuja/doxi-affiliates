import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { PayoutRepository } from "@/src/repositories/payout.repository";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !["pending", "paid", "cancelled"].includes(status)) {
      return Response.json({ error: "Status inválido" }, { status: 400 });
    }

    const repo = new PayoutRepository();
    const updatedPayout = await repo.updatePayoutStatus(id, status);

    if (!updatedPayout) {
      return Response.json({ error: "Erro ao atualizar pagamento" }, { status: 500 });
    }

    return Response.json({ data: updatedPayout });
  } catch (error) {
    console.error(`PATCH /api/admin/payouts/${id} error:`, error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const repo = new PayoutRepository();
    const success = await repo.deletePayout(id);

    if (!success) {
      return Response.json({ error: "Erro ao excluir pagamento" }, { status: 500 });
    }

    return Response.json({ data: { success: true } });
  } catch (error) {
    console.error(`DELETE /api/admin/payouts/${id} error:`, error);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
