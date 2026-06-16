import { getAuthenticatedUser } from "@/src/lib/auth/session";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Profile } from "@/src/types";

/**
 * POST /api/admin/cleanup/order-items
 *
 * Remove duplicatas da tabela order_items.
 *
 * Para cada (order_id, product_name, quantity, unit_price), mantém apenas
 * o registro com o menor id (o mais antigo) e deleta os demais.
 *
 * ⚠️ Apenas admin pode executar.
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

    if ((profile as Profile).role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Buscar todos os order_items
    const { data: allItems, error: fetchError } = await supabase
      .from("order_items")
      .select("id, order_id, product_name, quantity, unit_price")
      .order("id", { ascending: true });

    if (fetchError || !allItems) {
      return Response.json({ error: fetchError?.message ?? "Failed to fetch items" }, { status: 500 });
    }

    // 2. Detectar duplicatas: para cada (order_id + product_name + quantity + unit_price),
    //    manter o primeiro id (menor) e coletar os demais para deleção.
    const seen = new Map<string, string>(); // chave → id a manter
    const toDelete: string[] = [];

    for (const item of allItems) {
      const key = `${item.order_id}__${item.product_name}__${item.quantity}__${item.unit_price}`;

      if (seen.has(key)) {
        // Duplicata — marcar para deletar
        toDelete.push(item.id);
      } else {
        seen.set(key, item.id);
      }
    }

    if (toDelete.length === 0) {
      return Response.json({ data: { deleted: 0, message: "Nenhuma duplicata encontrada." } });
    }

    // 3. Deletar as duplicatas em lotes de 500 para não estourar limite de query
    const BATCH_SIZE = 500;
    let totalDeleted = 0;

    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .in("id", batch);

      if (deleteError) {
        console.error("[Cleanup] Erro ao deletar duplicatas:", deleteError.message);
        return Response.json(
          { error: `Falha ao deletar lote ${i / BATCH_SIZE + 1}: ${deleteError.message}`, data: { deleted: totalDeleted } },
          { status: 500 }
        );
      }

      totalDeleted += batch.length;
    }

    console.log(`[Cleanup] order_items: ${totalDeleted} duplicata(s) removida(s).`);

    return Response.json({
      data: {
        deleted: totalDeleted,
        message: `${totalDeleted} item(ns) duplicado(s) removido(s) com sucesso.`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
