import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { OrderSyncService } from "@/src/services/orderSync.service";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Profile } from "@/src/types";

/**
 * POST /api/sync
 *
 * Sincroniza orders da Shopify e retorna os dados completos do dashboard.
 *
 * - Admin  → busca TODAS as vendas da loja, retorna dados globais
 * - Affiliate → sincroniza apenas seus cupons, retorna dados filtrados
 */
export async function POST() {
  const { data: user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return Response.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    const typedProfile = profile as Profile;
    const role = typedProfile.role;

    let affiliateId: string | undefined;

    if (role === "affiliate") {
      const { data: affiliate, error: affError } = await supabase
        .from("affiliates")
        .select("id")
        .eq("profile_id", typedProfile.id)
        .single();

      if (affError || !affiliate) {
        return Response.json({ error: "Affiliate not found" }, { status: 404 });
      }

      affiliateId = affiliate.id;
    }

    const syncService = new OrderSyncService();
    const dashboardData = await syncService.syncAndGetDashboardData(
      role,
      user.id,
      affiliateId
    );

    return Response.json({ data: dashboardData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/sync
 *
 * Retorna os dados do dashboard SEM sincronizar (carregamento inicial).
 */
export async function GET() {
  const { data: user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return Response.json({ error: authError ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    const typedProfile = profile as Profile;
    const role = typedProfile.role;

    let affiliateId: string | undefined;

    if (role === "affiliate") {
      const { data: affiliate, error: affError } = await supabase
        .from("affiliates")
        .select("id")
        .eq("profile_id", typedProfile.id)
        .single();

      if (affError || !affiliate) {
        return Response.json({ error: "Affiliate not found" }, { status: 404 });
      }

      affiliateId = affiliate.id;
    }

    const syncService = new OrderSyncService();
    const dashboardData = await syncService.getDashboardData(role, affiliateId);

    return Response.json({ data: dashboardData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
