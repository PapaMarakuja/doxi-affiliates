import type {
  ShopifyOrder,
  ShopifyOrdersResponse,
  Coupon,
} from "@/src/types";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2024-10";

const ORDER_FIELDS = [
  "id",
  "name",
  "created_at",
  "financial_status",
  "current_total_price",
  "total_discounts",
  "total_shipping_price_set",
  "currency",
  "discount_codes",
  "line_items",
].join(",");

export class ShopifyService {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.baseUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`;
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
    };
  }

  private async fetchFromShopify<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Shopify API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Busca TODAS as orders da loja — sem filtro de cupom.
   * Usado pelo admin para ter visão completa das vendas.
   * Suporta paginação automática.
   */
  async getAllOrders(sinceDate?: string): Promise<ShopifyOrder[]> {
    const allOrders: ShopifyOrder[] = [];
    let hasMore = true;
    let pageInfo: string | undefined;

    while (hasMore) {
      const params = new URLSearchParams({
        status: "any",
        limit: "250",
        fields: ORDER_FIELDS,
      });

      if (sinceDate) params.set("created_at_min", sinceDate);
      if (pageInfo) params.set("page_info", pageInfo);

      const endpoint = `/orders.json?${params.toString()}`;
      const data = await this.fetchFromShopify<ShopifyOrdersResponse>(endpoint);

      allOrders.push(...data.orders);

      hasMore = data.orders.length === 250;
      pageInfo = undefined;
    }

    return allOrders;
  }

  /**
   * Busca orders filtradas por discount_code de cupons específicos.
   * Usado por afiliados — busca apenas pedidos feitos com seus cupons.
   */
  async getOrdersByDiscountCodes(
    coupons: Coupon[],
    sinceDate?: string
  ): Promise<ShopifyOrder[]> {
    if (coupons.length === 0) return [];

    const allOrders: ShopifyOrder[] = [];
    const seenOrderIds = new Set<number>();

    for (const coupon of coupons) {
      let pageInfo: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({
          discount_code: coupon.code,
          status: "any",
          limit: "250",
          fields: ORDER_FIELDS,
        });

        if (sinceDate) params.set("created_at_min", sinceDate);
        if (pageInfo) params.set("page_info", pageInfo);

        const endpoint = `/orders.json?${params.toString()}`;

        const data = await this.fetchFromShopify<ShopifyOrdersResponse>(endpoint);

        for (const order of data.orders) {
          if (!seenOrderIds.has(order.id)) {
            seenOrderIds.add(order.id);
            allOrders.push(order);
          }
        }

        hasMore = data.orders.length === 250;
        pageInfo = undefined;
      }
    }

    return allOrders;
  }

  async getOrderById(shopifyOrderId: string): Promise<ShopifyOrder | null> {
    try {
      const data = await this.fetchFromShopify<{ order: ShopifyOrder }>(
        `/orders/${shopifyOrderId}.json`
      );
      return data.order;
    } catch {
      return null;
    }
  }
}
