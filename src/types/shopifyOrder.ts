export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: string;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string; // Shopify retorna como string
}

export interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  financial_status: string;
  current_total_price: string;
  total_discounts: string;
  currency: string;
  discount_codes: ShopifyDiscountCode[];
  line_items: ShopifyLineItem[];
  total_shipping_price_set: {
    shop_money: { amount: string; currency_code: string };
  };
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}