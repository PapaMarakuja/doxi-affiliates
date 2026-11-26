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

import type { AchievementDefinition, AffiliateDashboardRow, AffiliatesDashboardData } from "@/src/types/achievements";
import { Badge } from "@/src/components/ui/Badge";
import { formatCurrency } from "@/src/lib/utils";
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
  const [dashboardData, setDashboardData] = useState<AffiliatesDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [affiliateSearch, setAffiliateSearch] = useState("");

  const { addToast } = useToast();
  const confirm = useConfirmDialog();

  // Modal Definition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<Partial<AchievementDefinition> | null>(null);

  // Detail Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateDashboardRow | null>(null);

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
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : "Erro ao excluir", type: "error" });
    }
  };

  const defColumns: Column<AchievementDefinition>[] = [
    { key: "title", header: "Título", sortable: true },
    { key: "description", header: "Descrição", sortable: true, wrap: true },
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
        if (item.metric.includes("commission")) return formatCurrency(item.goal);
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
        <div className="flex items-center gap-2">
          <span className="color-swatch" style={{ background: item.color_hex || "#ccc" }} />
          <span className="font-mono">{item.color_hex}</span>
        </div>
      )
    },
    {
      key: "actions",
      header: "Ações",
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="info" circle title="Editar" onClick={() => {
            setEditingDef(item);
            setIsModalOpen(true);
          }}>
            <FontAwesomeIcon icon={faPen} />
          </Button>
          <Button variant="danger" circle title="Excluir" onClick={() => handleDeleteDef(item.id)}>
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

  const filteredAffiliates = useMemo(() => {
    if (!dashboardData?.affiliates) return [];
    if (!affiliateSearch.trim()) return dashboardData.affiliates;
    const lower = affiliateSearch.toLowerCase();
    return dashboardData.affiliates.filter((a) => a.name?.toLowerCase().includes(lower));
  }, [dashboardData, affiliateSearch]);

  const dashboardColumns: Column<AffiliateDashboardRow>[] = [
    {
      key: "affiliate",
      header: "Afiliado",
      render: (item) => (
        <div>
          <div className="font-semibold text-main">{item.name}</div>
          <div className="mt-1 text-xs text-muted">
            {item.commission_rate}% comissão · {item.active_achievements_month} conquistas ativas
          </div>
        </div>
      )
    },
    {
      key: "orders_month",
      header: "Pedidos mês",
      sortable: true,
      render: (item) => <span className="font-medium">{item.orders_month}</span>
    },
    {
      key: "total_month",
      header: "Comissão mês",
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-main">{formatCurrency(item.total_month)}</div>
          <div className="mt-1 text-xs text-muted">
            Base {formatCurrency(item.base_month)} + R$ {item.achievements_month} conquistas
          </div>
        </div>
      )
    },
    {
      key: "total_all_time",
      header: "Comissão total",
      sortable: true,
      render: (item) => <span className="font-medium">{formatCurrency(item.total_all_time)}</span>
    },
    {
      key: "to_pay",
      header: "A pagar",
      sortable: true,
      render: (item) => item.to_pay > 0
        ? <Badge tone="warning">{formatCurrency(item.to_pay)}</Badge>
        : <Badge tone="success">Pago</Badge>
    },
    {
      key: "last_payout",
      header: "Último pagamento",
      sortable: true,
      render: (item) => (
        <span className="text-[13px] text-muted">
          {item.last_payout_date ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(item.last_payout_date)) : '-'}
        </span>
      )
    },
    {
      key: "actions",
      header: "Ações",
      render: (item) => (
        <Button variant="transparent" outline size="sm" className="w-auto" onClick={() => {
          setSelectedAffiliate(item);
          setIsDetailModalOpen(true);
        }}>
          Ver detalhe
        </Button>
      )
    }
  ];

  const summary = dashboardData?.summary;
  const summaryCards = [
    {
      label: "Comissão total do mês",
      valueClassName: "text-success",
      value: summary && formatCurrency(summary.total_month),
      hint: summary && `Base ${formatCurrency(summary.base_month)} + conquistas ${formatCurrency(summary.achievements_month)}`,
    },
    {
      label: "Pedidos no mês",
      value: summary?.orders_month,
      hint: summary && (summary.orders_growth > 0 ? `+${summary.orders_growth.toFixed(0)}% vs mês anterior` : "Mês atual"),
    },
    {
      label: "Afiliados ativos",
      valueClassName: "text-info",
      value: summary?.active_affiliates,
      hint: summary && `de ${summary.total_affiliates} cadastrados`,
    },
    {
      label: "Aguardando pagamento",
      value: summary && formatCurrency(summary.pending_payouts),
      hint: summary && `${summary.affiliates_with_pending_payouts} afiliados`,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Card className="flex gap-4 p-4">
        <Button
          variant={activeTab === "definitions" ? "primary" : "transparent"}
          onClick={() => setActiveTab("definitions")}
          className="w-auto gap-2 px-5"
        >
          <FontAwesomeIcon icon={faTrophy} />
          Conquistas
        </Button>
        <Button
          variant={activeTab === "affiliates" ? "primary" : "transparent"}
          onClick={() => setActiveTab("affiliates")}
          className="w-auto gap-2 px-5"
        >
          <FontAwesomeIcon icon={faUsers} />
          Afiliados
        </Button>
      </Card>

      {activeTab === "definitions" && (
        <>
          <Card>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
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
                onChange={(val) => setFilterMetric(val as string | null)}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <Button className="w-auto gap-2 px-5" onClick={() => {
                setEditingDef(null);
                setIsModalOpen(true);
              }}>
                <FontAwesomeIcon icon={faPlus} />
                Nova Conquista
              </Button>

              <Button
                variant="transparent"
                className="w-auto px-5 text-muted"
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
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="metric-card block">
                <div className="metric-label">{card.label}</div>
                <div className={`metric-value ${card.valueClassName ?? ""}`}>
                  {loadingDashboard ? <Skeleton width="120px" height="30px" /> : card.value}
                </div>
                <div className="metric-hint mt-1.5">
                  {loadingDashboard ? <Skeleton width="100px" height="14px" /> : card.hint}
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="section-title text-base">Filtros de Busca</h3>
              <div className="w-full max-w-[400px] flex-1 [&_.input-field-container]:mb-0">
                <Input
                  placeholder="Buscar afiliado..."
                  value={affiliateSearch}
                  onChange={(e) => setAffiliateSearch(e.target.value)}
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
