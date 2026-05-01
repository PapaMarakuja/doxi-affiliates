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
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import { Payout, PayoutSummary } from "@/src/types/payout";
import { PayoutCreateModal } from "./PayoutCreateModal";

export function PayoutsManagement() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

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
          paid: { bg: "var(--success-bg)", color: "var(--success-text)", label: "Pago" },
          pending: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Pendente" },
          cancelled: { bg: "var(--error-bg)", color: "var(--error-text)", label: "Cancelado" },
        };
        const style = styles[item.status || "pending"];
        return (
          <span style={{
            padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
            background: style.bg, color: style.color
          }}>
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
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="page-title">Gestão de Pagamentos</h2>
          <p className="page-subtitle">Acompanhe e realize pagamentos para seus afiliados.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} style={{ width: "auto" }}>
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: "8px" }} />
          Gerar Pagamento
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--success-bg)", color: "var(--success-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
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
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--warning-bg)", color: "var(--warning-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
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
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--info-bg)", color: "var(--info-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
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
    </div>
  );
}
