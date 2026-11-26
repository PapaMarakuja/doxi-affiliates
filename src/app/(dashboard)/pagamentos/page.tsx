"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/src/components/ui/Card";
import { Table, Column } from "@/src/components/ui/Table";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Badge, BadgeTone } from "@/src/components/ui/Badge";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { formatCurrency } from "@/src/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoneyBillTransfer, faSackDollar, faCalendarCheck, faKey, faCalendarDays } from "@fortawesome/free-solid-svg-icons";

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

const getPayoutStatusBadge = (status: string): { label: string; tone: BadgeTone } => {
  if (status === "paid") return { label: "Pago", tone: "success" };
  if (status === "failed" || status === "cancelled") return { label: "Cancelado", tone: "danger" };
  if (status === "processing") return { label: "Processando", tone: "warning" };
  return { label: "Pendente", tone: "neutral" };
};

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
      render: (item) => <span className="font-bold text-main">{formatCurrency(item.amount)}</span>
    },
    {
      key: "pix_key",
      header: "Chave PIX",
      sortable: false,
      render: (item) => <span className="text-muted">{item.pix_key}</span>
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => {
        const badge = getPayoutStatusBadge(item.status);
        return <Badge tone={badge.tone} dot>{badge.label}</Badge>;
      }
    }
  ];

  const lastPaidAt = data?.lastPayout?.paid_at;

  return (
    <div className="flex flex-col gap-8">
      <div className="metric-grid">
        <MetricCard icon={faSackDollar} tone="purple" label="Comissão Total" loading={loading} value={formatCurrency(data?.totalCommissions || 0)} />
        <MetricCard icon={faMoneyBillTransfer} tone="green" label="Comissão a Receber" loading={loading} valueClassName="text-success" value={formatCurrency(data?.availableToWithdraw || 0)} />
        <MetricCard
          icon={faCalendarCheck}
          tone="blue"
          label="Último Pagamento"
          loading={loading}
          value={data?.lastPayout ? formatCurrency(data.lastPayout.amount) : "Nenhum"}
          hint={lastPaidAt ? `Data: ${new Date(lastPaidAt).toLocaleDateString("pt-BR")}` : undefined}
        />
      </div>

      <div className="callout callout--info">
        <FontAwesomeIcon icon={faCalendarDays} />
        <p className="m-0 font-medium">
          <strong>Ciclo de Pagamentos:</strong> Realizamos as transferências no dia 10 de cada mês para a chave PIX cadastrada.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <h3 className="section-title">
            <FontAwesomeIcon icon={faKey} className="text-muted" /> Chave PIX Atual
          </h3>
          <p className="section-desc">
            Esta é a chave PIX onde você receberá suas comissões. Verifique se os dados estão corretos.
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <div className="max-w-[400px] flex-[1_1_300px] [&_.input-field-container]:mb-0">
              {loading ? (
                <Skeleton height="50px" borderRadius="12px" />
              ) : (
                <Input type="text" disabled value={data?.pixKey || "Nenhuma chave cadastrada"} />
              )}
            </div>
            <Button className="w-auto px-6" onClick={() => router.push("/configuracoes")}>
              Alterar
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="section-title mb-5">Histórico de Pagamentos</h3>
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
