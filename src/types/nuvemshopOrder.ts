/**
 * Tipos que representam a resposta da API da Nuvemshop.
 * Referência: https://tiendanube.github.io/api-documentation/resources/order
 */

export interface NuvemshopCouponItem {
  id?: number;
  code: string;
  type?: "percentage" | "absolute" | "shipping" | string;
  value?: number | string;
}

export interface NuvemshopLineItem {
  id: number;
  /** Nome com a variante, ex.: "Pijama X (M)". */
  name: string;
  name_without_variants?: string;
  product_id: number | null;
  variant_id: number | null;
  variant_values?: string[];
  image?: { src: string } | null;
  quantity: number;
  /**
   * Preço unitário. A Nuvemshop pode retornar null quando o preço está
   * definido no nível da variante, não do produto raiz.
   */
  price: string | null;
}

/** Campos usados de GET /products (com `fields=id,canonical_url`). */
export interface NuvemshopProductUrl {
  id: number;
  canonical_url: string | null;
}

/** Shape esperado da entidade "Order" na API da Nuvemshop. */
export interface NuvemshopOrder {
  id: number;
  number: number;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  /** Ex: "paid" | "pending" | "voided" | "refunded" */
  payment_status: string;
  /** Valor total do pedido. */
  total: string;
  /** Valor total de descontos. */
  discount: string;
  /** Valor descontado especificamente por cupons. */
  discount_coupon?: string | null;
  /** Custo de envio (parte do lojista). */
  shipping_cost_owner: string;
  currency: string;
  /** Cupons aplicados na compra (a Nuvemshop retorna lista de cupom). */
  coupon?: NuvemshopCouponItem[] | NuvemshopCouponItem | null;
  coupons?: NuvemshopCouponItem[] | NuvemshopCouponItem | null;
  /** Desconto promocional automático. */
  promotional_discount?: {
    id: number | null;
    code: string | null;
    type: "percentage" | "absolute" | null;
    value: number;
  } | null;
  products: NuvemshopLineItem[];
  customer: {
    id: number;
    email: string;
    name: string;
  } | null;
}
