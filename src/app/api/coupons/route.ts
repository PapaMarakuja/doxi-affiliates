import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AffiliateRepository } from "@/src/repositories/affiliate.repository";
import { NextRequest } from "next/server";

/**
 * GET /api/coupons?unlinked=true
 * Lists coupons. If `unlinked=true`, returns only coupons that have no affiliate_id.
 */
export async function GET(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(request.url);
  const unlinked = searchParams.get("unlinked") === "true";

  const repo = new AffiliateRepository();

  if (unlinked) {
    const coupons = await repo.getUnlinkedCoupons();
    return Response.json({ data: coupons });
  }

  const coupons = await repo.getAllCoupons();
  return Response.json({ data: coupons });
}

/**
 * POST /api/coupons
 * Creates or updates a coupon. Body: { id?, code, discount_percentage, active, affiliate_id? }
 */
export async function POST(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();

    if (!body.code || typeof body.code !== "string" || !body.code.trim()) {
      return Response.json({ error: "O campo 'code' é obrigatório." }, { status: 400 });
    }

    const repo = new AffiliateRepository();
    const cleanCode = body.code.trim().toUpperCase();

    if (body.id) {
      const updates: any = {
        code: cleanCode,
        discount_percentage: body.discount_percentage !== undefined ? body.discount_percentage : undefined,
        active: body.active !== undefined ? body.active : undefined,
        affiliate_id: body.affiliate_id !== undefined ? body.affiliate_id : undefined,
      };

      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      const updated = await repo.updateCoupon(body.id, updates);

      if (!updated) {
        return Response.json({ error: "Falha ao atualizar o cupom." }, { status: 500 });
      }

      return Response.json({ data: updated });
    }

    const existing = await repo.getCouponByCode(cleanCode);
    if (existing) {
      return Response.json({ error: "Já existe um cupom com esse código." }, { status: 409 });
    }

    const coupon = await repo.createCoupon({
      code: cleanCode,
      discount_percentage: body.discount_percentage ?? null,
      active: body.active ?? true,
      affiliate_id: body.affiliate_id ?? null,
    });

    if (!coupon) {
      return Response.json({ error: "Falha ao criar o cupom." }, { status: 500 });
    }

    return Response.json({ data: coupon }, { status: 201 });
  } catch (error) {
    console.error("Error creating/updating coupon:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT /api/coupons
 * Explicit update for a coupon.
 */
export async function PUT(request: NextRequest) {
  return POST(request); // Reuse POST logic since it handles ID
}

/**
 * DELETE /api/coupons
 * Removes a coupon by id. Body: { id }
 */
export async function DELETE(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();
    if (!body?.id || typeof body.id !== "string") {
      return Response.json({ error: "O campo 'id' é obrigatório." }, { status: 400 });
    }

    const repo = new AffiliateRepository();
    const deleted = await repo.deleteCoupon(body.id);

    if (!deleted) {
      return Response.json({ error: "Falha ao excluir o cupom." }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
