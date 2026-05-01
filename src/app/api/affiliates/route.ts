import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AffiliateService } from "@/src/services/affiliate.service";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const searchName = searchParams.get("name") || undefined;
  const orderBy = searchParams.get("orderBy") || "created_at";
  const orderDesc = searchParams.get("orderDesc") !== "false";

  const service = new AffiliateService();
  const { data, count } = await service.getPaginatedAffiliates(
    page,
    limit,
    searchName,
    orderBy,
    orderDesc
  );

  return Response.json({ data, count });
}

export async function POST(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();
    const service = new AffiliateService();
    const created = await service.createAffiliate({
      name: body.name,
      profile_id: body.profile_id || null,
      commission_rate: body.commission_rate ?? null,
    });

    if (!created) {
      return Response.json({ error: "Failed to create affiliate" }, { status: 400 });
    }

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating affiliate:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
