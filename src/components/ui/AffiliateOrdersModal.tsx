"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
  external_order_id: string;
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
  const [resolvedPeriodStart, setResolvedPeriodStart] = useState<string | null>(
    null,
  );
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
      const result = await (res.headers
        .get("content-type")
        ?.includes("application/json")
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="stat-tile">
            <p className="stat-tile-label">Pedidos no período</p>
            <div className="stat-tile-value">
              {loading ? (
                <Skeleton width="40px" height="24px" />
              ) : (
                orders.length
              )}
            </div>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-label">Taxa de Comissão</p>
            <div className="stat-tile-value">
              {loading ? (
                <Skeleton width="40px" height="24px" />
              ) : (
                `${commissionRate}%`
              )}
            </div>
          </div>
          <div className="stat-tile stat-tile--success">
            <p className="stat-tile-label">Total Comissão</p>
            <div className="stat-tile-value">
              {loading ? (
                <Skeleton width="80px" height="24px" />
              ) : (
                formatCurrency(totalCommission)
              )}
            </div>
          </div>
        </div>

        {(resolvedPeriodStart || periodEndProp) && (
          <p className="text-xs text-muted">
            Período:{" "}
            {resolvedPeriodStart && (
              <>
                <strong>{formatDate(resolvedPeriodStart)}</strong>{" "}
              </>
            )}
            {resolvedPeriodStart && periodEndProp && "→ "}
            {periodEndProp && <strong>{formatDate(periodEndProp)}</strong>}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton height="64px" />
            <Skeleton height="64px" />
            <Skeleton height="64px" />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-dashed empty-state">
            <FontAwesomeIcon icon={faBoxOpen} />
            <p>Nenhum pedido pago encontrado para este afiliado.</p>
          </div>
        ) : (
          <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto pr-0.5">
            {orders.map((order) => {
              const expanded = expandedIds.has(order.id);
              return (
                <div key={order.id} className="expand-row">
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    className="expand-row-header"
                    aria-expanded={expanded}
                  >
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="expand-row-chevron w-3 shrink-0 text-xs text-muted"
                    />
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <span className="text-sm font-bold text-main">
                        Pedido #{order.external_order_id}
                      </span>
                      {order.coupon_code && (
                        <span className="coupon-chip px-2 py-0.5 text-[11px] text-brand">
                          <FontAwesomeIcon icon={faTag} />
                          {order.coupon_code}
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-6 text-right">
                      <div>
                        <p className="text-[11px] text-muted">Total pedido</p>
                        <p className="text-sm font-semibold text-main">
                          {formatCurrency(order.total_amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted">Comissão</p>
                        <p className="text-sm font-bold text-success">
                          {formatCurrency(order.commission)}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div
                    className="expand-row-collapse"
                    data-open={expanded}
                    inert={!expanded}
                  >
                    <div>
                      <div className="expand-row-body">
                        <div className="mb-3 grid grid-cols-2 gap-2 border-b border-line py-3 sm:grid-cols-5">
                          <div className="stat-tile stat-tile--compact">
                            <p className="stat-tile-label">
                              <FontAwesomeIcon icon={faReceipt} /> Subtotal
                            </p>
                            <p className="stat-tile-value">
                              {formatCurrency(order.total_amount)}
                            </p>
                          </div>
                          <div className="stat-tile stat-tile--compact stat-tile--info">
                            <p className="stat-tile-label">
                              <FontAwesomeIcon icon={faTruck} /> Frete
                            </p>
                            <p className="stat-tile-value">
                              −{formatCurrency(order.shipping_cost)}
                            </p>
                          </div>
                          <div className="stat-tile stat-tile--compact stat-tile--warning">
                            <p className="stat-tile-label">
                              <FontAwesomeIcon icon={faTag} /> Desconto
                            </p>
                            <p className="stat-tile-value">
                              −{formatCurrency(order.total_discounts)}
                            </p>
                          </div>
                          <div className="stat-tile stat-tile--compact stat-tile--commission">
                            <p className="stat-tile-label">
                              <FontAwesomeIcon icon={faCoins} /> BCC
                            </p>
                            <p className="stat-tile-value">
                              {formatCurrency(order.bcc)}
                            </p>
                          </div>
                          <div className="stat-tile stat-tile--compact stat-tile--success">
                            <p className="stat-tile-label">
                              <FontAwesomeIcon icon={faPercent} />{" "}
                              {commissionRate}%
                            </p>
                            <p className="stat-tile-value">
                              {formatCurrency(order.commission)}
                            </p>
                          </div>
                        </div>

                        <div className="mini-table-wrap">
                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th>Produto</th>
                                <th className="center">Qtd</th>
                                <th className="num">Preço unit.</th>
                                <th className="num">Comissão</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="font-semibold">
                                    {item.product_name}
                                  </td>
                                  <td className="center">
                                    <span className="qty-pill">
                                      {item.quantity}
                                    </span>
                                  </td>
                                  <td className="num font-medium text-muted">
                                    {item.unit_price != null
                                      ? formatCurrency(item.unit_price)
                                      : "—"}
                                  </td>
                                  <td className="num font-bold">
                                    {item.item_commission != null
                                      ? formatCurrency(item.item_commission)
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {order.items.length > 1 && (
                              <tfoot>
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="text-right text-xs uppercase tracking-wide"
                                  >
                                    Total comissão do pedido
                                  </td>
                                  <td className="num border-l border-line text-sm font-extrabold">
                                    {formatCurrency(order.commission)}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
