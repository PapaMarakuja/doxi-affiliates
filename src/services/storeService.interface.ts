import type { Coupon, OrderSource } from "@/src/types";

/**
 * Contrato que toda integração de e-commerce deve implementar.
 *
 * ShopifyService e NuvemshopService implementam esta interface,
 * permitindo que o OrderSyncService seja agnóstico de plataforma.
 */
export interface IStoreService {
  /** Identifica a plataforma de origem dos pedidos. */
  readonly source: OrderSource;

  /**
   * Busca TODOS os pedidos da loja.
   * Usado pelo admin para ter visão completa das vendas.
   * @param sinceDate - ISO 8601. Se informado, busca apenas pedidos atualizados após essa data.
   */
  getAllOrders(sinceDate?: string): Promise<NormalizedOrder[]>;

  /**
   * Busca pedidos filtrados pelos códigos dos cupons informados.
   * Usado por afiliados — retorna apenas pedidos com seus cupons.
   * @param coupons - Lista de cupons do afiliado.
   * @param sinceDate - ISO 8601. Se informado, aplica filtro de data.
   */
  getOrdersByDiscountCodes(
    coupons: Coupon[],
    sinceDate?: string
  ): Promise<NormalizedOrder[]>;

  /**
   * Busca um único pedido pelo ID externo da plataforma.
   * @param externalOrderId - ID do pedido na plataforma (Shopify ou Nuvemshop).
   */
  getOrderById(externalOrderId: string): Promise<NormalizedOrder | null>;
}

/**
 * Representação normalizada de um pedido, independente da plataforma de origem.
 * Tanto ShopifyService quanto NuvemshopService convertem suas respostas para este formato.
 */
export interface NormalizedOrder {
  /** ID do pedido na plataforma de origem. */
  externalId: string;
  /** Plataforma de origem. */
  source: OrderSource;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  /** Status financeiro normalizado. */
  financialStatus: string;
  totalPrice: string;
  totalDiscounts: string;
  shippingCost: number;
  currency: string;
  /** Código do primeiro cupom aplicado (null se nenhum). */
  firstDiscountCode: string | null;
  /** Todos os códigos de cupom aplicados ao pedido. */
  discountCodes: string[];
  lineItems: NormalizedLineItem[];
  customer: NormalizedCustomer | null;
}

export interface NormalizedLineItem {
  title: string;
  quantity: number;
  price: string;
}

export interface NormalizedCustomer {
  externalId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}
