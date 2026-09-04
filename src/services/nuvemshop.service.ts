import type { Coupon } from "@/src/types";
import type {
  IStoreService,
  NormalizedOrder,
  NormalizedCustomer,
} from "./storeService.interface";
import type { NuvemshopOrder } from "@/src/types";

// ── Variáveis de ambiente ──────────────────────────────────────────────────
const NUVEMSHOP_USER_ID = process.env.NUVEMSHOP_USER_ID!;
const NUVEMSHOP_ACCESS_TOKEN = process.env.NUVEMSHOP_ACCESS_TOKEN!;
const NUVEMSHOP_API_URL =
  process.env.NUVEMSHOP_API_URL ?? "https://api.nuvemshop.com.br/v1";

/**
 * Serviço de integração com a API da Nuvemshop.
 *
 * Implementa IStoreService — mesmo contrato do ShopifyService.
 * O OrderSyncService é agnóstico de plataforma e depende apenas desta interface.
 *
 * TODO: Preencher mapeamentos quando a documentação da API estiver disponível:
 *  - Verificar nome exato dos campos de status de pagamento
 *  - Confirmar paginação (Link header ou campo `next`?)
 *  - Confirmar filtro de pedidos por cupom (se suportado na API)
 */
export class NuvemshopService implements IStoreService {
  readonly source = "nuvemshop" as const;

  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.baseUrl = `${NUVEMSHOP_API_URL}/${NUVEMSHOP_USER_ID}`;
    this.headers = {
      "Content-Type": "application/json",
      Authentication: `bearer ${NUVEMSHOP_ACCESS_TOKEN}`,
      "User-Agent": "doxi-affiliates (suporte@doxi.com.br)",
    };
  }

  // ── Fetch interno ──────────────────────────────────────────────────────────

  private async fetchFromNuvemshop<T>(
    endpoint: string
  ): Promise<{ data: T; nextPage: string | undefined }> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Nuvemshop API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as T;

    // TODO: Confirmar como a Nuvemshop sinaliza próxima página
    // (Link header igual à Shopify, ou campo `links.next` no body?)
    const linkHeader = response.headers.get("Link");
    let nextPage: string | undefined;

    if (linkHeader) {
      const nextLink = linkHeader
        .split(",")
        .find((l) => l.includes('rel="next"'));
      if (nextLink) {
        const match = nextLink.match(/<([^>]+)>/);
        if (match) nextPage = match[1];
      }
    }

    return { data, nextPage };
  }

  // ── Normalização ───────────────────────────────────────────────────────────

  private extractDiscountCodes(order: NuvemshopOrder): string[] {
    const codes: string[] = [];

    if (Array.isArray(order.coupon)) {
      for (const item of order.coupon) {
        if (item?.code && typeof item.code === "string") {
          codes.push(item.code.trim());
        }
      }
    } else if (order.coupon && typeof order.coupon === "object" && "code" in order.coupon) {
      const single = order.coupon as { code?: string };
      if (single.code && typeof single.code === "string") {
        codes.push(single.code.trim());
      }
    }

    if (Array.isArray(order.coupons)) {
      for (const item of order.coupons) {
        if (item?.code && typeof item.code === "string") {
          codes.push(item.code.trim());
        }
      }
    }

    if (order.promotional_discount?.code && typeof order.promotional_discount.code === "string") {
      codes.push(order.promotional_discount.code.trim());
    }

    return [...new Set(codes.filter((c) => c.length > 0))];
  }

  private normalize(order: NuvemshopOrder): NormalizedOrder {
    const discountCodes = this.extractDiscountCodes(order);
    const firstDiscountCode = discountCodes[0] ?? null;

    let customer: NormalizedCustomer | null = null;
    if (order.customer) {
      const [firstName, ...rest] = (order.customer.name ?? "").split(" ");
      customer = {
        externalId: String(order.customer.id),
        email: order.customer.email ?? null,
        firstName: firstName ?? null,
        lastName: rest.join(" ") || null,
      };
    }

    return {
      externalId: String(order.id),
      source: "nuvemshop",
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      cancelledAt: order.cancelled_at,
      cancelReason: order.cancel_reason,
      financialStatus: order.payment_status,
      totalPrice: order.total,
      totalDiscounts: order.discount ?? "0",
      shippingCost: parseFloat(order.shipping_cost_owner ?? "0"),
      currency: order.currency,
      firstDiscountCode,
      discountCodes,
      lineItems: (order.products ?? []).map((p) => ({
        title: p.name,
        quantity: p.quantity,
        price: p.price,
      })),
      customer,
    };
  }

  // ── IStoreService ──────────────────────────────────────────────────────────

  /**
   * Busca TODOS os pedidos da loja com paginação automática.
   * @param sinceDate - ISO 8601. Filtra por `updated_at_min` se informado.
   */
  async getAllOrders(sinceDate?: string): Promise<NormalizedOrder[]> {
    console.log("🚀 ~ NuvemshopService.getAllOrders ~ sinceDate:", sinceDate);

    const allOrders: NuvemshopOrder[] = [];
    let nextUrl: string | undefined;
    let isFirstPage = true;

    while (isFirstPage || nextUrl) {
      let endpoint: string;

      if (nextUrl) {
        // Usa a URL completa da próxima página retornada no header Link
        endpoint = nextUrl.replace(this.baseUrl, "");
      } else {
        const params = new URLSearchParams({ per_page: "200" });
        // TODO: Confirmar nome do parâmetro de data na Nuvemshop
        if (sinceDate) params.set("updated_at_min", sinceDate);
        endpoint = `/orders?${params.toString()}`;
      }

      const { data, nextPage } = await this.fetchFromNuvemshop<NuvemshopOrder[]>(endpoint);
      allOrders.push(...data);

      nextUrl = nextPage;
      isFirstPage = false;
    }

    return allOrders.map((o) => this.normalize(o));
  }

  /**
   * Busca pedidos filtrados pelos cupons do afiliado.
   *
   * TODO: Confirmar se a API da Nuvemshop suporta filtro por cupom.
   * Se não suportar, esta implementação faz client-side filtering
   * trazendo todos os pedidos e filtrando localmente.
   */
  async getOrdersByDiscountCodes(
    coupons: Coupon[],
    sinceDate?: string
  ): Promise<NormalizedOrder[]> {
    if (coupons.length === 0) return [];

    const couponCodes = new Set(coupons.map((c) => c.code.toUpperCase()));
    const allOrders = await this.getAllOrders(sinceDate);

    // Filtra client-side até confirmarmos se a API suporta filtro por cupom
    return allOrders.filter((o) =>
      o.discountCodes.some((code) => couponCodes.has(code.toUpperCase()))
    );
  }

  async getOrderById(externalOrderId: string): Promise<NormalizedOrder | null> {
    try {
      const { data } = await this.fetchFromNuvemshop<NuvemshopOrder>(
        `/orders/${externalOrderId}`
      );
      return this.normalize(data);
    } catch {
      return null;
    }
  }
}
