import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function returnRole(role: "admin" | "affiliate") {
  return role === "admin" ? "Administrador" : "Afiliado";
}

export function getAffiliateDataStartDate(affiliateCreatedAt: string | null | undefined): string | null {
  if (!affiliateCreatedAt) return null;
  const createdAt = new Date(affiliateCreatedAt);
  if (Number.isNaN(createdAt.getTime())) return null;

  const startOfMonth = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
  return startOfMonth.toISOString();
}
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

export function formatDate(date: string | Date, includeTime: boolean = false) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: includeTime ? 'short' : undefined
  }).format(d);
}

export interface OrderForCommission {
  total_amount: number;
  shipping_cost: number;
}

/**
 * Calcula a comissão de uma ordem baseada no BCC (Base de Cálculo de Comissão).
 * BCC = total_amount - shipping_cost
 * total_amount já vem líquido do desconto (Shopify current_total_price / Nuvemshop total): NÃO subtrair total_discounts de novo.
 * Comissão = BCC * (rate / 100)
 */
export function calculateOrderCommission(order: OrderForCommission, rate: number): number {
  const bcc = order.total_amount - (order.shipping_cost || 0);
  if (bcc <= 0 || rate <= 0) return 0;
  return bcc * (rate / 100);
}

export async function copyToClipboard(text: string, onSuccess?: () => void, onError?: (err: unknown) => void) {
  try {
    await navigator.clipboard.writeText(text);
    if (onSuccess) onSuccess();
  } catch (err) {
    console.error("[copyToClipboard] error copying text:", err);
    if (onError) onError(err);
  }
}

export function scrollToElement(target: Element | null | undefined, options?: ScrollIntoViewOptions): void {
  if (!target) return;
  try {
    target.scrollIntoView({
      behavior: options?.behavior ?? "smooth",
      block: options?.block ?? "start",
      inline: options?.inline ?? "nearest",
    });
  } catch {
    target.scrollIntoView();
  }
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Display name of an order item: linked product name (or legacy snapshot) + variant, e.g. "Pijama X (M)". */
export function getOrderItemName(item: {
  product_name: string | null;
  variant_label: string | null;
  products: { name: string } | null;
}): string {
  const name = item.products?.name ?? item.product_name ?? "Produto removido";
  return item.variant_label ? `${name} (${item.variant_label})` : name;
}
