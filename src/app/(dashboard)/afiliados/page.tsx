"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Table, Column } from "@/src/components/ui/Table";
import type { AffiliateWithCoupons } from "@/src/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faPlus, faSearch, faTrash, faTag } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/contexts/ToastContext";
import { useConfirmDialog } from "@/src/contexts/ConfirmDialogContext";

export default function AfiliadosPage() {
  const router = useRouter();
  const [data, setData] = useState<AffiliateWithCoupons[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchName, setSearchName] = useState("");
  const [appliedSearchName, setAppliedSearchName] = useState("");
  const [orderBy, setOrderBy] = useState("created_at");
  const [orderDesc, setOrderDesc] = useState(false);

  const { addToast } = useToast();
  const confirm = useConfirmDialog();

  const fetchData = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        name: appliedSearchName,
        orderBy,
        orderDesc: orderDesc.toString(),
      });

      const res = await fetch(`/api/affiliates?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar afiliados");
      const result = await res.json();

      setData(result.data || []);
      setTotalCount(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }, [page, limit, appliedSearchName, orderBy, orderDesc]);

  const handleSearch = () => {
    setPage(1);
    setAppliedSearchName(searchName);
  };

  const handleSearchInputChange = (val: string) => {
    setSearchName(val);
    if (val.trim() === "") {
      setPage(1);
      setAppliedSearchName("");
    }
  };

  const handleSortChange = (newOrderBy: string, newOrderDesc: boolean) => {
    setOrderBy(newOrderBy);
    setOrderDesc(newOrderDesc);
  };

  const handleDelete = async (affiliate: AffiliateWithCoupons) => {
    const confirmed = await confirm({
      title: "Excluir Afiliado",
      message: `Tem certeza que deseja excluir o afiliado "${affiliate.name}"? Esta ação não pode ser desfeita.`,
      confirmText: "Excluir",
      cancelText: "Cancelar",
      type: "danger",
    });

    if (!confirmed) return;

    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/affiliates/${affiliate.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Erro ao excluir afiliado");
      }

      addToast({ message: "Afiliado excluído com sucesso!", type: "success" });
      fetchData();
    } catch (err) {
      console.error(err);
      addToast({
        message: err instanceof Error ? err.message : "Erro ao excluir afiliado",
        type: "error",
      });
    } finally {
      setLoadingDelete(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: Column<AffiliateWithCoupons>[] = [
    {
      key: "name",
      header: "Nome / Chave PIX",
      sortable: true,
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{item.name}</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            PIX: {item.pix_key || "Não cadastrada"}
          </div>
        </div>
      )
    },
    {
      key: "coupons",
      header: "Cupom",
      sortable: false,
      render: (item) => {
        const firstCoupon = item.coupons?.[0];
        if (!firstCoupon) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(firstCoupon.code);
              addToast({ message: `Cupom "${firstCoupon.code}" copiado!`, type: "success" });
            }}
            title="Clique para copiar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '5px 12px',
              borderRadius: '8px',
              background: 'var(--hover)',
              border: '1px dashed var(--pink-dark)',
              color: 'var(--text-main)',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
              cursor: 'pointer',
              transition: 'transform 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.borderColor = "var(--pink-light)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--pink-dark)";
            }}
          >
            <FontAwesomeIcon icon={faTag} style={{ fontSize: '10px', color: 'var(--pink-dark)' }} />
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{firstCoupon.code}</span>
            <span style={{
              background: 'var(--pink-dark)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {firstCoupon.discount_percentage}%
            </span>
          </div>
        );
      }
    },
    {
      key: "commission_rate", header: "Comissão", sortable: true,
      render: (item) => (item.commission_rate !== null && item.commission_rate !== undefined) ? item.commission_rate.toFixed(2) + " %" : "—"
    },
    {
      key: "created_at",
      header: "Data de Cadastro",
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString("pt-BR")
    },
    {
      key: "actions",
      header: "Ações",
      sortable: false,
      style: { width: "1%" },
      render: (item) => (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="info"
            circle
            onClick={() => router.push(`/afiliados/${item.id}`)}
            title="Editar Afiliado"
          >
            <FontAwesomeIcon icon={faPen} style={{ fontSize: "13px" }} />
          </Button>

          <Button
            variant="danger"
            circle
            onClick={() => handleDelete(item)}
            title="Excluir Afiliado"
          >
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: "13px" }} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center" style={{ marginBottom: "8px" }}>
        <div>
          <h2 className="page-title">Gestão de Afiliados</h2>
          <p className="page-subtitle">Consulte, cadastre e gerencie a comissão, cupons e vínculos dos afiliados da plataforma.</p>
        </div>
        <Button
          variant="primary"
          style={{
            width: "auto",
            display: "flex",
          }}
          onClick={() => router.push("/afiliados/novo")}
        >
          <FontAwesomeIcon icon={faPlus} />
          Novo Afiliado
        </Button>
      </div>

      <Card style={{ padding: "24px", borderRadius: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "480px" }}>
            <Input
              placeholder="Buscar por afiliado ou PIX..."
              value={searchName}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              icon={<FontAwesomeIcon icon={faSearch} onClick={handleSearch} style={{ cursor: "pointer" }} />}
              style={{ margin: 0 }}
            />
          </div>
          {appliedSearchName && (
            <Button
              variant="transparent"
              style={{ width: "auto", fontSize: "13px", color: "var(--pink-dark)", padding: "0 8px" }}
              onClick={() => {
                setSearchName("");
                setPage(1);
                setAppliedSearchName("");
              }}
            >
              Limpar busca
            </Button>
          )}
        </div>

        <Table
          data={data}
          columns={columns}
          totalCount={totalCount}
          page={page}
          limit={limit}
          onPageChange={setPage}
          orderBy={orderBy}
          orderDesc={orderDesc}
          onSortChange={handleSortChange}
          loading={loadingList || loadingDelete}
        />
      </Card>
    </div>
  );
}
