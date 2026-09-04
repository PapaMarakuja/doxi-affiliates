import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Orders, SyncState, Coupon, Affiliate, OrderSource } from "@/src/types";

export interface OrderItemInsert {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface CustomerUpsert {
  external_customer_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  source: OrderSource;
}

export class OrderSyncRepository {
  private readonly affiliateFields = "id, commission_rate, created_at";

  async upsertOrders(
    orders: Omit<Orders, "id" | "synced_at">[],
    source: OrderSource
  ): Promise<{ rows: { id: string; external_order_id: string }[]; error: string | null }> {
    if (orders.length === 0) return { rows: [], error: null };
    const supabase = await createSupabaseServerClient();
    const payload = orders.map((o) => ({ ...o, source, synced_at: new Date().toISOString() }));
    const { data, error } = await supabase
      .from("orders")
      .upsert(payload, { onConflict: "external_order_id,source" })
      .select("id, external_order_id");
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []) as { id: string; external_order_id: string }[], error: null };
  }

  async getExistingExternalOrderIds(externalOrderIds: string[], source: OrderSource): Promise<Set<string>> {
    if (externalOrderIds.length === 0) return new Set();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("orders")
      .select("external_order_id")
      .eq("source", source)
      .in("external_order_id", externalOrderIds);
    if (error || !data) return new Set();
    return new Set(data.map((r: { external_order_id: string }) => r.external_order_id));
  }

  async upsertCustomers(
    customers: CustomerUpsert[],
    source: OrderSource
  ): Promise<{ rows: { id: string; external_customer_id: string }[]; error: string | null }> {
    if (customers.length === 0) return { rows: [], error: null };
    const supabase = await createSupabaseServerClient();
    const payload = customers.map((c) => ({ ...c, source }));
    const { data, error } = await supabase
      .from("customers")
      .upsert(payload, { onConflict: "external_customer_id,source" })
      .select("id, external_customer_id");
    if (error) return { rows: [], error: error.message };
    return { rows: (data ?? []) as { id: string; external_customer_id: string }[], error: null };
  }

  async upsertOrderItems(items: OrderItemInsert[]): Promise<{ count: number; error: string | null }> {
    if (items.length === 0) return { count: 0, error: null };
    const supabase = await createSupabaseServerClient();
    const BATCH_SIZE = 100;
    const orderIds = [...new Set(items.map((i) => i.order_id))];

    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const batch = orderIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase.from("order_items").delete().in("order_id", batch);
      if (deleteError) {
        console.error("[OrderSync] Falha ao deletar order_items antigos:", deleteError.message);
        return { count: 0, error: `delete_failed: ${deleteError.message}` };
      }
    }

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from("order_items").insert(batch);
      if (insertError) return { count: 0, error: insertError.message };
    }

    return { count: items.length, error: null };
  }

  async getAllOrders(): Promise<Orders[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) return [];
    return (data as Orders[]) ?? [];
  }

  async getOrdersByCouponAffiliateId(affiliateId: string, fromCreatedAt?: string): Promise<Orders[]> {
    const supabase = await createSupabaseServerClient();
    const { data: coupons, error: couponsError } = await supabase.from("coupons").select("id").eq("affiliate_id", affiliateId);
    if (couponsError || !coupons || coupons.length === 0) return [];
    const couponIds = coupons.map((c: { id: string }) => c.id);
    let query = supabase.from("orders").select("*").in("coupon_id", couponIds);
    if (fromCreatedAt) query = query.gte("created_at", fromCreatedAt);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return [];
    return (data as Orders[]) ?? [];
  }

  async getAllCoupons(): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("coupons").select("*");
    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  async insertMissingCoupons(codes: string[]): Promise<Coupon[]> {
    if (codes.length === 0) return [];
    const supabase = await createSupabaseServerClient();

    const normalizedCodes = [...new Set(codes.map((c) => c.trim().toUpperCase()))].filter(Boolean);
    if (normalizedCodes.length === 0) return [];

    const { data: existing } = await supabase
      .from("coupons")
      .select("*")
      .in("code", normalizedCodes);

    const existingCodeSet = new Set(
      ((existing as Coupon[]) ?? []).map((c) => c.code.toUpperCase())
    );

    const toInsert = normalizedCodes
      .filter((code) => !existingCodeSet.has(code))
      .map((code) => ({
        code,
        affiliate_id: null,
        discount_percentage: null,
        active: true,
      }));

    if (toInsert.length === 0) {
      return (existing as Coupon[]) ?? [];
    }

    const { data: inserted, error } = await supabase
      .from("coupons")
      .insert(toInsert)
      .select("*");

    if (error) {
      console.error("[OrderSync] Erro ao cadastrar cupons:", error.message);
      return (existing as Coupon[]) ?? [];
    }

    return [...((existing as Coupon[]) ?? []), ...((inserted as Coupon[]) ?? [])];
  }

  async getCouponsByAffiliateId(affiliateId: string): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("coupons").select("*").eq("affiliate_id", affiliateId);
    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  async getAllAffiliates(): Promise<Pick<Affiliate, "id" | "commission_rate" | "created_at">[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("affiliates").select(this.affiliateFields);
    if (error) return [];
    return (data ?? []) as Pick<Affiliate, "id" | "commission_rate" | "created_at">[];
  }

  async getAffiliateById(affiliateId: string): Promise<Pick<Affiliate, "id" | "commission_rate" | "created_at">[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("affiliates").select(this.affiliateFields).eq("id", affiliateId);
    if (error) return [];
    return (data ?? []) as Pick<Affiliate, "id" | "commission_rate" | "created_at">[];
  }

  async getSyncState(source: OrderSource): Promise<SyncState | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("sync_state").select("*").eq("source", source).single();
    if (error || !data) return null;
    return data as SyncState;
  }

  async updateSyncState(
    status: string,
    source: OrderSource,
    syncedByUserId?: string,
    updateLastSyncedAt: boolean = true
  ): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const payload: Record<string, unknown> = {
      source,
      synced_by_user_id: syncedByUserId ?? null,
      api_response_status: status,
    };
    if (updateLastSyncedAt) payload.last_synced_at = new Date().toISOString();
    await supabase.from("sync_state").upsert(payload, { onConflict: "source" });
  }
}
