"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/src/components/ui/Card";
import { Table, Column } from "@/src/components/ui/Table";
import { Select, SelectOption } from "@/src/components/ui/Select";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Modal } from "@/src/components/ui/Modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBoxOpen, faCalendarAlt, faClockRotateLeft, faMoneyBillWave, faChartLine } from "@fortawesome/free-solid-svg-icons";

interface SaleItem {
  product_name: string;
  quantity: number;
}

interface Sale {
  id: string;
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
  const [page, setPage] = useState(1);

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
      render: (item) => (
        <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
          #DX-{item.id.substring(0, 6)}
        </span>
      )
    },
    {
      key: "items",
      header: "Produto(s)",
      sortable: false,
      render: (item) => {
        const totalItems = item.items.reduce((acc, i) => acc + i.quantity, 0);
        if (totalItems === 0) return <span style={{ color: "var(--text-muted)" }}>Nenhum item</span>;

        const firstProduct = item.items[0].product_name;
        if (totalItems === 1) return firstProduct;

        return (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {firstProduct}
            <span style={{
              fontSize: "11px",
              padding: "2px 6px",
              background: "var(--hover)",
              borderRadius: "4px",
              color: "var(--text-muted)"
            }}>
              +{totalItems - 1} item(s)
            </span>
          </span>
        );
      }
    },
    {
      key: "commission",
      header: "Seu Ganho",
      sortable: true,
      render: (item) => (
        <span style={{
          fontWeight: "bold",
          color: item.isLiberated ? "var(--success-text, #2e7d32)" : "var(--warning-text, #ed6c02)",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.commission)}
          {!item.isLiberated && (
            <span title="Saldo a liberar (em garantia)" style={{ fontSize: "12px", color: "var(--warning-text, #ed6c02)" }}>
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
      {/* HEADER DE RESUMO */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px"
      }}>
        {/* Card: Ganhos Acumulados */}
        <Card style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "rgba(33, 150, 243, 0.1)", color: "#2196f3",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
          }}>
            <FontAwesomeIcon icon={faMoneyBillWave} />
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>Ganhos Acumulados</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-main)", marginTop: "4px" }}>
              {loading ? (
                <Skeleton width="120px" height="34px" />
              ) : (
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalCommissions)
              )}
            </div>
          </div>
        </Card>

        {/* Card: Saldo a Liberar */}
        <Card style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "rgba(237, 108, 2, 0.1)", color: "#ed6c02",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
          }}>
            <FontAwesomeIcon icon={faClockRotateLeft} />
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>Saldo a Liberar</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-main)", marginTop: "4px" }}>
              {loading ? (
                <Skeleton width="120px" height="34px" />
              ) : (
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.pendingCommissions)
              )}
            </div>
          </div>
        </Card>

        {/* Card: Total de Indicações */}
        <Card style={{ padding: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "rgba(156, 39, 176, 0.1)", color: "#9c27b0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
          }}>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>Total de Indicações</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-main)", marginTop: "4px" }}>
              {loading ? (
                <Skeleton width="60px" height="34px" />
              ) : (
                stats.totalConversions
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* FILTROS E TABELA */}
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "24px", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 300px" }}>
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

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", flex: "1 1 300px" }}>
            <div style={{ flex: 1 }}>
              <label className="input-label" style={{ display: "block", marginBottom: "8px" }}>Data Inicial</label>
              <div className="input-field-container">
                <div className="input-field" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FontAwesomeIcon icon={faCalendarAlt} style={{ color: "var(--input-icon)" }} />
                  <input
                    type="date"
                    style={{ border: "none", background: "transparent", outline: "none", color: "var(--text-main)", flex: 1 }}
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label className="input-label" style={{ display: "block", marginBottom: "8px" }}>Data Final</label>
              <div className="input-field-container">
                <div className="input-field" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FontAwesomeIcon icon={faCalendarAlt} style={{ color: "var(--input-icon)" }} />
                  <input
                    type="date"
                    style={{ border: "none", background: "transparent", outline: "none", color: "var(--text-main)", flex: 1 }}
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Table
          data={filteredSales}
          columns={columns}
          loading={loading}
          page={page}
          limit={10}
          onPageChange={setPage}
          onRowClick={handleRowClick}
        />
      </Card>

      {/* MODAL DE DETALHES DO PEDIDO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detalhes do Pedido"
        size="md"
      >
        {selectedSale && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "16px", background: "var(--hover)", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "var(--text-muted)" }}>ID do Pedido</p>
              <p style={{ margin: 0, fontWeight: 600 }}>#DX-{selectedSale.id}</p>
            </div>

            <h4 style={{ margin: "8px 0 0 0", fontSize: "16px" }}>Itens Comprados</h4>
            <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
              {selectedSale.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: idx < selectedSale.items.length - 1 ? "1px solid var(--border)" : "none",
                    background: "var(--card-bg)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "8px",
                      background: "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <FontAwesomeIcon icon={faBoxOpen} style={{ color: "var(--text-muted)" }} />
                    </div>
                    <span style={{ fontWeight: 500, fontSize: "15px" }}>{item.product_name}</span>
                  </div>
                  <div style={{
                    background: "var(--pink-light)", color: "var(--card-bg)",
                    padding: "4px 10px", borderRadius: "100px", fontSize: "13px", fontWeight: "bold"
                  }}>
                    {item.quantity}x
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
