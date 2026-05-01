"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Table, Column } from "@/src/components/ui/Table";
import type { Affiliate, AffiliateWithCoupons } from "@/src/types";
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
  const [orderDesc, setOrderDesc] = useState(true);

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
    fetchData();
  };

  const handleSortChange = (newOrderBy: string, newOrderDesc: boolean) => {
    setOrderBy(newOrderBy);
    setOrderDesc(newOrderDesc);
    fetchData();
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
    { key: "name", header: "Nome", sortable: true },
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
              cursor: 'pointer'
            }}>
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
      render: (item) => item.commission_rate?.toFixed(2) + " %"
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
            style={{
              minHeight: "unset",
              width: "auto",
              fontSize: "12px",
              padding: '0.5rem',
            }}
            onClick={() => router.push(`/afiliados/${item.id}`)}
          >
            <FontAwesomeIcon icon={faPen} />
          </Button>

          <Button
            variant="danger"
            style={{
              minHeight: "unset",
              width: "auto",
              fontSize: "12px",
              padding: '0.5rem',
            }}
            onClick={() => handleDelete(item)}
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      )

    }
  ];

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <div className="form-grid">
          <div className="form-col-6" style={{ position: 'relative' }}>
            <Input
              label="Nome do Afiliado"
              placeholder="Digite o nome para buscar..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-col-6" style={{ display: "flex", gap: "16px" }}>
            <Button onClick={handleSearch} disabled={loadingList} loading={loadingList} style={{ width: "auto" }}>
              <FontAwesomeIcon icon={faSearch} style={{ marginRight: "8px" }} />
              Consultar
            </Button>

            <Button
              variant="primary"
              outline
              style={{ width: "auto" }}
              onClick={() => router.push("/afiliados/novo")}
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: "8px" }} />
              Cadastrar
            </Button>
          </div>
        </div>
      </Card>

      <Card>
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
