"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Table, Column } from "@/src/components/ui/Table";
import { Badge, BadgeTone } from "@/src/components/ui/Badge";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { SegmentedControl, SegmentedOption } from "@/src/components/ui/SegmentedControl";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faClock,
  faCheckCircle,
  faHandHoldingDollar,
  faSearch,
  faPlus,
  faUndo,
  faTimesCircle,
  faTrash,
  faDollar,
  faListAlt,
  faLayerGroup,
  faCopy,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import { formatCurrency, formatDate, copyToClipboard } from "@/src/lib/utils";
import { Payout, PayoutSummary } from "@/src/types/payout";
import { PayoutCreateModal } from "./PayoutCreateModal";
import { useConfirmDialog } from "@/src/contexts/ConfirmDialogContext";
import { AffiliateOrdersModal } from "@/src/components/ui/AffiliateOrdersModal";
import { BatchPayoutModal } from "@/src/components/ui/BatchPayoutModal";

type PayoutStatus = NonNullable<Payout["status"]>;
type PayoutStatusFilter = "" | "pending" | "paid";

const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: BadgeTone; icon: IconDefinition }> = {
  paid: { label: "Pago", tone: "success", icon: faCheckCircle },
  pending: { label: "Pendente", tone: "warning", icon: faClock },
  cancelled: { label: "Cancelado", tone: "danger", icon: faTimesCircle },
};

const STATUS_FILTER_OPTIONS: SegmentedOption<PayoutStatusFilter>[] = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "paid", label: "Pagos" },
];

const isCopyablePixKey = (pixKey: string | null | undefined) =>
  !!pixKey && !["não cadastrada", "nao cadastrada"].includes(pixKey.toLowerCase());

export function PayoutsManagement() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayoutStatusFilter>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ordersModalAffiliate, setOrdersModalAffiliate] = useState<{
    id: string;
    name: string;
    periodStart: string | null;
    periodEnd: string | null;
  } | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const { addToast } = useToast();
  const confirm = useConfirmDialog();

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/admin/payouts?${params.toString()}`);
      const result = await (res.headers.get("content-type")?.includes("application/json")
        ? res.json()
        : null);

      if (res.ok) {
        setPayouts(result?.data || []);
      } else {
        addToast({
          message: result?.error || `Erro ${res.status} ao carregar pagamentos`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("[PayoutsManagement] fetchPayouts error:", err);
      addToast({ message: "Erro de conexão ao carregar pagamentos", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, addToast]);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/admin/payouts/summary");
      const result = await (res.headers.get("content-type")?.includes("application/json")
        ? res.json()
        : null);

      if (res.ok) {
        setSummary(result?.data);
      }
    } catch (err) {
      console.error("[PayoutsManagement] fetchSummary error:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
    fetchSummary();
  }, [fetchPayouts, fetchSummary]);

  const handleUpdateStatus = async (id: string, status: Payout["status"]) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await (res.headers.get("content-type")?.includes("application/json")
        ? res.json()
        : null);
      if (res.ok) {
        addToast({
          message:
            status === "paid"
              ? "Pagamento registrado com sucesso"
              : "Pagamento revertido para pendente",
          type: "success",
        });

        // Update local state instead of refetching
        setPayouts((prev) =>
          prev.map((p) => {
            if (p.id === id) {
              return {
                ...p,
                status,
                paid_at: status === "paid" ? new Date().toISOString() : null,
              };
            }
            return p;
          })
        );

        fetchSummary(); // Summary still needs to be updated
      } else {
        addToast({
          message: result?.error || "Erro ao atualizar pagamento",
          type: "error",
        });
      }
    } catch (err) {
      console.error("[PayoutsManagement] handleUpdateStatus error:", err);
      addToast({ message: "Erro de conexão ao atualizar pagamento", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePayout = async (id: string) => {
    const confirmed = await confirm({
      title: "Excluir Pagamento",
      message:
        "Tem certeza que deseja excluir este registro de pagamento? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      type: "danger",
    });

    if (!confirmed) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, { method: "DELETE" });
      const result = await (res.headers.get("content-type")?.includes("application/json")
        ? res.json()
        : null);

      if (res.ok) {
        addToast({ message: "Pagamento excluído com sucesso", type: "success" });
        setPayouts((prev) => prev.filter((p) => p.id !== id));
        fetchSummary();
      } else {
        addToast({
          message: result?.error || "Erro ao excluir pagamento",
          type: "error",
        });
      }
    } catch (err) {
      console.error("[PayoutsManagement] handleDeletePayout error:", err);
      addToast({ message: "Erro de conexão ao excluir pagamento", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPayouts = payouts.filter(
    (p) =>
      p.affiliates?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.pix_key?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyPixKey = async (pixKey: string) => {
    if (!isCopyablePixKey(pixKey)) return;
    await copyToClipboard(
      pixKey,
      () => addToast({ message: "Chave PIX copiada com sucesso!", type: "success" }),
      () => addToast({ message: "Erro ao copiar chave PIX", type: "error" })
    );
  };

  const openOrdersModal = (item: Payout) => {
    const affiliateId = item.affiliates?.id || item.affiliate_id || "";

    // periodStart: paid_at do último payout PAGO deste afiliado antes do atual
    const lastPaid = payouts
      .filter((p) => p.affiliate_id === affiliateId && p.status === "paid" && p.id !== item.id)
      .sort(
        (a, b) =>
          new Date(b.paid_at ?? b.created_at ?? 0).getTime() -
          new Date(a.paid_at ?? a.created_at ?? 0).getTime()
      )[0];

    // periodEnd: se o item já foi pago, usa paid_at; se pendente, sem limite
    const periodEnd = item.status === "paid" && item.paid_at ? item.paid_at : null;

    setOrdersModalAffiliate({
      id: affiliateId,
      name: item.affiliates?.name || "Afiliado",
      periodStart: lastPaid?.paid_at ?? lastPaid?.created_at ?? null,
      periodEnd,
    });
  };

  const columns: Column<Payout>[] = [
    {
      key: "affiliate",
      header: "Afiliado",
      render: (item) => (
        <div>
          <div className="font-semibold text-main">{item.affiliates?.name || "Desconhecido"}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            {item.affiliates?.payout_method === "cupom" ? (
              <Badge tone="brand" className="text-[11px]">
                <FontAwesomeIcon icon={faTag} className="text-[10px]" />
                Retirada: Cupom na Loja
              </Badge>
            ) : (
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-xs text-muted"
                title="Copiar chave PIX"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPixKey(item.pix_key);
                }}
              >
                PIX: {item.pix_key}
                {isCopyablePixKey(item.pix_key) && <FontAwesomeIcon icon={faCopy} />}
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      sortable: true,
      render: (item) => <span className="font-semibold text-main">{formatCurrency(item.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const status = PAYOUT_STATUS[item.status || "pending"];
        return (
          <Badge tone={status.tone}>
            <FontAwesomeIcon icon={status.icon} className="text-[11px]" />
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      header: "Solicitado em",
      sortable: true,
      render: (item) => (
        <span className="text-[13px] text-muted">{item.created_at ? formatDate(item.created_at, true) : "-"}</span>
      ),
    },
    {
      key: "paid_at",
      header: "Pago em",
      sortable: true,
      render: (item) => (
        <span className="text-[13px] text-muted">{item.paid_at ? formatDate(item.paid_at, true) : "-"}</span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      style: { width: "1%" },
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          {item.status === "pending" ? (
            <Button
              variant="success"
              circle
              size="sm"
              loading={actionLoading === item.id}
              onClick={() => handleUpdateStatus(item.id, "paid")}
              title="Marcar como pago"
            >
              <FontAwesomeIcon icon={faDollar} />
            </Button>
          ) : item.status === "paid" ? (
            <Button
              variant="warning"
              circle
              size="sm"
              loading={actionLoading === item.id}
              onClick={() => handleUpdateStatus(item.id, "pending")}
              title="Reverter para pendente"
            >
              <FontAwesomeIcon icon={faUndo} />
            </Button>
          ) : null}

          <Button
            variant="danger"
            circle
            size="sm"
            loading={actionLoading === item.id}
            onClick={() => handleDeletePayout(item.id)}
            title="Excluir pagamento"
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>

          <Button variant="info" circle size="sm" onClick={() => openOrdersModal(item)} title="Ver vendas">
            <FontAwesomeIcon icon={faListAlt} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Gestão de Pagamentos</h2>
          <p className="page-subtitle">Acompanhe e realize pagamentos para seus afiliados.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setIsBatchModalOpen(true)} className="w-auto px-6" variant="info" outline>
            <FontAwesomeIcon icon={faLayerGroup} />
            Gerar Todos
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="w-auto px-6">
            <FontAwesomeIcon icon={faPlus} />
            Gerar Pagamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={faCheckCircle} tone="green" label="Total Pago" loading={loadingSummary} value={formatCurrency(summary?.total_paid || 0)} />
        <MetricCard icon={faClock} tone="amber" label="Pagamentos Pendentes" loading={loadingSummary} value={formatCurrency(summary?.total_pending || 0)} />
        <MetricCard icon={faHandHoldingDollar} tone="blue" label="Total a Pagar (Geral)" loading={loadingSummary} value={formatCurrency(summary?.pending_commission || 0)} />
        <MetricCard icon={faMoneyBillWave} tone="pink" label="Pagamentos Gerados" loading={loadingSummary} value={payouts.length} />
      </div>

      <Card className="p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-[280px] flex-1 [&_.input-field-container]:mb-0">
            <Input
              placeholder="Buscar por afiliado ou PIX..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<FontAwesomeIcon icon={faSearch} />}
            />
          </div>

          <div className="w-full sm:w-[320px] [&_.input-field-container]:mb-0">
            <SegmentedControl<PayoutStatusFilter>
              label="Filtrar Status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        <Table data={filteredPayouts} columns={columns} loading={loading} />
      </Card>

      <PayoutCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchPayouts();
          fetchSummary();
        }}
      />

      <AffiliateOrdersModal
        isOpen={!!ordersModalAffiliate}
        onClose={() => setOrdersModalAffiliate(null)}
        affiliateId={ordersModalAffiliate?.id || ""}
        affiliateName={ordersModalAffiliate?.name}
        periodStart={ordersModalAffiliate?.periodStart}
        periodEnd={ordersModalAffiliate?.periodEnd}
      />

      <BatchPayoutModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={() => {
          fetchPayouts();
          fetchSummary();
        }}
      />
    </div>
  );
}
