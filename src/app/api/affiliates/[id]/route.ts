import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AffiliateService } from "@/src/services/affiliate.service";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { id } = await params;
  const service = new AffiliateService();

  const affiliate = await service.getAffiliateById(id);

  if (!affiliate) {
    return Response.json({ error: "Affiliate not found" }, { status: 404 });
  }

  const coupons = await service.getAffiliateCoupons(id);

  let profile = null;
  if (affiliate.profile_id) {
    const { AffiliateRepository } = await import("@/src/repositories/affiliate.repository");
    const repo = new AffiliateRepository();
    profile = await repo.getProfileById(affiliate.profile_id);
  }

  return Response.json({ data: { affiliate, coupons, profile } });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const service = new AffiliateService();

    // Allow updating only specific fields
    const updates = {
      name: body.name,
      profile_id: body.profile_id !== undefined ? body.profile_id : undefined,
      commission_rate: body.commission_rate !== undefined ? body.commission_rate : undefined,
    };

    // Clean up undefined updates
    Object.keys(updates).forEach(key => updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]);

    const updated = await service.updateAffiliate(id, updates);

    if (!updated) {
      return Response.json({ error: "Failed to update affiliate" }, { status: 400 });
    }

    return Response.json({ data: updated });
  } catch (error) {
    console.error("Error updating affiliate:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { id } = await params;
  const service = new AffiliateService();

  try {
    const deleted = await service.deleteAffiliate(id);

    if (!deleted) {
      return Response.json({ error: "Failed to delete affiliate" }, { status: 400 });
    }

    return Response.json({ message: "Affiliate deleted successfully" });
  } catch (error) {
    console.error("Error deleting affiliate:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
