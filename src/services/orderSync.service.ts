import { ShopifyService } from "@/src/services/shopify.service";
import { NuvemshopService } from "@/src/services/nuvemshop.service";
import type { IStoreService, NormalizedOrder } from "@/src/services/storeService.interface";
import { OrderSyncRepository } from "@/src/repositories/orderSync.repository";
import type { OrderItemInsert } from "@/src/repositories/orderSync.repository";
import type { Orders, DashboardData, DashboardSyncResult, StoreSyncResult, Coupon, OrderSource } from "@/src/types";
import { getAffiliateDataStartDate } from "@/src/lib/utils";

const SHOPIFY_SUNSET_DATE = process.env.SHOPIFY_SUNSET_DATE ?? "2026-09-30";

function isShopifyActive(): boolean {
  const now = new Date();
  const sunset = new Date(SHOPIFY_SUNSET_DATE);
  sunset.setHours(23, 59, 59, 999);
  return now <= sunset;
}

/**
 * Service responsavel pela sincronia de orders de cada plataforma e montagem
 * dos dados do dashboard.
 *
 * Ordem de execução no sync:
 *  1. Shopify — executada enquanto a data atual for <= SHOPIFY_SUNSET_DATE
 *  2. Nuvemshop — sempre executada
 *
 * - Admin  -> busca TODAS as orders da loja (sem filtro de data), faz upsert.
 * - Afiliado -> busca apenas orders que usaram seus cupons (sem filtro de data), faz upsert.
 * - syncResult -> resultado separado por plataforma (shopify / nuvemshop).
 */
export class OrderSyncService {
  private readonly repo: OrderSyncRepository;

  constructor() {
    this.repo = new OrderSyncRepository();
  }

  // 1. BUSCAR na plataforma ativa

  private async fetchOrdersFromStore(
    store: IStoreService,
    role: "admin" | "affiliate",
    coupons: Coupon[]
  ): Promise<{ orders: NormalizedOrder[]; apiStatus: string }> {
    try {
      let orders: NormalizedOrder[];
      if (role === "admin") {
        orders = await store.getAllOrders();
      } else {
        orders = await store.getOrdersByDiscountCodes(coupons);
      }
      return { orders, apiStatus: "success" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      return { orders: [], apiStatus: `error: ${message}` };
    }
  }

  // 2. POPULAR -- Transforma e grava no banco

  private mapNormalizedOrders(
    orders: NormalizedOrder[],
    codeToIdMap: Map<string, string>,
    codeToAffiliateIdMap: Map<string, string>,
    externalCustomerIdToDbIdMap: Map<string, string>
  ): Omit<Orders, "id" | "synced_at">[] {
    return orders.map((order) => {
      const matchedCode = order.discountCodes
        .map((c) => c.toUpperCase())
        .find((code) => codeToIdMap.has(code));

      const couponId = matchedCode ? codeToIdMap.get(matchedCode) ?? null : null;
      const affiliateId = matchedCode ? codeToAffiliateIdMap.get(matchedCode) ?? null : null;

      let mappedStatus: Orders["financial_status"] = "unpaid";
      const rawStatus = order.financialStatus?.toLowerCase();

      if (order.cancelledAt) {
        mappedStatus =
          rawStatus === "paid" || rawStatus === "refunded" || rawStatus === "partially_refunded"
            ? "refunded"
            : "unpaid";
      } else if (rawStatus === "paid") {
        mappedStatus = "paid";
      } else if (rawStatus === "refunded" || rawStatus === "voided" || rawStatus === "partially_refunded") {
        mappedStatus = "refunded";
      } else if (rawStatus === "authorized" || rawStatus === "partially_paid" || rawStatus === "pending") {
        mappedStatus = "processing";
      } else {
        mappedStatus = "unpaid";
      }

      return {
        external_order_id: order.externalId,
        source: order.source,
        coupon_code: order.firstDiscountCode,
        coupon_id: couponId,
        affiliate_id: affiliateId,
        total_amount: parseFloat(order.totalPrice),
        total_discounts: parseFloat(order.totalDiscounts || "0"),
        shipping_cost: order.shippingCost,
        currency: order.currency,
        financial_status: mappedStatus,
        customer_id: order.customer
          ? externalCustomerIdToDbIdMap.get(order.customer.externalId) ?? null
          : null,
        created_at: order.createdAt,
        updated_at: order.updatedAt || null,
        cancelled_at: order.cancelledAt || null,
        cancel_reason: order.cancelReason || null,
      };
    });
  }

  private mapLineItems(
    orders: NormalizedOrder[],
    externalIdToDbIdMap: Map<string, string>
  ): OrderItemInsert[] {
    const items: OrderItemInsert[] = [];
    for (const order of orders) {
      const dbOrderId = externalIdToDbIdMap.get(order.externalId);
      if (!dbOrderId) continue;
      for (const lineItem of order.lineItems) {
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

  private async getExistingOrderIds(
    externalOrderIds: string[],
    source: OrderSource
  ): Promise<Set<string>> {
    if (externalOrderIds.length === 0) return new Set();
    return this.repo.getExistingExternalOrderIds(externalOrderIds, source);
  }

  private async populateOrders(
    orders: NormalizedOrder[],
    coupons: Coupon[],
    apiStatus: string,
    source: OrderSource,
    syncedByUserId?: string
  ): Promise<StoreSyncResult> {
    if (orders.length === 0) {
      await this.repo.updateSyncState(apiStatus, source, syncedByUserId, apiStatus === "success");
      return { newOrders: 0, updatedOrders: 0, apiStatus, error: null };
    }

    const codeToIdMap = new Map<string, string>(
      coupons.map((c) => [c.code.toUpperCase(), c.id])
    );
    const codeToAffiliateIdMap = new Map<string, string>(
      coupons.filter((c) => c.affiliate_id).map((c) => [c.code.toUpperCase(), c.affiliate_id!])
    );

    // Identificar e cadastrar cupons usados nas compras que ainda não existem
    const missingCodes: string[] = [];
    for (const order of orders) {
      for (const code of order.discountCodes) {
        const clean = code.trim().toUpperCase();
        if (clean && !codeToIdMap.has(clean)) {
          missingCodes.push(clean);
        }
      }
    }

    if (missingCodes.length > 0) {
      const newlyCreated = await this.repo.insertMissingCoupons(missingCodes);
      for (const nc of newlyCreated) {
        codeToIdMap.set(nc.code.toUpperCase(), nc.id);
        if (nc.affiliate_id) {
          codeToAffiliateIdMap.set(nc.code.toUpperCase(), nc.affiliate_id);
        }
      }
    }

    const incomingExternalIds = orders.map((o) => o.externalId);
    const existingIds = await this.getExistingOrderIds(incomingExternalIds, source);

    const uniqueCustomers = new Map<
      string,
      { external_customer_id: string; email: string | null; first_name: string | null; last_name: string | null; source: OrderSource }
    >();

    orders.forEach((o) => {
      if (o.customer) {
        uniqueCustomers.set(o.customer.externalId, {
          external_customer_id: o.customer.externalId,
          email: o.customer.email,
          first_name: o.customer.firstName,
          last_name: o.customer.lastName,
          source,
        });
      }
    });

    const customersToUpsert = Array.from(uniqueCustomers.values());
    const { rows: customerRows, error: customerError } = await this.repo.upsertCustomers(customersToUpsert, source);

    if (customerError) {
      console.error("[OrderSync] Erro ao sincronizar customers:", customerError);
    }

    const externalCustomerIdToDbIdMap = new Map<string, string>(
      (customerRows || []).map((c) => [c.external_customer_id, c.id])
    );

    const ordersToUpsert = this.mapNormalizedOrders(orders, codeToIdMap, codeToAffiliateIdMap, externalCustomerIdToDbIdMap);
    const { rows, error: ordersError } = await this.repo.upsertOrders(ordersToUpsert, source);

    if (ordersError) {
      await this.repo.updateSyncState(apiStatus, source, syncedByUserId, false);
      return { newOrders: 0, updatedOrders: 0, apiStatus, error: ordersError };
    }

    const newOrders = rows.filter((r) => !existingIds.has(r.external_order_id)).length;
    const updatedOrders = rows.filter((r) => existingIds.has(r.external_order_id)).length;

    const externalIdToDbIdMap = new Map<string, string>(
      rows.map((r) => [r.external_order_id, r.id])
    );

    const lineItems = this.mapLineItems(orders, externalIdToDbIdMap);
    const { error: itemsError } = await this.repo.upsertOrderItems(lineItems);

    if (itemsError) {
      console.error("[OrderSync] Erro ao salvar order_items:", itemsError);
    }

    await this.repo.updateSyncState(apiStatus, source, syncedByUserId, apiStatus === "success" && !itemsError);

    return { newOrders, updatedOrders, apiStatus, error: itemsError };
  }

  // 3. Sync de uma loja individual

  private async syncStore(
    store: IStoreService,
    role: "admin" | "affiliate",
    coupons: Coupon[],
    syncedByUserId?: string
  ): Promise<StoreSyncResult> {
    const { orders, apiStatus } = await this.fetchOrdersFromStore(store, role, coupons);
    const source = store.source;

    console.log(`[Sync][${role}][${source}] ${orders.length} orders fetched`);

    const result = await this.populateOrders(orders, coupons, apiStatus, source, syncedByUserId);

    console.log(`[Sync][${role}][${source}] newOrders: ${result.newOrders} | updatedOrders: ${result.updatedOrders} | error: ${result.error}`);

    return result;
  }

  // 4. Sync (admin ou afiliado) — sequencial: Shopify -> Nuvemshop

  async syncAndGetDashboardData(
    role: "admin" | "affiliate",
    userId: string,
    affiliateId?: string
  ): Promise<DashboardData> {
    const coupons =
      role === "affiliate" && affiliateId
        ? await this.repo.getCouponsByAffiliateId(affiliateId)
        : await this.repo.getAllCoupons();

    let shopifyResult: StoreSyncResult | null = null;
    if (isShopifyActive()) {
      shopifyResult = await this.syncStore(new ShopifyService(), role, coupons, userId);
    } else {
      console.log("[StoreRouter] Shopify sunset passado — ignorando Shopify.");
    }

    const nuvemshopResult = await this.syncStore(new NuvemshopService(), role, coupons, userId);

    const syncResult: DashboardSyncResult = {
      shopify: shopifyResult,
      nuvemshop: nuvemshopResult,
    };

    return this.buildDashboardData(role, affiliateId, syncResult);
  }

  // 5. Full Sync (admin only)

  async fullSyncAndGetDashboardData(userId: string): Promise<DashboardData> {
    return this.syncAndGetDashboardData("admin", userId, undefined);
  }

  // 6. Dashboard data (sem sync)

  async getDashboardData(role: "admin" | "affiliate", affiliateId?: string): Promise<DashboardData> {
    return this.buildDashboardData(role, affiliateId, null);
  }

  // Helpers internos

  private async buildDashboardData(
    role: "admin" | "affiliate",
    affiliateId: string | undefined,
    syncResult: DashboardData["syncResult"]
  ): Promise<DashboardData> {
    const [shopifyState, nuvemshopState] = await Promise.all([
      this.repo.getSyncState("shopify"),
      this.repo.getSyncState("nuvemshop"),
    ]);

    const dates = [shopifyState?.last_synced_at, nuvemshopState?.last_synced_at]
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime());

    const lastSyncedAt = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

    const affiliateRows = role === "affiliate" ? await this.repo.getAffiliateById(affiliateId!) : [];
    const affiliateDataStartDate =
      role === "affiliate" ? getAffiliateDataStartDate(affiliateRows[0]?.created_at) : null;

    const [orders, coupons, affiliates] =
      role === "admin"
        ? await Promise.all([this.repo.getAllOrders(), this.repo.getAllCoupons(), this.repo.getAllAffiliates()])
        : await Promise.all([
            this.repo.getOrdersByCouponAffiliateId(affiliateId!, affiliateDataStartDate ?? undefined),
            this.repo.getCouponsByAffiliateId(affiliateId!),
            Promise.resolve(affiliateRows),
          ]);

    const activeCoupons = coupons.filter((c) => c.active).length;

    const affMetaMap = new Map<string, { commissionRate: number; createdAtMs: number | null }>(
      affiliates.map((a) => {
        const affiliateStartDate = getAffiliateDataStartDate(a.created_at);
        const createdAtMs = affiliateStartDate ? new Date(affiliateStartDate).getTime() : Number.NaN;
        return [a.id, { commissionRate: a.commission_rate ?? 0, createdAtMs: Number.isNaN(createdAtMs) ? null : createdAtMs }];
      })
    );

    const couponAffiliateMap = new Map<string, string>(
      coupons.filter((c) => c.affiliate_id).map((c) => [c.id, c.affiliate_id!])
    );

    const calcComm = (o: Orders) => {
      const affId = o.affiliate_id ?? (o.coupon_id ? couponAffiliateMap.get(o.coupon_id) : undefined);
      if (!affId) return 0;
      const affiliateMeta = affMetaMap.get(affId);
      if (!affiliateMeta) return 0;
      if (affiliateMeta.commissionRate <= 0) return 0;

      const orderCreatedAtMs = new Date(o.created_at).getTime();
      if (Number.isNaN(orderCreatedAtMs)) return 0;
      if (affiliateMeta.createdAtMs !== null && orderCreatedAtMs < affiliateMeta.createdAtMs) return 0;

      const base = o.total_amount - (o.total_discounts ?? 0) - (o.shipping_cost ?? 0);
      if (base <= 0) return 0;
      return base * (affiliateMeta.commissionRate / 100);
    };

    const paidOrders = orders.filter((o) => o.financial_status === "paid");

    const totalCommissions = paidOrders.reduce((acc, o) => acc + calcComm(o), 0);
    const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.total_amount - (o.shipping_cost ?? 0)), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPaid = paidOrders.filter((o) => new Date(o.created_at) >= startOfMonth);
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
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
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
    const dayNames = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const recentOrders = paidOrders.filter((o) => new Date(o.created_at) >= cutoff);
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
