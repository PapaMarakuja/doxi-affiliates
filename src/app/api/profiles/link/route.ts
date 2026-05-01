import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AffiliateRepository } from "@/src/repositories/affiliate.repository";
import { NextRequest } from "next/server";

/**
 * POST /api/profiles/link
 * Links/unlinks a profile to/from an affiliate.
 * Body: { affiliate_id, profile_id } — profile_id can be null to unlink
 */
export async function POST(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();

    if (!body.affiliate_id) {
      return Response.json(
        { error: "O campo 'affiliate_id' é obrigatório." },
        { status: 400 }
      );
    }

    const repo = new AffiliateRepository();

    if (body.profile_id === null || body.profile_id === undefined) {
      // Unlink
      const affiliate = await repo.unlinkProfileFromAffiliate(body.affiliate_id);
      if (!affiliate) {
        return Response.json({ error: "Falha ao desvincular perfil." }, { status: 500 });
      }
      return Response.json({ data: affiliate });
    }

    // Link
    const affiliate = await repo.linkProfileToAffiliate(body.affiliate_id, body.profile_id);
    if (!affiliate) {
      return Response.json({ error: "Falha ao vincular perfil." }, { status: 500 });
    }

    return Response.json({ data: affiliate });
  } catch (error) {
    console.error("Error linking profile:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
