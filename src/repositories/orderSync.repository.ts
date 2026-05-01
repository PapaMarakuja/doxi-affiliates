import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Orders, SyncState, Coupon, Affiliate } from "@/src/types";

/** Shape de um item a ser gravado na tabela order_items. */
export interface OrderItemInsert {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

/**
 * Repository responsável pelas operações de banco para o sync de orders da Shopify
 * e dados do dashboard.
 */
export class OrderSyncRepository {
  private readonly affiliateFields = "id, commission_rate, created_at";

  // ──────────────────────────────────────────────
  // Orders
  // ──────────────────────────────────────────────

  /** Insere ou atualiza orders em lote no banco (upsert por shopify_order_id). */
  async upsertOrders(orders: Omit<Orders, "id" | "synced_at">[]): Promise<{ rows: { id: string; shopify_order_id: string }[]; error: string | null }> {
    if (orders.length === 0) return { rows: [], error: null };

    const supabase = await createSupabaseServerClient();

    const payload = orders.map((o) => ({
      ...o,
      synced_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("orders")
      .upsert(payload, { onConflict: "shopify_order_id" })
      .select("id, shopify_order_id");

    if (error) {
      return { rows: [], error: error.message };
    }

    return { rows: (data ?? []) as { id: string; shopify_order_id: string }[], error: null };
  }

  /**
   * Insere os itens de cada pedido na tabela order_items.
   * Deleta os itens existentes do order antes de reinserir para garantir
   * consistência em full syncs (upsert não é trivial sem shopify_line_item_id).
   */
  async upsertOrderItems(items: OrderItemInsert[]): Promise<{ count: number; error: string | null }> {
    if (items.length === 0) return { count: 0, error: null };

    const supabase = await createSupabaseServerClient();

    // Apaga itens existentes para os orders afetados (mantém consistência em re-syncs)
    const orderIds = [...new Set(items.map((i) => i.order_id))];
    await supabase.from("order_items").delete().in("order_id", orderIds);

    const { error } = await supabase.from("order_items").insert(items);

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: items.length, error: null };
  }

  /** Retorna todas as orders do banco. */
  async getAllOrders(): Promise<Orders[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data as Orders[]) ?? [];
  }

  /**
   * Retorna orders cujo coupon_id pertença a algum cupom do affiliate.
   * Faz um join lógico: busca coupon_ids do affiliate → filtra orders.
   */
  async getOrdersByCouponAffiliateId(
    affiliateId: string,
    fromCreatedAt?: string
  ): Promise<Orders[]> {
    const supabase = await createSupabaseServerClient();

    // Buscar os IDs dos cupons do afiliado
    const { data: coupons, error: couponsError } = await supabase
      .from("coupons")
      .select("id")
      .eq("affiliate_id", affiliateId);

    if (couponsError || !coupons || coupons.length === 0) return [];

    const couponIds = coupons.map((c: { id: string }) => c.id);

    let query = supabase
      .from("orders")
      .select("*")
      .in("coupon_id", couponIds);

    if (fromCreatedAt) {
      query = query.gte("created_at", fromCreatedAt);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return [];
    return (data as Orders[]) ?? [];
  }

  // ──────────────────────────────────────────────
  // Coupons
  // ──────────────────────────────────────────────

  /** Busca todos os cupons (ativos ou não). */
  async getAllCoupons(): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*");

    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  /** Busca cupons de um afiliado específico. */
  async getCouponsByAffiliateId(affiliateId: string): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("affiliate_id", affiliateId);

    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  // ──────────────────────────────────────────────
  // Affiliates
  // ──────────────────────────────────────────────

  /** Busca todos os afiliados. */
  async getAllAffiliates(): Promise<Pick<Affiliate, "id" | "commission_rate" | "created_at">[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .select(this.affiliateFields);

    if (error) return [];
    return (data ?? []) as Pick<Affiliate, "id" | "commission_rate" | "created_at">[];
  }

  /** Busca um único afiliado. */
  async getAffiliateById(affiliateId: string): Promise<Pick<Affiliate, "id" | "commission_rate" | "created_at">[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .select(this.affiliateFields)
      .eq("id", affiliateId);

    if (error) return [];
    return (data ?? []) as Pick<Affiliate, "id" | "commission_rate" | "created_at">[];
  }

  // ──────────────────────────────────────────────
  // Sync State
  // ──────────────────────────────────────────────

  /** Retorna o estado atual de sincronização para a fonte "shopify". */
  async getSyncState(): Promise<SyncState | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("sync_state")
      .select("*")
      .eq("source", "shopify")
      .single();

    if (error || !data) return null;
    return data as SyncState;
  }

  /** Atualiza (ou cria) o registro de sync_state após uma sincronização. */
  async updateSyncState(
    status: string,
    syncedByUserId?: string
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();

    await supabase.from("sync_state").upsert(
      {
        source: "shopify",
        last_synced_at: new Date().toISOString(),
        synced_by_user_id: syncedByUserId ?? null,
        shopify_api_response_status: status,
      },
      { onConflict: "source" }
    );
  }
}
