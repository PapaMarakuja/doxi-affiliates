"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faBoxOpen,
  faTag,
  faReceipt,
  faTruck,
  faPercent,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import { formatCurrency, formatDate } from "@/src/lib/utils";

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number | null;
  item_commission: number | null;
}

interface AffiliateOrder {
  id: string;
  shopify_order_id: string;
  created_at: string;
  financial_status: string;
  total_amount: number;
  total_discounts: number;
  shipping_cost: number;
  coupon_code: string | null;
  bcc: number;
  commission: number;
  items: OrderItem[];
}

interface AffiliateOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateId: string;
  affiliateName?: string;
  /** ISO string — início do período a exibir (ex: último payout pago). Se omitido, usa início do cadastro. */
  periodStart?: string | null;
  /** ISO string — fim do período a exibir. Se omitido, usa agora. */
  periodEnd?: string | null;
}

export function AffiliateOrdersModal({
  isOpen,
  onClose,
  affiliateId,
  affiliateName,
  periodStart: periodStartProp,
  periodEnd: periodEndProp,
}: AffiliateOrdersModalProps) {
  const [orders, setOrders] = useState<AffiliateOrder[]>([]);
  const [commissionRate, setCommissionRate] = useState(0);
  const [resolvedPeriodStart, setResolvedPeriodStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!affiliateId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodStartProp) params.set("from", periodStartProp);
      if (periodEndProp) params.set("to", periodEndProp);

      const url = `/api/admin/affiliates/${affiliateId}/orders${params.size > 0 ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const result = await (res.headers.get("content-type")?.includes("application/json")
        ? res.json()
        : null);
      if (res.ok) {
        setOrders(result?.data?.orders || []);
        setCommissionRate(result?.data?.commission_rate || 0);
        setResolvedPeriodStart(result?.data?.period_start || null);
      }
    } catch (err) {
      console.error("[AffiliateOrdersModal] fetchOrders error:", err);
    } finally {
      setLoading(false);
    }
  }, [affiliateId, periodStartProp, periodEndProp]);

  useEffect(() => {
    if (isOpen) {
      setExpandedIds(new Set());
      fetchOrders();
    }
  }, [isOpen, fetchOrders]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalCommission = orders.reduce((sum, o) => sum + o.commission, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={affiliateName ? `Vendas — ${affiliateName}` : "Vendas do Período"}
      size="lg"
      id="affiliate-orders-modal"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Header Info */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
        }}>
          <div style={{ padding: "14px 16px", background: "var(--card-bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Pedidos no período</p>
            <div style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
              {loading ? <Skeleton width="40px" height="24px" /> : orders.length}
            </div>
          </div>
          <div style={{ padding: "14px 16px", background: "var(--card-bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Taxa de Comissão</p>
            <div style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
              {loading ? <Skeleton width="40px" height="24px" /> : `${commissionRate}%`}
            </div>
          </div>
          <div style={{ padding: "14px 16px", background: "rgba(34,197,94,0.10)", borderRadius: "10px", border: "1px solid var(--success)" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--success)", marginBottom: "4px" }}>Total Comissão</p>
            <div style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--success)" }}>
              {loading ? <Skeleton width="80px" height="24px" /> : formatCurrency(totalCommission)}
            </div>
          </div>
        </div>

        {(resolvedPeriodStart || periodEndProp) && (
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
            Período:{" "}
            {resolvedPeriodStart && (
              <><strong>{formatDate(resolvedPeriodStart)}</strong>{" "}</>
            )}
            {resolvedPeriodStart && periodEndProp && "→ "}
            {periodEndProp && (
              <strong>{formatDate(periodEndProp)}</strong>
            )}
          </p>
        )}

        {/* Orders List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Skeleton height="64px" />
            <Skeleton height="64px" />
            <Skeleton height="64px" />
          </div>
        ) : orders.length === 0 ? (
          <div style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text-muted)",
            background: "var(--card-bg)",
            borderRadius: "12px",
            border: "1px dashed var(--border)",
          }}>
            <FontAwesomeIcon icon={faBoxOpen} style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Nenhum pedido pago encontrado para este afiliado.</p>
          </div>
        ) : (
          <div style={{ overflowY: "auto", maxHeight: "480px", paddingRight: "2px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {orders.map((order) => {
                const expanded = expandedIds.has(order.id);
                return (
                  <div
                    key={order.id}
                    style={{
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "var(--card-bg)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Order Header Row */}
                    <button
                      onClick={() => toggleExpand(order.id)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px 16px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={expanded ? faChevronDown : faChevronRight}
                        style={{ fontSize: "12px", color: "var(--text-muted)", width: "12px", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                          Pedido #{order.shopify_order_id}
                        </span>
                        {order.coupon_code && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            padding: "2px 8px", borderRadius: "6px",
                            background: "var(--hover)", border: "1px dashed var(--pink-dark)",
                            fontSize: "11px", fontWeight: 700, color: "var(--pink-dark)",
                          }}>
                            <FontAwesomeIcon icon={faTag} style={{ fontSize: "9px" }} />
                            {order.coupon_code}
                          </span>
                        )}
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "24px", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>Total pedido</p>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>Comissão</p>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--success-text)" }}>
                            {formatCurrency(order.commission)}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded: items + BCC details */}
                    {expanded && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "0 16px 14px" }}>
                        {/* BCC Grid Details */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          gap: "8px",
                          padding: "12px 0",
                          marginBottom: "12px",
                          borderBottom: "1px solid var(--border)",
                        }}>
                          {/* Subtotal */}
                          <div style={{ padding: "8px 10px", borderRadius: "8px", background: "var(--card-bg)", border: "1px solid var(--border)" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FontAwesomeIcon icon={faReceipt} /> Subtotal
                            </p>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>{formatCurrency(order.total_amount)}</p>
                          </div>
                          {/* Frete */}
                          <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(59,130,246,0.08)", border: "1px solid var(--info)" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "10px", color: "var(--info)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FontAwesomeIcon icon={faTruck} /> Frete
                            </p>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--info)" }}>−{formatCurrency(order.shipping_cost)}</p>
                          </div>
                          {/* Desconto */}
                          <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(245,158,11,0.08)", border: "1px solid var(--warning)" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "10px", color: "var(--warning)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FontAwesomeIcon icon={faTag} /> Desconto
                            </p>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--warning)" }}>−{formatCurrency(order.total_discounts)}</p>
                          </div>
                          {/* BCC */}
                          <div style={{ padding: "8px 10px", borderRadius: "8px", background: "var(--commission-bg)", border: "1px solid var(--commission-color)" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "10px", color: "var(--commission-color)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FontAwesomeIcon icon={faCoins} /> BCC
                            </p>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--commission-color)" }}>{formatCurrency(order.bcc)}</p>
                          </div>
                          {/* Comissão */}
                          <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(34,197,94,0.10)", border: "1px solid var(--success)" }}>
                            <p style={{ margin: "0 0 2px", fontSize: "10px", color: "var(--success)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FontAwesomeIcon icon={faPercent} /> {commissionRate}%
                            </p>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--success)" }}>{formatCurrency(order.commission)}</p>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", background: "var(--hover)" }}>Produto</th>
                                <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700, fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", background: "var(--hover)", width: "1%" }}>Qtd</th>
                                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", background: "var(--hover)", width: "1%" }}>Preço unit.</th>
                                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap", background: "var(--hover)", width: "1%" }}>Comissão</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  style={{
                                    borderTop: "1px solid var(--border)",
                                    background: idx % 2 === 0 ? "var(--card-bg)" : "var(--hover)",
                                  }}
                                >
                                  <td style={{ padding: "10px 12px", color: "var(--text-main)", fontWeight: 600 }}>{item.product_name}</td>
                                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                    <span style={{ display: "inline-block", minWidth: "28px", padding: "2px 8px", borderRadius: "6px", background: "var(--hover)", border: "1px solid var(--border)", fontWeight: 700, fontSize: "12px", color: "var(--text-main)" }}>
                                      {item.quantity}
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-muted)", fontWeight: 500 }}>
                                    {item.unit_price != null ? formatCurrency(item.unit_price) : "\u2014"}
                                  </td>
                                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                    <span style={{ fontWeight: 700, fontSize: "13px" }}>
                                      {item.item_commission != null ? formatCurrency(item.item_commission) : "\u2014"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {order.items.length > 1 && (
                              <tfoot>
                                <tr style={{ borderTop: "2px solid var(--border)", background: "rgba(34,197,94,0.10)" }}>
                                  <td colSpan={3} style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 700, color: "var(--success)", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Total comissão do pedido
                                  </td>
                                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, fontSize: "14px", color: "var(--success)", borderLeft: "1px solid var(--border)" }}>
                                    {formatCurrency(order.commission)}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
