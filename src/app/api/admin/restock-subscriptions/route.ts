import { getAuthenticatedAdmin } from "@/src/lib/auth/session";
import { getErrorMessage } from "@/src/lib/utils";
import {
  RestockSubscriptionRepository,
  groupRestockSubscriptions,
} from "@/src/repositories/restockSubscription.repository";

export async function GET() {
  const { data: admin, error: adminError } = await getAuthenticatedAdmin();
  if (adminError || !admin) {
    const status = adminError === "Forbidden: admin access required" ? 403 : 401;
    return Response.json({ error: adminError ?? "Unauthorized" }, { status });
  }

  try {
    const repo = new RestockSubscriptionRepository();
    const rows = await repo.listAll();
    // Names/links are a bonus: the list still works if the catalog lookup fails.
    const catalog = await repo.listProducts(rows.map((r) => r.product_id)).catch((err) => {
      console.error("GET /api/admin/restock-subscriptions catalog error:", err);
      return [];
    });
    return Response.json({ data: groupRestockSubscriptions(rows, catalog) });
  } catch (err) {
    console.error("GET /api/admin/restock-subscriptions error:", err);
    return Response.json({ error: getErrorMessage(err, "Erro ao carregar notificações") }, { status: 500 });
  }
}
