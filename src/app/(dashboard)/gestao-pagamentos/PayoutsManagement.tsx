"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Table, Column } from "@/src/components/ui/Table";
import { Skeleton } from "@/src/components/ui/Skeleton";
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
} from "@fortawesome/free-solid-svg-icons";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import { Payout, PayoutSummary } from "@/src/types/payout";
import { PayoutCreateModal } from "./PayoutCreateModal";
import { useConfirmDialog } from "@/src/contexts/ConfirmDialogContext";
import { AffiliateOrdersModal } from "@/src/components/ui/AffiliateOrdersModal";
import { BatchPayoutModal } from "@/src/components/ui/BatchPayoutModal";

export function PayoutsManagement() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ordersModalAffiliate, setOrdersModalAffiliate] = useState<{ id: string; name: string } | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const { addToast } = useToast();
  const confirm = useConfirmDialog();

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/admin/payouts?${params.toString()}`);
      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);

      if (res.ok) {
        setPayouts(result?.data || []);
      } else {
        addToast({ message: result?.error || `Erro ${res.status} ao carregar pagamentos`, type: "error" });
      }
    } catch (err: any) {
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
      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);

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
      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);
      if (res.ok) {
        addToast({ message: status === "paid" ? "Pagamento registrado com sucesso" : "Pagamento revertido para pendente", type: "success" });

        // Update local state instead of refetching
        setPayouts(prev => prev.map(p => {
          if (p.id === id) {
            return {
              ...p,
              status,
              paid_at: status === "paid" ? new Date().toISOString() : null
            };
          }
          return p;
        }));

        fetchSummary(); // Summary still needs to be updated
      } else {
        addToast({ message: result?.error || "Erro ao atualizar pagamento", type: "error" });
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
      message: "Tem certeza que deseja excluir este registro de pagamento? Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      type: "danger"
    });

    if (!confirmed) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, { method: "DELETE" });
      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);

      if (res.ok) {
        addToast({ message: "Pagamento excluído com sucesso", type: "success" });
        setPayouts(prev => prev.filter(p => p.id !== id));
        fetchSummary();
      } else {
        addToast({ message: result?.error || "Erro ao excluir pagamento", type: "error" });
      }
    } catch (err) {
      console.error("[PayoutsManagement] handleDeletePayout error:", err);
      addToast({ message: "Erro de conexão ao excluir pagamento", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPayouts = payouts.filter(p =>
    (p as any).affiliates?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.pix_key?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Payout>[] = [
    {
      key: "affiliate",
      header: "Afiliado",
      render: (item: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{item.affiliates?.name || "Desconhecido"}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>PIX: {item.pix_key}</div>
        </div>
      )
    },
    {
      key: "amount",
      header: "Valor",
      sortable: true,
      render: (item) => <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{formatCurrency(item.amount)}</span>
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const styles: Record<string, any> = {
          paid: { bg: "rgba(34,197,94,0.12)", color: "var(--success)", label: "Pago", icon: faCheckCircle },
          pending: { bg: "rgba(245,158,11,0.10)", color: "var(--warning)", label: "Pendente", icon: faClock },
          cancelled: { bg: "rgba(239,68,68,0.10)", color: "var(--error)", label: "Cancelado", icon: faTimesCircle },
        };
        const style = styles[item.status || "pending"];
        return (
          <span style={{
            padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
            background: style.bg, color: style.color, display: "inline-flex", alignItems: "center", gap: "6px"
          }}>
            <FontAwesomeIcon icon={style.icon} style={{ fontSize: "11px" }} />
            {style.label}
          </span>
        );
      }
    },
    {
      key: "created_at",
      header: "Solicitado em",
      sortable: true,
      render: (item) => <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{item.created_at ? formatDate(item.created_at, true) : "-"}</span>
    },
    {
      key: "paid_at",
      header: "Pago em",
      sortable: true,
      render: (item) => <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{item.paid_at ? formatDate(item.paid_at, true) : "-"}</span>
    },
    {
      key: "actions",
      header: "Ações",
      style: { width: "1%" },
      render: (item) => (
        <div className="flex justify-center items-center gap-2">
          {item.status === "pending" ? (
            <Button
              variant="success"
              circle
              loading={actionLoading === item.id}
              style={{
                minHeight: "unset",
                width: "auto",
                fontSize: "12px",
                padding: '0.5rem',
              }}
              onClick={() => handleUpdateStatus(item.id, "paid")}
            >
              {actionLoading !== item.id && <FontAwesomeIcon icon={faDollar} />}
            </Button>
          ) : item.status === "paid" ? (
            <Button
              variant="warning"
              circle
              loading={actionLoading === item.id}
              style={{
                minHeight: "unset",
                width: "auto",
                fontSize: "12px",
                padding: '0.5rem',
              }}
              onClick={() => handleUpdateStatus(item.id, "pending")}
              title="Reverter para pendente"
            >
              {actionLoading !== item.id && <FontAwesomeIcon icon={faUndo} />}
            </Button>
          ) : null}

          <Button
            variant="danger"
            circle
            loading={actionLoading === item.id}
            style={{
              minHeight: "unset",
              width: "auto",
              fontSize: "12px",
              padding: '0.5rem',
            }}
            onClick={() => handleDeletePayout(item.id)}
            title="Excluir pagamento"
          >
            {actionLoading !== item.id && <FontAwesomeIcon icon={faTrash} />}
          </Button>

          <Button
            variant="info"
            circle
            style={{
              minHeight: "unset",
              width: "auto",
              fontSize: "12px",
              padding: '0.5rem',
            }}
            onClick={() => setOrdersModalAffiliate({
              id: (item as any).affiliates?.id || item.affiliate_id || "",
              name: (item as any).affiliates?.name || "Afiliado"
            })}
            title="Ver vendas"
          >
            <FontAwesomeIcon icon={faListAlt} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="page-title">Gestão de Pagamentos</h2>
          <p className="page-subtitle">Acompanhe e realize pagamentos para seus afiliados.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Button onClick={() => setIsBatchModalOpen(true)} style={{ width: "auto" }} variant="info" outline>
            <FontAwesomeIcon icon={faLayerGroup} style={{ marginRight: "8px" }} />
            Gerar Todos
          </Button>
          <Button onClick={() => setIsModalOpen(true)} style={{ width: "auto" }}>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: "8px" }} />
            Gerar Pagamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(34,197,94,0.12)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Total Pago</p>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
              {loadingSummary ? <Skeleton width="100px" height="24px" /> : formatCurrency(summary?.total_paid || 0)}
            </h3>
          </div>
        </Card>

        <Card style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(245,158,11,0.10)", color: "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Pagamentos Pendentes</p>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
              {loadingSummary ? <Skeleton width="100px" height="24px" /> : formatCurrency(summary?.total_pending || 0)}
            </h3>
          </div>
        </Card>

        <Card style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(59,130,246,0.10)", color: "var(--info)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
            <FontAwesomeIcon icon={faHandHoldingDollar} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Total a Pagar (Geral)</p>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
              {loadingSummary ? <Skeleton width="100px" height="24px" /> : formatCurrency(summary?.pending_commission || 0)}
            </h3>
          </div>
        </Card>

        <Card style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(236, 72, 153, 0.1)", color: "var(--pink-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
            <FontAwesomeIcon icon={faMoneyBillWave} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Pagamentos Gerados</p>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
              {loadingSummary ? <Skeleton width="40px" height="24px" /> : payouts.length}
            </h3>
          </div>
        </Card>
      </div>

      <Card style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "12px", flex: 1, minWidth: "300px" }}>
            <Input
              placeholder="Buscar por afiliado ou PIX..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<FontAwesomeIcon icon={faSearch} />}
              style={{ margin: 0 }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>Filtrar Status:</span>
            <div style={{ display: "flex", background: "var(--sidebar-hover)", padding: "4px", borderRadius: "8px", gap: "4px" }}>
              {["", "pending", "paid"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: statusFilter === status ? "var(--card-bg)" : "transparent",
                    color: statusFilter === status ? "var(--text-main)" : "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {status === "" ? "Todos" : status === "pending" ? "Pendentes" : "Pagos"}
                </button>
              ))}
            </div>
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
