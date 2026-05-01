import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { AffiliateRepository } from "@/src/repositories/affiliate.repository";
import { AuthService } from "@/src/services/auth.service";
import { NextRequest } from "next/server";

/**
 * GET /api/profiles?unlinked=true
 * Lists profiles. If `unlinked=true`, returns only profiles not linked to any affiliate.
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
    const profiles = await repo.getUnlinkedProfiles();
    return Response.json({ data: profiles });
  }

  // Fallback: return unlinked as default behavior for this context
  const profiles = await repo.getUnlinkedProfiles();
  return Response.json({ data: profiles });
}

/**
 * POST /api/profiles
 * Creates a new user + profile.
 * Body: { name, email, password, pix_key?, contact_phone?, contact_email? }
 * Role is always "affiliate".
 */
export async function POST(request: NextRequest) {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();

  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const body = await request.json();

    if (!body.name || !body.email || !body.password) {
      return Response.json(
        { error: "Os campos nome, email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const authService = new AuthService();
    const result = await authService.createUser({
      email: body.email,
      password: body.password,
      name: body.name,
      role: "affiliate",
      pix_key: body.pix_key ?? null,
      contact_phone: body.contact_phone ?? null,
      contact_email: body.contact_email ?? null,
    });

    if (result.error || !result.data) {
      return Response.json(
        { error: result.error ?? "Falha ao criar perfil." },
        { status: 422 }
      );
    }

    return Response.json({ data: result.data.profile }, { status: 201 });
  } catch (error) {
    console.error("Error creating profile:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

