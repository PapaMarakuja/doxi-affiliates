import { ShopifyService } from "@/src/services/shopify.service";
import { OrderSyncRepository } from "@/src/repositories/orderSync.repository";
import type { OrderItemInsert } from "@/src/repositories/orderSync.repository";
import type { Orders, DashboardData, ShopifyOrder, Coupon } from "@/src/types";
import { getAffiliateDataStartDate } from "@/src/lib/utils";

/**
 * Service responsável pela sincronia de orders da Shopify e montagem
 * dos dados do dashboard.
 *
 * - Admin  → busca TODAS as orders da loja (sem filtro de data), faz upsert.
 * - Afiliado → busca apenas orders que usaram seus cupons (sem filtro de data), faz upsert.
 * - syncResult → diferencia pedidos novos de atualizados.
 */
export class OrderSyncService {
  private readonly shopify: ShopifyService;
  private readonly repo: OrderSyncRepository;

  constructor() {
    this.shopify = new ShopifyService();
    this.repo = new OrderSyncRepository();
  }

  // ──────────────────────────────────────────────
  // 1. BUSCAR na Shopify
  // ──────────────────────────────────────────────

  /**
   * Admin → busca TODAS as orders (getAllOrders sem sinceDate).
   * Afiliado → busca apenas as orders com seus cupons (getOrdersByDiscountCodes sem sinceDate).
   */
  private async fetchOrdersFromShopify(
    role: "admin" | "affiliate",
    coupons: Coupon[]
  ): Promise<{ orders: ShopifyOrder[]; apiStatus: string }> {
    try {
      let orders: ShopifyOrder[];

      if (role === "admin") {
        orders = await this.shopify.getAllOrders();
      } else {
        orders = await this.shopify.getOrdersByDiscountCodes(coupons);
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
    codeToAffiliateIdMap: Map<string, string>,
    shopifyCustomerIdToDbIdMap: Map<string, string>
  ): Omit<Orders, "id" | "synced_at">[] {
    return shopifyOrders.map((shopifyOrder) => {
      const firstDiscountCode =
        shopifyOrder.discount_codes && shopifyOrder.discount_codes.length > 0
          ? shopifyOrder.discount_codes[0].code
          : null;

      // Percorre todos os códigos de desconto da order e encontra
      // o primeiro que bate com um cupom cadastrado no sistema.
      const matchedCode = (shopifyOrder.discount_codes || [])
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

      // Map Shopify financial_status to DB enum ("paid" | "refunded" | "processing" | "unpaid")
      let mappedStatus: Orders["financial_status"] = "unpaid";
      const sfStatus = shopifyOrder.financial_status?.toLowerCase();

      if (shopifyOrder.cancelled_at) {
        mappedStatus = (sfStatus === "paid" || sfStatus === "refunded" || sfStatus === "partially_refunded") ? "refunded" : "unpaid";
      } else if (sfStatus === "paid") {
        mappedStatus = "paid";
      } else if (sfStatus === "refunded" || sfStatus === "voided" || sfStatus === "partially_refunded") {
        mappedStatus = "refunded";
      } else if (sfStatus === "authorized" || sfStatus === "partially_paid") {
        mappedStatus = "processing";
      } else {
        mappedStatus = "unpaid";
      }

      return {
        shopify_order_id: String(shopifyOrder.id),
        coupon_code: firstDiscountCode,
        coupon_id: couponId,
        affiliate_id: affiliateId,
        total_amount: parseFloat(shopifyOrder.current_total_price),
        total_discounts: parseFloat(shopifyOrder.total_discounts || "0"),
        shipping_cost: shippingCost,
        currency: shopifyOrder.currency,
        financial_status: mappedStatus,
        customer_id: shopifyOrder.customer
          ? shopifyCustomerIdToDbIdMap.get(String(shopifyOrder.customer.id)) ?? null
          : null,
        created_at: shopifyOrder.created_at,
        updated_at: shopifyOrder.updated_at || null,
        cancelled_at: shopifyOrder.cancelled_at || null,
        cancel_reason: shopifyOrder.cancel_reason || null,
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

  /**
   * Verifica quais shopify_order_ids já existem no banco para distinguir
   * pedidos novos de atualizados no resultado do sync.
   */
  private async getExistingOrderIds(
    shopifyOrderIds: string[]
  ): Promise<Set<string>> {
    if (shopifyOrderIds.length === 0) return new Set();
    return this.repo.getExistingShopifyOrderIds(shopifyOrderIds);
  }

  private async populateOrders(
    shopifyOrders: ShopifyOrder[],
    coupons: Coupon[],
    apiStatus: string,
    syncedByUserId?: string
  ): Promise<{ newOrders: number; updatedOrders: number; error: string | null }> {
    if (shopifyOrders.length === 0) {
      await this.repo.updateSyncState(apiStatus, syncedByUserId, apiStatus === "success");
      return { newOrders: 0, updatedOrders: 0, error: null };
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

    // 1. Detectar quais orders já existem no banco (para calcular new vs. updated)
    const incomingShopifyIds = shopifyOrders.map((o) => String(o.id));
    const existingIds = await this.getExistingOrderIds(incomingShopifyIds);

    // 2. Upsert Customers primeiro para garantir que existam para o relacionamento
    const uniqueCustomers = new Map<string, { shopify_customer_id: string; email: string | null; first_name: string | null; last_name: string | null }>();
    shopifyOrders.forEach((o) => {
      if (o.customer) {
        uniqueCustomers.set(String(o.customer.id), {
          shopify_customer_id: String(o.customer.id),
          email: o.customer.email,
          first_name: o.customer.first_name,
          last_name: o.customer.last_name,
        });
      }
    });

    const customersToUpsert = Array.from(uniqueCustomers.values());
    const { rows: customerRows, error: customerError } = await this.repo.upsertCustomers(customersToUpsert);

    if (customerError) {
      console.error("[OrderSync] Erro ao sincronizar customers:", customerError);
    }

    const shopifyCustomerIdToDbIdMap = new Map<string, string>(
      (customerRows || []).map((c) => [c.shopify_customer_id, c.id])
    );

    const ordersToUpsert = this.mapShopifyOrders(
      shopifyOrders,
      codeToIdMap,
      codeToAffiliateIdMap,
      shopifyCustomerIdToDbIdMap
    );

    // Persiste as orders e obtém os ids gerados pelo banco
    const { rows, error: ordersError } = await this.repo.upsertOrders(ordersToUpsert);

    if (ordersError) {
      await this.repo.updateSyncState(apiStatus, syncedByUserId, false);
      return { newOrders: 0, updatedOrders: 0, error: ordersError };
    }

    // Calcular quantos foram novos vs. atualizados
    const newOrders = rows.filter((r) => !existingIds.has(r.shopify_order_id)).length;
    const updatedOrders = rows.filter((r) => existingIds.has(r.shopify_order_id)).length;

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

    await this.repo.updateSyncState(apiStatus, syncedByUserId, apiStatus === "success" && !itemsError);

    return { newOrders, updatedOrders, error: itemsError };
  }

  // ──────────────────────────────────────────────
  // 3. Sync (admin ou afiliado)
  // ──────────────────────────────────────────────

  /**
   * Sync universal:
   *  - Admin  → busca TODAS as orders da Shopify (sem filtro de data)
   *  - Afiliado → busca orders que usaram seus cupons (sem filtro de data)
   *
   * Sem cooldown — qualquer usuário pode disparar a qualquer momento.
   */
  async syncAndGetDashboardData(
    role: "admin" | "affiliate",
    userId: string,
    affiliateId?: string
  ): Promise<DashboardData> {
    // Admin precisa de todos os cupons para mapear corretamente coupon_id/affiliate_id em qualquer pedido.
    // Afiliado usa apenas seus próprios cupons para filtrar a busca na Shopify.
    const coupons = role === "affiliate" && affiliateId
      ? await this.repo.getCouponsByAffiliateId(affiliateId)
      : await this.repo.getAllCoupons();

    const { orders: shopifyOrders, apiStatus } = await this.fetchOrdersFromShopify(role, coupons);

    console.log(`[Sync][${role}] ${shopifyOrders.length} orders fetched from Shopify`);

    const { newOrders, updatedOrders, error } = await this.populateOrders(
      shopifyOrders,
      coupons,
      apiStatus,
      userId
    );

    console.log(`[Sync][${role}] newOrders: ${newOrders} | updatedOrders: ${updatedOrders} | error: ${error}`);

    return this.buildDashboardData(role, affiliateId, {
      newOrders,
      updatedOrders,
      apiStatus,
      error,
    });
  }

  // ──────────────────────────────────────────────
  // 4. Full Sync (desde o início — admin only, mantido por compatibilidade)
  // ──────────────────────────────────────────────

  /**
   * Alias para o sync de admin — busca tudo sem filtro de data.
   * Apenas admin pode executar (validação feita na rota).
   */
  async fullSyncAndGetDashboardData(
    userId: string
  ): Promise<DashboardData> {
    return this.syncAndGetDashboardData("admin", userId, undefined);
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
  ): Promise<DashboardData> {
    const lastSyncedAt = (await this.repo.getSyncState())?.last_synced_at ?? null;

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
