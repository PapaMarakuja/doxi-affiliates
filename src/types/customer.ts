export interface Customer {
  id: string;
  shopify_customer_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at?: string;
  updated_at?: string;
}
