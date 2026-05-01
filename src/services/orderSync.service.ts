import { ShopifyService } from "@/src/services/shopify.service";
import { OrderSyncRepository } from "@/src/repositories/orderSync.repository";
import type { OrderItemInsert } from "@/src/repositories/orderSync.repository";
import type { Orders, DashboardData, ShopifyOrder, Coupon } from "@/src/types";
import { getAffiliateDataStartDate } from "@/src/lib/utils";

const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

/**
 * Service responsável pela sincronia de orders da Shopify e montagem
 * dos dados do dashboard.
 *
 * - Admin  → busca TODAS as orders da loja (sem filtro de cupom)
 * - Affiliate → busca apenas orders com seus cupons
 */
export class OrderSyncService {
  private readonly shopify: ShopifyService;
  private readonly repo: OrderSyncRepository;

  constructor() {
    this.shopify = new ShopifyService();
    this.repo = new OrderSyncRepository();
  }

  private async getSyncCooldownState(): Promise<{
    lastSyncedAt: string | null;
    remainingSeconds: number;
  }> {
    const syncState = await this.repo.getSyncState();
    const lastSyncedAt = syncState?.last_synced_at ?? null;

    if (!lastSyncedAt) {
      return { lastSyncedAt: null, remainingSeconds: 0 };
    }

    const lastSyncedMs = new Date(lastSyncedAt).getTime();
    if (Number.isNaN(lastSyncedMs)) {
      return { lastSyncedAt: null, remainingSeconds: 0 };
    }

    const expiresAt = lastSyncedMs + SYNC_COOLDOWN_MS;
    const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

    return { lastSyncedAt, remainingSeconds };
  }

  // ──────────────────────────────────────────────
  // 1. BUSCAR na Shopify
  // ──────────────────────────────────────────────

  private async fetchOrdersFromShopify(
    role: "admin" | "affiliate",
    coupons: Coupon[],
    ignoreSinceDate: boolean = false
  ): Promise<{ orders: ShopifyOrder[]; apiStatus: string }> {
    const syncState = ignoreSinceDate ? null : await this.repo.getSyncState();
    const sinceDate = syncState?.last_synced_at ?? undefined;

    try {
      let orders: ShopifyOrder[];

      if (role === "admin") {
        orders = await this.shopify.getAllOrders(sinceDate);
      } else {
        if (coupons.length === 0) {
          return { orders: [], apiStatus: "skipped_no_coupons" };
        }
        orders = await this.shopify.getOrdersByDiscountCodes(coupons, sinceDate);
      }

      return { orders, apiStatus: "success" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      return { orders: [], apiStatus: `error: ${message}` };
    }
  }

  // ──────────────────────────────────────────────
  // 2. POPULAR — Transforma e grava no banco
  // ──────────────────────────────────────────────

  /**
   * Monta os registros de orders para upsert.
   *
   * Dois mapas são usados para vincular corretamente:
   *  - codeToIdMap:          coupon_code (UPPER) → coupon.id
   *  - codeToAffiliateIdMap: coupon_code (UPPER) → coupon.affiliate_id
   *
   * Isso garante que tanto coupon_id quanto affiliate_id sejam populados
   * na tabela orders a partir do código de desconto da Shopify.
   */
  private mapShopifyOrders(
    shopifyOrders: ShopifyOrder[],
    codeToIdMap: Map<string, string>,
    codeToAffiliateIdMap: Map<string, string>
  ): Omit<Orders, "id" | "synced_at">[] {
    return shopifyOrders.map((shopifyOrder) => {
      const firstDiscountCode =
        shopifyOrder.discount_codes.length > 0
          ? shopifyOrder.discount_codes[0].code
          : null;

      // Percorre todos os códigos de desconto da order e encontra
      // o primeiro que bate com um cupom cadastrado no sistema.
      const matchedCode = shopifyOrder.discount_codes
        .map((d) => d.code.toUpperCase())
        .find((code) => codeToIdMap.has(code));

      const couponId = matchedCode
        ? codeToIdMap.get(matchedCode) ?? null
        : null;

      const affiliateId = matchedCode
        ? codeToAffiliateIdMap.get(matchedCode) ?? null
        : null;

      // Extrair frete do total_shipping_price_set
      const shippingCost = shopifyOrder.total_shipping_price_set?.shop_money?.amount
        ? parseFloat(shopifyOrder.total_shipping_price_set.shop_money.amount)
        : 0;

      return {
        shopify_order_id: String(shopifyOrder.id),
        coupon_code: firstDiscountCode,
        coupon_id: couponId,
        affiliate_id: affiliateId,
        total_amount: parseFloat(shopifyOrder.current_total_price),
        total_discounts: parseFloat(shopifyOrder.total_discounts || "0"),
        shipping_cost: shippingCost,
        currency: shopifyOrder.currency,
        financial_status: shopifyOrder.financial_status as Orders["financial_status"],
        created_at: shopifyOrder.created_at,
      };
    });
  }

  /**
   * Extrai os line_items de cada ShopifyOrder e os mapeia para OrderItemInsert,
   * usando o shopify_order_id → id do banco (via shopifyIdToDbIdMap).
   */
  private mapShopifyLineItems(
    shopifyOrders: ShopifyOrder[],
    shopifyIdToDbIdMap: Map<string, string>
  ): OrderItemInsert[] {
    const items: OrderItemInsert[] = [];

    for (const order of shopifyOrders) {
      const dbOrderId = shopifyIdToDbIdMap.get(String(order.id));
      if (!dbOrderId) continue;

      for (const lineItem of order.line_items ?? []) {
        items.push({
          order_id: dbOrderId,
          product_name: lineItem.title,
          quantity: lineItem.quantity,
          unit_price: parseFloat(lineItem.price),
        });
      }
    }

    return items;
  }

  private async populateOrders(
    shopifyOrders: ShopifyOrder[],
    coupons: Coupon[],
    apiStatus: string,
    syncedByUserId?: string
  ): Promise<{ synced: number; error: string | null }> {
    if (shopifyOrders.length === 0) {
      await this.repo.updateSyncState(apiStatus, syncedByUserId);
      return { synced: 0, error: null };
    }

    // Mapa code → coupon_id
    const codeToIdMap = new Map<string, string>(
      coupons.map((c) => [c.code.toUpperCase(), c.id])
    );

    // Mapa code → affiliate_id (vincula a order diretamente ao afiliado dono do cupom)
    const codeToAffiliateIdMap = new Map<string, string>(
      coupons
        .filter((c) => c.affiliate_id)
        .map((c) => [c.code.toUpperCase(), c.affiliate_id!])
    );

    const ordersToUpsert = this.mapShopifyOrders(shopifyOrders, codeToIdMap, codeToAffiliateIdMap);

    // Persiste as orders e obtém os ids gerados pelo banco
    const { rows, error: ordersError } = await this.repo.upsertOrders(ordersToUpsert);

    if (ordersError) {
      await this.repo.updateSyncState(apiStatus, syncedByUserId);
      return { synced: 0, error: ordersError };
    }

    // Monta mapa shopify_order_id → db uuid para vincular os itens
    const shopifyIdToDbIdMap = new Map<string, string>(
      rows.map((r) => [r.shopify_order_id, r.id])
    );

    // Extrai e persiste os line_items
    const lineItems = this.mapShopifyLineItems(shopifyOrders, shopifyIdToDbIdMap);
    const { error: itemsError } = await this.repo.upsertOrderItems(lineItems);

    if (itemsError) {
      console.error("[OrderSync] Erro ao salvar order_items:", itemsError);
    }

    await this.repo.updateSyncState(apiStatus, syncedByUserId);

    return { synced: rows.length, error: itemsError };
  }

  // ──────────────────────────────────────────────
  // 3. Sync normal (incremental)
  // ──────────────────────────────────────────────

  async syncAndGetDashboardData(
    role: "admin" | "affiliate",
    userId: string,
    affiliateId?: string
  ): Promise<DashboardData> {
    const cooldownState = await this.getSyncCooldownState();

    if (role === "affiliate" && cooldownState.remainingSeconds > 0) {
      return this.buildDashboardData(
        role,
        affiliateId,
        {
          synced: 0,
          apiStatus: `cooldown_${cooldownState.remainingSeconds}s`,
          error: null,
        },
        cooldownState.lastSyncedAt
      );
    }

    // Admin: sempre carrega TODOS os cupons para o mapa de vinculação
    const coupons =
      role === "admin"
        ? await this.repo.getAllCoupons()
        : await this.repo.getCouponsByAffiliateId(affiliateId!);

    // 1. Buscar na Shopify (incremental — desde last_synced_at)
    const { orders: shopifyOrders, apiStatus } = await this.fetchOrdersFromShopify(role, coupons);

    // 2. Persistir no banco (orders + itens)
    const { synced, error } = await this.populateOrders(
      shopifyOrders,
      coupons,
      apiStatus,
      userId
    );

    // 3. Montar dados do dashboard
    return this.buildDashboardData(role, affiliateId, {
      synced,
      apiStatus,
      error,
    });
  }

  // ──────────────────────────────────────────────
  // 4. Full Sync (desde o início — admin only)
  // ──────────────────────────────────────────────

  /**
   * Sync completo: ignora o sinceDate, busca TUDO desde o começo.
   * Busca todas as orders e faz upsert — atualiza existentes e cria novas.
   * Apenas admin pode executar.
   */
  async fullSyncAndGetDashboardData(
    userId: string
  ): Promise<DashboardData> {
    const coupons = await this.repo.getAllCoupons();

    const { orders: shopifyOrders, apiStatus } = await this.fetchOrdersFromShopify("admin", coupons, true);

    console.log(`[Full Sync] ${shopifyOrders.length} orders fetched from Shopify`);

    const { synced, error } = await this.populateOrders(
      shopifyOrders,
      coupons,
      apiStatus,
      userId
    );

    console.log("[Full Sync] synced:", synced, "| error:", error);

    return this.buildDashboardData("admin", undefined, {
      synced,
      apiStatus,
      error,
    });
  }

  // ──────────────────────────────────────────────
  // 5. Dashboard data (sem sync)
  // ──────────────────────────────────────────────

  async getDashboardData(
    role: "admin" | "affiliate",
    affiliateId?: string
  ): Promise<DashboardData> {
    return this.buildDashboardData(role, affiliateId, null);
  }

  // ──────────────────────────────────────────────
  // Helpers internos
  // ──────────────────────────────────────────────

  private async buildDashboardData(
    role: "admin" | "affiliate",
    affiliateId: string | undefined,
    syncResult: DashboardData["syncResult"],
    knownLastSyncedAt?: string | null
  ): Promise<DashboardData> {
    const lastSyncedAt =
      knownLastSyncedAt === undefined
        ? (await this.repo.getSyncState())?.last_synced_at ?? null
        : knownLastSyncedAt;

    const affiliateRows =
      role === "affiliate" ? await this.repo.getAffiliateById(affiliateId!) : [];
    const affiliateDataStartDate =
      role === "affiliate"
        ? getAffiliateDataStartDate(affiliateRows[0]?.created_at)
        : null;

    const [orders, coupons, affiliates] =
      role === "admin"
        ? await Promise.all([
          this.repo.getAllOrders(),
          this.repo.getAllCoupons(),
          this.repo.getAllAffiliates(),
        ])
        : await Promise.all([
          this.repo.getOrdersByCouponAffiliateId(affiliateId!, affiliateDataStartDate ?? undefined),
          this.repo.getCouponsByAffiliateId(affiliateId!),
          Promise.resolve(affiliateRows),
        ]);

    const activeCoupons = coupons.filter((c) => c.active).length;

    // Affiliate Commission + CreatedAt Map
    const affMetaMap = new Map<string, { commissionRate: number; createdAtMs: number | null }>(
      affiliates.map((a) => {
        const affiliateStartDate = getAffiliateDataStartDate(a.created_at);
        const createdAtMs = affiliateStartDate ? new Date(affiliateStartDate).getTime() : Number.NaN;
        return [
          a.id,
          {
            commissionRate: a.commission_rate ?? 0,
            createdAtMs: Number.isNaN(createdAtMs) ? null : createdAtMs,
          },
        ];
      })
    );

    // Coupon -> Affiliate Map
    const couponAffiliateMap = new Map<string, string>(
      coupons
        .filter((c) => c.affiliate_id)
        .map((c) => [c.id, c.affiliate_id!])
    );

    const calcComm = (o: Orders) => {
      const affId = o.affiliate_id ?? (o.coupon_id ? couponAffiliateMap.get(o.coupon_id) : undefined);
      if (!affId) return 0;
      const affiliateMeta = affMetaMap.get(affId);
      if (!affiliateMeta) return 0;
      if (affiliateMeta.commissionRate <= 0) return 0;

      const orderCreatedAtMs = new Date(o.created_at).getTime();
      if (Number.isNaN(orderCreatedAtMs)) return 0;
      if (affiliateMeta.createdAtMs !== null && orderCreatedAtMs < affiliateMeta.createdAtMs) {
        return 0;
      }

      const base = o.total_amount - (o.total_discounts ?? 0) - (o.shipping_cost ?? 0);
      if (base <= 0) return 0;
      return base * (affiliateMeta.commissionRate / 100);
    };

    const paidOrders = orders.filter((o) => o.financial_status === "paid");

    const totalCommissions = paidOrders.reduce((acc, o) => acc + calcComm(o), 0);
    const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.total_amount - (o.shipping_cost ?? 0)), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPaid = paidOrders.filter(
      (o) => new Date(o.created_at) >= startOfMonth
    );
    const monthlyCommissions = monthlyPaid.reduce((acc, o) => acc + calcComm(o), 0);
    const monthlyRevenue = monthlyPaid.reduce((acc, o) => acc + (o.total_amount - (o.shipping_cost ?? 0)), 0);

    const chartMonthly = this.buildMonthlyChart(paidOrders, calcComm);
    const chartDaily = this.buildDailyChart(paidOrders, calcComm);

    return {
      isAdmin: role === "admin",
      lastSyncedAt,
      stats: {
        activeCoupons,
        totalCommissions: parseFloat(totalCommissions.toFixed(2)),
        monthlyCommissions: parseFloat(monthlyCommissions.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        couponSales: paidOrders.length,
      },
      orders,
      chartMonthly,
      chartDaily,
      syncResult,
    };
  }

  private buildMonthlyChart(
    paidOrders: Orders[],
    calcComm: (o: Orders) => number
  ): { label: string; value: number }[] {
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];

    const now = new Date();
    const result: { label: string; value: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = months[d.getMonth()];

      const ordersInMonth = paidOrders.filter((o) => {
        const od = new Date(o.created_at);
        return `${od.getFullYear()}-${od.getMonth()}` === key;
      });

      const value = ordersInMonth.reduce((acc, o) => acc + calcComm(o), 0);

      result.push({ label, value: parseFloat(value.toFixed(2)) });
    }

    return result;
  }

  private buildDailyChart(
    paidOrders: Orders[],
    calcComm: (o: Orders) => number
  ): { label: string; value: number }[] {
    const dayNames = [
      "Domingo", "Segunda", "Terça",
      "Quarta", "Quinta", "Sexta", "Sábado",
    ];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const recentOrders = paidOrders.filter(
      (o) => new Date(o.created_at) >= cutoff
    );

    const dayTotals = new Array(7).fill(0);

    for (const o of recentOrders) {
      const dayOfWeek = new Date(o.created_at).getDay();
      dayTotals[dayOfWeek] += calcComm(o);
    }

    const reordered = [1, 2, 3, 4, 5, 6, 0];
    return reordered.map((i) => ({
      label: dayNames[i],
      value: parseFloat(dayTotals[i].toFixed(2)),
    }));
  }
}
