import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { OrderSyncService } from "@/src/services/orderSync.service";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Profile } from "@/src/types";

/**
 * POST /api/sync/full
 *
 * Sync completo — busca TODAS as orders da Shopify desde o início,
 * ignorando o sinceDate do sync_state.
 *
 * ⚠️ Apenas admin pode executar. Use uma vez para popular o banco.
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

    if (typedProfile.role !== "admin") {
      return Response.json(
        { error: "Forbidden: sem permissão para executar sync completo" },
        { status: 403 }
      );
    }

    const syncService = new OrderSyncService();
    const dashboardData = await syncService.fullSyncAndGetDashboardData(user.id);

    return Response.json({ data: dashboardData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
