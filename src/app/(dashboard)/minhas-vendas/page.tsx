"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/src/components/ui/Card";
import { Table, Column } from "@/src/components/ui/Table";
import { Select, SelectOption } from "@/src/components/ui/Select";
import { Input } from "@/src/components/ui/Input";
import { Modal } from "@/src/components/ui/Modal";
import { Badge, BadgeTone } from "@/src/components/ui/Badge";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { formatCurrency } from "@/src/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faCalendarAlt, faClockRotateLeft, faMoneyBillWave, faChartLine } from "@fortawesome/free-solid-svg-icons";

interface SaleItem {
  product_name: string;
  quantity: number;
}

interface Sale {
  id: string | null;
  created_at: string;
  commission: number;
  status: string;
  isLiberated: boolean;
  items: SaleItem[];
}

interface SalesStats {
  totalCommissions: number;
  pendingCommissions: number;
  totalConversions: number;
}

const getCommissionStatusBadge = (isLiberated: boolean, status: string): { text: string; tone: BadgeTone } => {
  if (status === "refunded") return { text: "Reembolsado", tone: "info" };
  if (status === "voided") return { text: "Cancelado", tone: "danger" };
  if (status !== "paid") return { text: "Aguardando Pagamento", tone: "neutral" };
  if (!isLiberated) return { text: "A Liberar", tone: "warning" };
  return { text: "Liberado", tone: "success" };
};

function CommissionStatusBadge({ sale }: { sale: Sale }) {
  const badge = getCommissionStatusBadge(sale.isLiberated, sale.status);
  return <Badge tone={badge.tone} dot>{badge.text}</Badge>;
}

export default function MinhasVendasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    totalCommissions: 0,
    pendingCommissions: 0,
    totalConversions: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // Paginação tabela
  // Modal de Detalhes
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const { data } = await res.json();
        setSales(data.sales || []);
        setStats(data.stats || {
          totalCommissions: 0,
          pendingCommissions: 0,
          totalConversions: 0,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Opções dinâmicas de produto baseadas nos itens vendidos
  const productOptions = useMemo<SelectOption[]>(() => {
    const products = new Set<string>();
    sales.forEach(s => s.items.forEach(i => products.add(i.product_name)));
    return Array.from(products).map(p => ({ value: p, label: p }));
  }, [sales]);

  // Aplicação de filtros
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Filtro por produto
      if (productFilter) {
        const hasProduct = sale.items.some(i => i.product_name === productFilter);
        if (!hasProduct) return false;
      }

      // Filtro por data
      if (dateStart) {
        if (new Date(sale.created_at) < new Date(dateStart)) return false;
      }
      if (dateEnd) {
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59, 999);
        if (new Date(sale.created_at) > end) return false;
      }

      return true;
    });
  }, [sales, productFilter, dateStart, dateEnd]);

  // Colunas da tabela
  const columns: Column<Sale>[] = [
    {
      key: "created_at",
      header: "Data",
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString("pt-BR")
    },
    {
      key: "id",
      header: "Pedido",
      sortable: true,
      render: (item) => {
        const orderId = item.id ? String(item.id) : "";
        const displayId = orderId ? (orderId.length > 8 ? orderId.substring(0, 6) : orderId) : "------";
        return <span className="font-semibold text-main">#DX-{displayId}</span>;
      }
    },
    {
      key: "items",
      header: "Produto(s)",
      sortable: false,
      render: (item) => {
        const totalItems = item.items.reduce((acc, i) => acc + i.quantity, 0);
        if (totalItems === 0) return <span className="text-muted">Nenhum item</span>;

        const firstProduct = item.items[0].product_name;
        if (totalItems === 1) return firstProduct;

        return (
          <span className="flex items-center gap-1.5">
            {firstProduct}
            <span className="rounded bg-soft px-1.5 py-0.5 text-[11px] text-muted">
              +{totalItems - 1} item(s)
            </span>
          </span>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <CommissionStatusBadge sale={item} />
    },
    {
      key: "commission",
      header: "Seu Ganho",
      sortable: true,
      render: (item) => (
        <span className={`flex items-center gap-1.5 font-bold ${item.isLiberated ? "text-success" : "text-warning"}`}>
          {formatCurrency(item.commission)}
          {!item.isLiberated && (
            <span title="Saldo a liberar (em garantia)" className="text-xs">
              <FontAwesomeIcon icon={faClockRotateLeft} />
            </span>
          )}
        </span>
      )
    }
  ];

  const handleRowClick = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="metric-grid">
        <MetricCard icon={faMoneyBillWave} tone="blue" label="Ganhos Acumulados" loading={loading} value={formatCurrency(stats.totalCommissions)} />
        <MetricCard icon={faClockRotateLeft} tone="amber" label="Saldo a Liberar" loading={loading} value={formatCurrency(stats.pendingCommissions)} />
        <MetricCard icon={faChartLine} tone="purple" label="Total de Indicações" loading={loading} value={stats.totalConversions} />
      </div>

      <Card>
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="flex-[1_1_300px]">
            <Select
              label="Buscar por Produto"
              placeholder="Selecione um produto..."
              icon={<FontAwesomeIcon icon={faBoxOpen} />}
              options={productOptions}
              value={productFilter}
              onChange={(val) => setProductFilter(val as string)}
              clearable={true}
            />
          </div>

          <div className="flex flex-[1_1_300px] flex-wrap gap-4">
            <div className="flex-1">
              <Input
                type="date"
                label="Data Inicial"
                icon={<FontAwesomeIcon icon={faCalendarAlt} />}
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                type="date"
                label="Data Final"
                icon={<FontAwesomeIcon icon={faCalendarAlt} />}
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Table
          key={`${productFilter ?? ""}|${dateStart}|${dateEnd}`}
          data={filteredSales}
          columns={columns}
          loading={loading}
          limit={10}
          onRowClick={handleRowClick}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detalhes do Pedido"
        size="md"
      >
        {selectedSale && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
              <div className="soft-panel">
                <p className="metric-label mb-1">ID do Pedido</p>
                <p className="font-semibold text-main">
                  #DX-{selectedSale.id ? String(selectedSale.id).substring(0, 8) : "------"}
                </p>
              </div>
              <div className="soft-panel">
                <p className="metric-label mb-2">Status da Comissão</p>
                <CommissionStatusBadge sale={selectedSale} />
              </div>
            </div>

            <h4 className="section-title mt-2 text-base">Itens Comprados</h4>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {selectedSale.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="icon-tile icon-tile--sm">
                      <FontAwesomeIcon icon={faBoxOpen} />
                    </div>
                    <span className="text-[15px] font-medium text-main">{item.product_name}</span>
                  </div>
                  <Badge tone="brand">{item.quantity}x</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
