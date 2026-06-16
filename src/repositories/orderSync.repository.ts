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

  /** Retorna um Set com os shopify_order_ids que já existem no banco. */
  async getExistingShopifyOrderIds(shopifyOrderIds: string[]): Promise<Set<string>> {
    if (shopifyOrderIds.length === 0) return new Set();

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("orders")
      .select("shopify_order_id")
      .in("shopify_order_id", shopifyOrderIds);

    if (error || !data) return new Set();
    return new Set(data.map((r: { shopify_order_id: string }) => r.shopify_order_id));
  }

  /** Insere ou atualiza customers em lote no banco (upsert por shopify_customer_id). */
  async upsertCustomers(customers: { shopify_customer_id: string; email: string | null; first_name: string | null; last_name: string | null }[]): Promise<{ rows: { id: string; shopify_customer_id: string }[]; error: string | null }> {
    if (customers.length === 0) return { rows: [], error: null };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shopify_customers")
      .upsert(customers, { onConflict: "shopify_customer_id" })
      .select("id, shopify_customer_id");

    if (error) {
      return { rows: [], error: error.message };
    }

    return { rows: (data ?? []) as { id: string; shopify_customer_id: string }[], error: null };
  }

  /**
   * Substitui os itens de cada pedido na tabela order_items.
   *
   * O fluxo é: DELETE os itens existentes dos orders afetados → INSERT os novos.
   * O erro do DELETE é verificado antes do INSERT para evitar acúmulo de
   * duplicatas a cada re-sync caso o delete falhe silenciosamente.
   */
  async upsertOrderItems(items: OrderItemInsert[]): Promise<{ count: number; error: string | null }> {
    if (items.length === 0) return { count: 0, error: null };

    const supabase = await createSupabaseServerClient();

    // Garante que apenas os order_ids únicos serão limpos.
    // Processa em lotes para evitar que URLs muito longas gerem "Bad Request"
    // no Supabase quando há centenas de IDs no .in().
    const BATCH_SIZE = 100;
    const orderIds = [...new Set(items.map((i) => i.order_id))];

    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const batch = orderIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .in("order_id", batch);

      if (deleteError) {
        console.error("[OrderSync] Falha ao deletar order_items antigos:", deleteError.message);
        return { count: 0, error: `delete_failed: ${deleteError.message}` };
      }
    }

    // Insere os novos itens também em lotes para evitar payloads gigantes
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from("order_items").insert(batch);

      if (insertError) {
        return { count: 0, error: insertError.message };
      }
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
    syncedByUserId?: string,
    updateLastSyncedAt: boolean = true
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const payload: Record<string, unknown> = {
      source: "shopify",
      synced_by_user_id: syncedByUserId ?? null,
      shopify_api_response_status: status,
    };

    if (updateLastSyncedAt) {
      payload.last_synced_at = new Date().toISOString();
    }

    await supabase.from("sync_state").upsert(
      payload,
      { onConflict: "source" }
    );
  }
}
