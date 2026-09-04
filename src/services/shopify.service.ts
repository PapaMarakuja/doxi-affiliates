import type {
  ShopifyOrder,
  ShopifyOrdersResponse,
  Coupon,
} from "@/src/types";
import type {
  IStoreService,
  NormalizedOrder,
  NormalizedCustomer,
} from "./storeService.interface";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2024-10";

const ORDER_FIELDS = [
  "id",
  "name",
  "created_at",
  "updated_at",
  "cancelled_at",
  "cancel_reason",
  "financial_status",
  "current_total_price",
  "total_discounts",
  "total_shipping_price_set",
  "currency",
  "discount_codes",
  "line_items",
  "customer",
].join(",");

export class ShopifyService implements IStoreService {
  readonly source = "shopify" as const;

  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.baseUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`;
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
    };
  }

  private async fetchFromShopify<T>(
    endpoint: string
  ): Promise<{ data: T; nextPageInfo: string | undefined }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Shopify API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as T;

    const linkHeader = response.headers.get("Link");
    let nextPageInfo: string | undefined;

    if (linkHeader) {
      const links = linkHeader.split(",");
      const nextLink = links.find((link) => link.includes('rel="next"'));
      if (nextLink) {
        const match = nextLink.match(/page_info=([^>;&\s]+)/);
        if (match) {
          nextPageInfo = match[1];
        }
      }
    }

    return { data, nextPageInfo };
  }

  // ──────────────────────────────────────────────
  // Normalização
  // ──────────────────────────────────────────────

  private normalize(order: ShopifyOrder): NormalizedOrder {
    const discountCodes = (order.discount_codes ?? []).map((d) => d.code);
    const firstDiscountCode = discountCodes[0] ?? null;

    const shippingCost = order.total_shipping_price_set?.shop_money?.amount
      ? parseFloat(order.total_shipping_price_set.shop_money.amount)
      : 0;

    let customer: NormalizedCustomer | null = null;
    if (order.customer) {
      customer = {
        externalId: String(order.customer.id),
        email: order.customer.email,
        firstName: order.customer.first_name,
        lastName: order.customer.last_name,
      };
    }

    return {
      externalId: String(order.id),
      source: "shopify",
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      cancelledAt: order.cancelled_at,
      cancelReason: order.cancel_reason,
      financialStatus: order.financial_status,
      totalPrice: order.current_total_price,
      totalDiscounts: order.total_discounts ?? "0",
      shippingCost,
      currency: order.currency,
      firstDiscountCode,
      discountCodes,
      lineItems: (order.line_items ?? []).map((li) => ({
        title: li.title,
        quantity: li.quantity,
        price: li.price,
      })),
      customer,
    };
  }

  // ──────────────────────────────────────────────
  // IStoreService
  // ──────────────────────────────────────────────

  /**
   * Busca TODAS as orders da loja — sem filtro de cupom.
   * Usado pelo admin para ter visão completa das vendas.
   * Suporta paginação automática.
   */
  async getAllOrders(sinceDate?: string): Promise<NormalizedOrder[]> {
    console.log("🚀 ~ ShopifyService.getAllOrders ~ sinceDate:", sinceDate);
    const allOrders: ShopifyOrder[] = [];
    let hasMore = true;
    let pageInfo: string | undefined;

    while (hasMore) {
      let endpoint: string;
      if (pageInfo) {
        endpoint = `/orders.json?page_info=${pageInfo}&limit=250`;
      } else {
        const params = new URLSearchParams({
          status: "any",
          limit: "250",
          fields: ORDER_FIELDS,
        });

        if (sinceDate) params.set("updated_at_min", sinceDate);
        endpoint = `/orders.json?${params.toString()}`;
      }

      const { data, nextPageInfo } = await this.fetchFromShopify<ShopifyOrdersResponse>(endpoint);

      allOrders.push(...data.orders);

      pageInfo = nextPageInfo;
      hasMore = !!pageInfo;
    }

    return allOrders.map((o) => this.normalize(o));
  }

  /**
   * Busca orders filtradas por discount_code de cupons específicos.
   * Usado por afiliados — busca apenas pedidos feitos com seus cupons.
   */
  async getOrdersByDiscountCodes(
    coupons: Coupon[],
    sinceDate?: string
  ): Promise<NormalizedOrder[]> {
    if (coupons.length === 0) return [];

    const allOrders: ShopifyOrder[] = [];
    const seenOrderIds = new Set<number>();

    for (const coupon of coupons) {
      let pageInfo: string | undefined;
      let hasMore = true;

      while (hasMore) {
        let endpoint: string;
        if (pageInfo) {
          endpoint = `/orders.json?page_info=${pageInfo}&limit=250`;
        } else {
          const params = new URLSearchParams({
            discount_code: coupon.code,
            status: "any",
            limit: "250",
            fields: ORDER_FIELDS,
          });

          if (sinceDate) params.set("updated_at_min", sinceDate);
          endpoint = `/orders.json?${params.toString()}`;
        }

        const { data, nextPageInfo } = await this.fetchFromShopify<ShopifyOrdersResponse>(endpoint);

        for (const order of data.orders) {
          if (!seenOrderIds.has(order.id)) {
            seenOrderIds.add(order.id);
            allOrders.push(order);
          }
        }

        pageInfo = nextPageInfo;
        hasMore = !!pageInfo;
      }
    }

    return allOrders.map((o) => this.normalize(o));
  }

  async getOrderById(externalOrderId: string): Promise<NormalizedOrder | null> {
    try {
      const { data } = await this.fetchFromShopify<{ order: ShopifyOrder }>(
        `/orders/${externalOrderId}.json`
      );
      return this.normalize(data.order);
    } catch {
      return null;
    }
  }
}

