import { createSupabaseServiceClient } from "@/src/lib/supabase/server";
import type { Product } from "@/src/types/product";
import type {
  RestockProductSummary,
  RestockSubscription,
  RestockSubscriptionsOverview,
} from "@/src/types/restockSubscription";

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG"];

/** Sorts known clothing sizes first (PP → EGG), then the rest alphabetically. */
function compareSizes(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a.trim().toUpperCase());
  const ib = SIZE_ORDER.indexOf(b.trim().toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b, "pt-BR", { numeric: true });
}

type CatalogProduct = Pick<Product, "external_product_id" | "name" | "url">;

/** Groups subscriptions by product and then by variant (size). Pure function. */
export function groupRestockSubscriptions(
  rows: RestockSubscription[],
  catalog: CatalogProduct[] = []
): RestockSubscriptionsOverview {
  const products = new Map<number, RestockProductSummary>();
  const catalogById = new Map(catalog.map((p) => [p.external_product_id, p]));

  for (const row of rows) {
    const isNotified = row.notified_at !== null;
    const info = catalogById.get(String(row.product_id));
    const product = products.get(row.product_id) ?? {
      product_id: row.product_id,
      name: info?.name ?? null,
      url: info?.url ?? null,
      total: 0,
      pending: 0,
      notified: 0,
      last_subscribed_at: row.created_at,
      variants: [],
    };

    product.total += 1;
    if (isNotified) product.notified += 1;
    else product.pending += 1;
    if (row.created_at > product.last_subscribed_at) product.last_subscribed_at = row.created_at;

    let variant = product.variants.find((v) => v.variant_id === row.variant_id);
    if (!variant) {
      variant = { variant_id: row.variant_id, variant_label: row.variant_label, total: 0, pending: 0, notified: 0 };
      product.variants.push(variant);
    }
    variant.total += 1;
    if (isNotified) variant.notified += 1;
    else variant.pending += 1;

    products.set(row.product_id, product);
  }

  const sortedProducts = [...products.values()]
    .map((p) => ({ ...p, variants: p.variants.sort((a, b) => compareSizes(a.variant_label, b.variant_label)) }))
    .sort((a, b) => b.pending - a.pending || b.total - a.total);

  return {
    total: rows.length,
    pending: rows.filter((r) => r.notified_at === null).length,
    notified: rows.filter((r) => r.notified_at !== null).length,
    products: sortedProducts,
  };
}

export class RestockSubscriptionRepository {
  /** Service client: the table is written by the storefront and has no admin-facing RLS policy. Only call from admin-gated routes. */
  async listAll(): Promise<RestockSubscription[]> {
    const supabase = await createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("restock_subscriptions")
      .select("id, product_id, variant_id, variant_label, email, consent_at, created_at, notified_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as RestockSubscription[];
  }

  /** Catalog entries for the subscribed products. The storefront (Notify Me) runs on Nuvemshop. */
  async listProducts(productIds: number[]): Promise<CatalogProduct[]> {
    if (productIds.length === 0) return [];
    const supabase = await createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("external_product_id, name, url")
      .eq("source", "nuvemshop")
      .in("external_product_id", [...new Set(productIds)].map(String));

    if (error) throw new Error(error.message);
    return (data ?? []) as CatalogProduct[];
  }
}
