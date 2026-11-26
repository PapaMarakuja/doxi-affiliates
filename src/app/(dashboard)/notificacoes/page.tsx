"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faArrowUpRightFromSquare,
  faBoxOpen,
  faChevronRight,
  faEnvelopeCircleCheck,
  faSearch,
  faShirt,
} from "@fortawesome/free-solid-svg-icons";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Badge } from "@/src/components/ui/Badge";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { MetricCard } from "@/src/components/ui/MetricCard";
import {
  SegmentedControl,
  SegmentedOption,
} from "@/src/components/ui/SegmentedControl";
import { useToast } from "@/src/contexts/ToastContext";
import { formatDate, formatNumber, getErrorMessage } from "@/src/lib/utils";
import type {
  RestockProductSummary,
  RestockSubscriptionsOverview,
} from "@/src/types/restockSubscription";

type StatusFilter = "all" | "pending" | "notified";

const STATUS_OPTIONS: SegmentedOption<StatusFilter>[] = [
  { value: "pending", label: "Ativas" },
  { value: "notified", label: "Notificadas" },
  { value: "all", label: "Todas" },
];

/** Count shown for a product/variant according to the status filter. */
const countFor = (
  item: { total: number; pending: number; notified: number },
  filter: StatusFilter,
) => (filter === "all" ? item.total : item[filter]);

export default function NotificacoesPage() {
  const [data, setData] = useState<RestockSubscriptionsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/restock-subscriptions");
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error);
      setData(result.data);
    } catch (err) {
      addToast({
        message: getErrorMessage(err, "Erro ao carregar notificações"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const products = useMemo<RestockProductSummary[]>(() => {
    const term = search.trim().toLowerCase();
    return (data?.products ?? []).filter(
      (p) =>
        countFor(p, statusFilter) > 0 &&
        (!term ||
          String(p.product_id).includes(term) ||
          !!p.name?.toLowerCase().includes(term)),
    );
  }, [data, search, statusFilter]);

  const waitingProducts =
    data?.products.filter((p) => p.pending > 0).length ?? 0;
  const statusLabel = STATUS_OPTIONS.find(
    (o) => o.value === statusFilter,
  )?.label;

  const toggleExpand = (productId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="page-title">Notificações de Estoque</h2>
        <p className="page-subtitle">
          Clientes que pediram “Avise-me quando chegar”, agrupados por produto e
          tamanho.
        </p>
      </div>

      <div className="metric-grid">
        <MetricCard
          icon={faBell}
          tone="pink"
          label="Inscrições ativas"
          loading={loading}
          value={formatNumber(data?.pending ?? 0)}
        />
        <MetricCard
          icon={faBoxOpen}
          tone="blue"
          label="Produtos aguardando"
          loading={loading}
          value={formatNumber(waitingProducts)}
        />
        <MetricCard
          icon={faEnvelopeCircleCheck}
          tone="green"
          label="Já notificados"
          loading={loading}
          value={formatNumber(data?.notified ?? 0)}
        />
      </div>

      <Card className="p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-[240px] flex-1 [&_.input-field-container]:mb-0">
            <Input
              placeholder="Buscar por nome ou ID do produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<FontAwesomeIcon icon={faSearch} />}
            />
          </div>
          <div className="w-full sm:w-[360px] [&_.input-field-container]:mb-0">
            <SegmentedControl<StatusFilter>
              label="Status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton height="64px" />
            <Skeleton height="64px" />
            <Skeleton height="64px" />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-dashed empty-state">
            <FontAwesomeIcon icon={faBell} />
            <p>Nenhuma inscrição encontrada para este filtro.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((product) => {
              const expanded = expandedIds.has(product.product_id);
              const variants = product.variants.filter(
                (v) => countFor(v, statusFilter) > 0,
              );

              return (
                <div key={product.product_id} className="expand-row">
                  <button
                    type="button"
                    className="expand-row-header"
                    onClick={() => toggleExpand(product.product_id)}
                    aria-expanded={expanded}
                  >
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="expand-row-chevron w-3 shrink-0 text-xs text-muted"
                    />
                    <div className="icon-tile icon-tile--sm">
                      <FontAwesomeIcon icon={faShirt} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-main">
                        {product.name ?? `Produto #${product.product_id}`}
                      </p>
                      {product.name && (
                        <p className="font-mono text-[11px] text-muted">
                          #{product.product_id}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {variants.map((v) => (
                          <Badge
                            key={v.variant_id}
                            tone="brand"
                            className="text-[11px]"
                          >
                            {v.variant_label} · {countFor(v, statusFilter)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-muted">{statusLabel}</p>
                      <p className="text-xl font-extrabold text-brand">
                        {countFor(product, statusFilter)}
                      </p>
                    </div>
                  </button>

                  <div
                    className="expand-row-collapse"
                    data-open={expanded}
                    inert={!expanded}
                  >
                    <div>
                      <div className="expand-row-body pt-3">
                        <div className="mini-table-wrap">
                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th>Tamanho</th>
                                <th>ID da variante</th>
                                <th className="num">Aguardando</th>
                                <th className="num">Notificados</th>
                                <th className="num">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {product.variants.map((v) => (
                                <tr key={v.variant_id}>
                                  <td className="font-semibold">
                                    {v.variant_label}
                                  </td>
                                  <td className="font-mono text-xs text-muted">
                                    {v.variant_id}
                                  </td>
                                  <td className="num font-bold text-warning">
                                    {v.pending}
                                  </td>
                                  <td className="num font-bold text-success">
                                    {v.notified}
                                  </td>
                                  <td className="num font-bold">{v.total}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                          <span>
                            Última inscrição:{" "}
                            {formatDate(product.last_subscribed_at, true)}
                          </span>
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline"
                            >
                              Ver na loja
                              <FontAwesomeIcon
                                icon={faArrowUpRightFromSquare}
                                className="text-[10px]"
                              />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
