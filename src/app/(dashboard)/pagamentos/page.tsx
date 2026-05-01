"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { Table, Column } from "@/src/components/ui/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoneyBillTransfer, faSackDollar, faCalendarCheck, faKey, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";

interface Payout {
  id: string;
  created_at: string;
  amount: number;
  pix_key: string;
  status: string;
  paid_at: string | null;
}

interface PayoutsData {
  totalCommissions: number;
  pendingCommissions: number;
  availableToWithdraw: number;
  totalPaid: number;
  totalProcessing: number;
  lastPayout: Payout | null;
  pixKey: string;
  payouts: Payout[];
}

export default function PagamentosPage() {
  const router = useRouter();
  const [data, setData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/payouts");
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const columns: Column<Payout>[] = [
    {
      key: "created_at",
      header: "Data",
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString("pt-BR")
    },
    {
      key: "amount",
      header: "Valor",
      sortable: true,
      render: (item) => (
        <span style={{ fontWeight: "bold", color: "var(--text-main)" }}>
          {formatCurrency(item.amount)}
        </span>
      )
    },
    {
      key: "pix_key",
      header: "Chave PIX",
      sortable: false,
      render: (item) => (
        <span style={{ color: "var(--text-muted)" }}>
          {item.pix_key}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => {
        let bg = "var(--hover)";
        let color = "var(--text-muted)";
        let label = "Pendente";

        if (item.status === "paid") {
          bg = "rgba(46, 125, 50, 0.1)";
          color = "#2e7d32";
          label = "Pago";
        } else if (item.status === "failed" || item.status === "cancelled") {
          bg = "rgba(211, 47, 47, 0.1)";
          color = "#d32f2f";
          label = "Cancelado";
        } else if (item.status === "processing") {
          bg = "rgba(237, 108, 2, 0.1)";
          color = "#ed6c02";
          label = "Processando";
        }

        return (
          <span style={{
            background: bg,
            color: color,
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold"
          }}>
            {label}
          </span>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* HEADER DE RESUMO */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px"
      }}>
        {/* Card: Comissão Total */}
        <Card style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "rgba(156, 39, 176, 0.1)", color: "#9c27b0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
          }}>
            <FontAwesomeIcon icon={faSackDollar} />
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>Comissão Total</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-main)", marginTop: "4px" }}>
              {loading ? <Skeleton width="120px" height="34px" /> : formatCurrency(data?.totalCommissions || 0)}
            </div>
          </div>
        </Card>

        {/* Card: Comissão a Receber */}
        <Card style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "rgba(46, 125, 50, 0.1)", color: "#2e7d32",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
          }}>
            <FontAwesomeIcon icon={faMoneyBillTransfer} />
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>Comissão a Receber</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--success-text, #2e7d32)", marginTop: "4px" }}>
              {loading ? <Skeleton width="120px" height="34px" /> : formatCurrency(data?.availableToWithdraw || 0)}
            </div>
          </div>
        </Card>

        {/* Card: Último Pagamento */}
        <Card style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "rgba(33, 150, 243, 0.1)", color: "#2196f3",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
          }}>
            <FontAwesomeIcon icon={faCalendarCheck} />
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>Último Pagamento</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-main)", marginTop: "4px" }}>
              {loading ? <Skeleton width="120px" height="34px" /> : data?.lastPayout ? formatCurrency(data.lastPayout.amount) : "Nenhum"}
            </div>
            {data?.lastPayout?.paid_at && (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Data: {new Date(data.lastPayout.paid_at).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ÁREA DE SAQUE & INSTRUÇÃO */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        {/* Card Informativo de Ciclo de Pagamento */}
        <div style={{
          background: "rgba(33, 150, 243, 0.05)",
          borderLeft: "4px solid #2196f3",
          padding: "16px 20px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: "#2196f3", fontSize: "20px" }} />
          <p style={{ margin: 0, color: "var(--text-main)", fontSize: "15px", fontWeight: 500 }}>
            <span style={{ fontWeight: "bold" }}>📅 Ciclo de Pagamentos:</span> Realizamos as transferências no dia 10 de cada mês para a chave PIX cadastrada.
          </p>
        </div>

        {/* Chave PIX Cadastrada */}
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
              <FontAwesomeIcon icon={faKey} style={{ color: "var(--text-muted)" }} /> Chave PIX Atual
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
              Esta é a chave PIX onde você receberá suas comissões. Verifique se os dados estão corretos.
            </p>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px", maxWidth: "400px" }}>
                <div className="input-field-container" style={{ margin: 0 }}>
                  <div className="input-field disabled" style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--hover)", opacity: 0.8, minHeight: "44px" }}>
                    {loading ? (
                      <Skeleton width="100%" height="20px" />
                    ) : (
                      <input
                        type="text"
                        disabled
                        value={data?.pixKey || "Nenhuma chave cadastrada"}
                        style={{ border: "none", background: "transparent", outline: "none", color: "var(--text-main)", flex: 1, cursor: "not-allowed" }}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Button onClick={() => router.push("/configuracoes")}>
                  Alterar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* TABELA DE HISTÓRICO */}
      <Card>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-main)" }}>Histórico de Pagamentos</h3>
        </div>
        <Table
          data={data?.payouts || []}
          columns={columns}
          loading={loading}
          page={page}
          limit={10}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
