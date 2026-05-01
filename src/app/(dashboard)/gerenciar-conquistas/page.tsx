"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Table, Column } from "@/src/components/ui/Table";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/contexts/ToastContext";
import { useConfirmDialog } from "@/src/contexts/ConfirmDialogContext";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faPlus, faTrophy, faUsers } from "@fortawesome/free-solid-svg-icons";
import { iconMap } from "@/src/lib/achievements/iconMap";
import {
  ACHIEVEMENT_METRIC_LABELS,
  ACHIEVEMENT_METRIC_OPTIONS
} from "@/src/lib/achievements/achievementMappings";

import type { AchievementDefinition } from "@/src/types/achievements";
import { AchievementModal } from "./AchievementModal";
import { AdminAffiliateDetailModal } from "./AdminAffiliateDetailModal";
import { Select } from "@/src/components/ui/Select";

export default function GerenciarConquistasPage() {
  const [activeTab, setActiveTab] = useState<"definitions" | "affiliates">("definitions");

  // State Definitions
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(false);

  // Filter States for Definitions
  const [filterTitle, setFilterTitle] = useState("");
  const [filterDesc, setFilterDesc] = useState("");
  const [filterMetric, setFilterMetric] = useState<string | null>(null);

  // State Affiliates Dashboard
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [affiliateSearch, setAffiliateSearch] = useState("");

  const { addToast } = useToast();
  const confirm = useConfirmDialog();

  // Modal Definition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<Partial<AchievementDefinition> | null>(null);

  // Detail Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);

  const fetchDefinitions = useCallback(async () => {
    setLoadingDefs(true);
    try {
      const res = await fetch("/api/achievements");
      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);
      if (res.ok) {
        setDefinitions(result?.data || []);
      } else {
        addToast({ message: result?.error || `Erro ${res.status} ao carregar conquistas`, type: "error" });
      }
    } catch (err) {
      console.error("[GerenciarConquistas] fetchDefinitions error:", err);
      addToast({ message: "Erro de conexão ao carregar conquistas", type: "error" });
    } finally {
      setLoadingDefs(false);
    }
  }, [addToast]);

  const fetchAffiliateDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch("/api/admin/affiliates-dashboard");
      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);
      if (res.ok) {
        setDashboardData(result?.data || null);
      } else {
        addToast({ message: result?.error || `Erro ${res.status} ao carregar dashboard`, type: "error" });
      }
    } catch (err) {
      console.error("[GerenciarConquistas] fetchAffiliateDashboard error:", err);
      addToast({ message: "Erro de conexão ao carregar dashboard", type: "error" });
    } finally {
      setLoadingDashboard(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === "definitions") fetchDefinitions();
    else if (activeTab === "affiliates") fetchAffiliateDashboard();
  }, [activeTab, fetchDefinitions, fetchAffiliateDashboard]);

  const handleDeleteDef = async (id: string | number) => {
    const confirmed = await confirm({
      title: "Excluir Conquista",
      message: "Tem certeza? Esta ação removerá a conquista.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      type: "danger"
    });

    if (!confirmed) return;
    try {
      const res = await fetch(`/api/achievements/${id}`, { method: "DELETE" });
      if (res.ok) {
        addToast({ message: "Excluída com sucesso!", type: "success" });
        setDefinitions(prev => prev.filter(d => d.id !== id));
      } else {
        throw new Error("Erro ao excluir");
      }
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    }
  };

  const defColumns: Column<AchievementDefinition>[] = [
    { key: "title", header: "Título", sortable: true },
    { key: "description", header: "Descrição", sortable: true },
    {
      key: "metric",
      header: "Métrica",
      sortable: true,
      render: (item) => ACHIEVEMENT_METRIC_LABELS[item.metric] || item.metric
    },
    {
      key: "goal",
      header: "Meta",
      sortable: true,
      render: (item) => {
        const isCurrency = item.metric.includes("commission");
        if (isCurrency) {
          return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.goal);
        }
        return `${item.goal} ${item.goal === 1 ? "venda" : "vendas"}`;
      }
    },
    {
      key: "icon_key",
      header: "Ícone",
      render: (item) => {
        const iconDef = item.icon_key ? iconMap[item.icon_key] : null;
        return iconDef ? <FontAwesomeIcon icon={iconDef} style={{ color: item.color_hex }} /> : "-";
      }
    },
    {
      key: "color_hex",
      header: "Cor",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: item.color_hex || "#ccc", border: "1px solid var(--border)" }} />
          <span style={{ fontFamily: "monospace" }}>{item.color_hex}</span>
        </div>
      )
    },
    {
      key: "actions",
      header: "Ações",
      render: (item) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="info" style={{ padding: "6px", width: "auto" }} onClick={() => {
            setEditingDef(item);
            setIsModalOpen(true);
          }}>
            <FontAwesomeIcon icon={faPen} />
          </Button>
          <Button variant="danger" style={{ padding: "6px", width: "auto" }} onClick={() => handleDeleteDef(item.id)}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      )
    }
  ];

  const filteredDefinitions = useMemo(() => {
    return definitions.filter(def => {
      const matchTitle = !filterTitle || def.title.toLowerCase().includes(filterTitle.toLowerCase());
      const matchDesc = !filterDesc || (def.description && def.description.toLowerCase().includes(filterDesc.toLowerCase()));
      const matchMetric = !filterMetric || def.metric === filterMetric;
      return matchTitle && matchDesc && matchMetric;
    });
  }, [definitions, filterTitle, filterDesc, filterMetric]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const filteredAffiliates = useMemo(() => {
    if (!dashboardData?.affiliates) return [];
    if (!affiliateSearch.trim()) return dashboardData.affiliates;
    const lower = affiliateSearch.toLowerCase();
    return dashboardData.affiliates.filter((a: any) => a.name?.toLowerCase().includes(lower));
  }, [dashboardData, affiliateSearch]);

  const dashboardColumns: Column<any>[] = [
    {
      key: "affiliate",
      header: "Afiliado",
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{item.name}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            {item.commission_rate}% comissão · {item.active_achievements_month} conquistas ativas
          </div>
        </div>
      )
    },
    {
      key: "orders_month",
      header: "Pedidos mês",
      sortable: true,
      render: (item) => <span style={{ fontWeight: 500 }}>{item.orders_month}</span>
    },
    {
      key: "total_month",
      header: "Comissão mês",
      sortable: true,
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{formatCurrency(item.total_month)}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Base {formatCurrency(item.base_month)} + R$ {item.achievements_month} conquistas
          </div>
        </div>
      )
    },
    {
      key: "total_all_time",
      header: "Comissão total",
      sortable: true,
      render: (item) => <span style={{ fontWeight: 500 }}>{formatCurrency(item.total_all_time)}</span>
    },
    {
      key: "to_pay",
      header: "A pagar",
      sortable: true,
      render: (item) => {
        if (item.to_pay > 0) {
          return (
            <span style={{
              color: "var(--warning-text)", background: "var(--warning-bg)",
              padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600
            }}>
              {formatCurrency(item.to_pay)}
            </span>
          );
        }
        return (
          <span style={{
            color: "var(--success-text)", background: "var(--success-bg)",
            padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600
          }}>
            Pago
          </span>
        );
      }
    },
    {
      key: "last_payout",
      header: "Último pagamento",
      sortable: true,
      render: (item) => (
        <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          {item.last_payout_date ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(item.last_payout_date)) : '-'}
        </span>
      )
    },
    {
      key: "actions",
      header: "Ações",
      render: (item) => (
        <Button variant="transparent" outline={true} style={{ padding: "6px 12px", width: "auto" }} onClick={() => {
          setSelectedAffiliate(item);
          setIsDetailModalOpen(true);
        }}>
          Ver detalhe
        </Button>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <Card style={{ display: "flex", gap: "16px", background: "var(--card-bg)", padding: "16px" }}>
        <Button
          variant={activeTab === "definitions" ? "primary" : "transparent"}
          onClick={() => setActiveTab("definitions")}
          style={{ width: "auto" }}
        >
          <FontAwesomeIcon icon={faTrophy} style={{ marginRight: "8px" }} />
          Conquistas
        </Button>
        <Button
          variant={activeTab === "affiliates" ? "primary" : "transparent"}
          onClick={() => setActiveTab("affiliates")}
          style={{ width: "auto" }}
        >
          <FontAwesomeIcon icon={faUsers} style={{ marginRight: "8px" }} />
          Afiliados
        </Button>
      </Card>

      {activeTab === "definitions" && (
        <>
          <Card style={{ marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <Input
                label="Título"
                placeholder="Ex: Top Vendedor"
                value={filterTitle}
                onChange={(e) => setFilterTitle(e.target.value)}
              />
              <Input
                label="Descrição"
                placeholder="Palavra-chave..."
                value={filterDesc}
                onChange={(e) => setFilterDesc(e.target.value)}
              />
              <Select
                label="Métrica"
                placeholder="Todas as métricas"
                options={ACHIEVEMENT_METRIC_OPTIONS}
                value={filterMetric}
                onChange={(val) => setFilterMetric(val)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-start", gap: "16px", marginTop: "16px" }}>
              <Button onClick={() => {
                setEditingDef(null);
                setIsModalOpen(true);
              }} style={{ width: "auto" }}>
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: "8px" }} />
                Nova Conquista
              </Button>

              <Button
                variant="transparent"
                style={{ width: "auto", color: "var(--text-muted)" }}
                onClick={() => { setFilterTitle(""); setFilterDesc(""); setFilterMetric(null); }}
              >
                Limpar Filtros
              </Button>
            </div>
          </Card>

          <Card>
            <Table data={filteredDefinitions} columns={defColumns} loading={loadingDefs} />
          </Card>
        </>
      )}

      {activeTab === "affiliates" && (dashboardData || loadingDashboard) && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "20px", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Comissão total do mês</p>
              <h3 style={{ margin: 0, fontSize: "24px", color: "var(--success)" }}>
                {loadingDashboard ? <Skeleton width="120px" height="30px" /> : formatCurrency(dashboardData.summary.total_month)}
              </h3>
              <div style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                {loadingDashboard ? (
                  <Skeleton width="100%" height="14px" />
                ) : (
                  `Base ${formatCurrency(dashboardData.summary.base_month)} + conquistas ${formatCurrency(dashboardData.summary.achievements_month)}`
                )}
              </div>
            </div>

            <div style={{ padding: "20px", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Pedidos no mês</p>
              <h3 style={{ margin: 0, fontSize: "24px", color: "var(--text-main)" }}>
                {loadingDashboard ? <Skeleton width="60px" height="30px" /> : dashboardData.summary.orders_month}
              </h3>
              <div style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                {loadingDashboard ? (
                  <Skeleton width="80px" height="14px" />
                ) : (
                  `${dashboardData.summary.orders_growth > 0 ? `+${dashboardData.summary.orders_growth.toFixed(0)}% vs mês anterior` : "Mês atual"}`
                )}
              </div>
            </div>

            <div style={{ padding: "20px", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Afiliados ativos</p>
              <h3 style={{ margin: 0, fontSize: "24px", color: "var(--info)" }}>
                {loadingDashboard ? <Skeleton width="60px" height="30px" /> : dashboardData.summary.active_affiliates}
              </h3>
              <div style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                {loadingDashboard ? (
                  <Skeleton width="100px" height="14px" />
                ) : (
                  `de ${dashboardData.summary.total_affiliates} cadastrados`
                )}
              </div>
            </div>

            <div style={{ padding: "20px", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Aguardando pagamento</p>
              <h3 style={{ margin: 0, fontSize: "24px", color: "var(--text-main)" }}>
                {loadingDashboard ? <Skeleton width="120px" height="30px" /> : formatCurrency(dashboardData.summary.pending_payouts)}
              </h3>
              <div style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                {loadingDashboard ? (
                  <Skeleton width="60px" height="14px" />
                ) : (
                  `${dashboardData.summary.affiliates_with_pending_payouts} afiliados`
                )}
              </div>
            </div>
          </div>

          <Card style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
              <h3 style={{ fontSize: "16px", margin: 0, color: "var(--text-main)", fontWeight: 600 }}>Filtros de Busca</h3>
              <div style={{ flex: 1, maxWidth: "400px", display: "flex", justifyContent: "flex-end" }}>
                <Input
                  placeholder="Buscar afiliado..."
                  value={affiliateSearch}
                  onChange={(e) => setAffiliateSearch(e.target.value)}
                  style={{ margin: 0, width: "100%" }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <Table data={filteredAffiliates} columns={dashboardColumns} loading={loadingDashboard} />
          </Card>
        </>
      )}

      <AchievementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        achievement={editingDef}
        onSaveSuccess={(saved) => {
          setDefinitions(prev => {
            const exists = prev.find(d => d.id === saved.id);
            if (exists) {
              return prev.map(d => d.id === saved.id ? saved : d);
            }
            return [saved, ...prev];
          });
        }}
      />

      <AdminAffiliateDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        affiliate={selectedAffiliate}
      />
    </div>
  );
}
