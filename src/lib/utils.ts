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
  total_discounts: number;
}

/**
 * Calcula a comissão de uma ordem baseada no BCC (Base de Cálculo de Comissão).
 * BCC = total_amount - shipping_cost - total_discounts
 * Comissão = BCC * (rate / 100)
 */
export function calculateOrderCommission(order: OrderForCommission, rate: number): number {
  const bcc = order.total_amount - (order.shipping_cost || 0) - (order.total_discounts || 0);
  if (bcc <= 0 || rate <= 0) return 0;
  return bcc * (rate / 100);
}
