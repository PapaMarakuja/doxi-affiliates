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
          <div className="font-semibold text-main">{item.name}</div>
          <div className="mt-0.5 text-xs text-muted">
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
        if (!firstCoupon) return <span className="text-muted">—</span>;
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(firstCoupon.code);
              addToast({ message: `Cupom "${firstCoupon.code}" copiado!`, type: "success" });
            }}
            title="Clique para copiar"
            className="coupon-chip"
          >
            <FontAwesomeIcon icon={faTag} />
            <span className="coupon-chip-code">{firstCoupon.code}</span>
            <span className="coupon-chip-badge">{firstCoupon.discount_percentage}%</span>
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
            <FontAwesomeIcon icon={faPen} className="text-[13px]" />
          </Button>

          <Button
            variant="danger"
            circle
            onClick={() => handleDelete(item)}
            title="Excluir Afiliado"
          >
            <FontAwesomeIcon icon={faTrash} className="text-[13px]" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Gestão de Afiliados</h2>
          <p className="page-subtitle">Consulte, cadastre e gerencie a comissão, cupons e vínculos dos afiliados da plataforma.</p>
        </div>
        <Button
          className="w-auto gap-2 px-6"
          onClick={() => router.push("/afiliados/novo")}
        >
          <FontAwesomeIcon icon={faPlus} />
          Novo Afiliado
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-[480px] flex-1 gap-3 [&_.input-field-container]:mb-0">
            <Input
              placeholder="Buscar por afiliado ou PIX..."
              value={searchName}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              icon={<FontAwesomeIcon icon={faSearch} onClick={handleSearch} className="cursor-pointer" />}
            />
          </div>
          {appliedSearchName && (
            <Button
              variant="transparent"
              size="sm" className="w-auto text-brand"
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
