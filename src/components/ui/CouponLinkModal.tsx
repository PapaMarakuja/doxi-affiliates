"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { CouponCreateModal } from "@/src/components/ui/CouponCreateModal";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { Coupon } from "@/src/types";
import { Table } from "@/src/components/ui/Table";

interface CouponLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateId: string;
  onCouponLinked: (coupon: Coupon) => void;
}

export function CouponLinkModal({
  isOpen,
  onClose,
  affiliateId,
  onCouponLinked,
}: CouponLinkModalProps) {
  const { addToast } = useToast();
  const [unlinkedCoupons, setUnlinkedCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUnlinkedCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons?unlinked=true");
      if (!res.ok) throw new Error("Erro ao buscar cupons");
      const result = await res.json();
      setUnlinkedCoupons(result.data || []);
    } catch (error) {
      console.error(error);
      addToast({ message: "Erro ao carregar cupons disponíveis.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      fetchUnlinkedCoupons();
    }
  }, [isOpen, fetchUnlinkedCoupons]);

  const filteredCoupons = unlinkedCoupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleLink = async (couponId: string) => {
    setLinkingId(couponId);
    try {
      const res = await fetch("/api/coupons/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon_id: couponId, affiliate_id: affiliateId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Erro ao vincular cupom");
      }

      const result = await res.json();
      const linkedCoupon: Coupon = result.data;

      setUnlinkedCoupons((prev) => prev.filter((c) => c.id !== couponId));

      addToast({ message: "Cupom vinculado com sucesso!", type: "success" });
      onCouponLinked(linkedCoupon);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao vincular cupom.";
      addToast({ message, type: "error" });
    } finally {
      setLinkingId(null);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setCouponToEdit(coupon);
    setShowCreateModal(true);
  };

  const handleCouponCreated = (coupon: Coupon) => {
    if (couponToEdit) {
      // It was an edit
      setUnlinkedCoupons((prev) => prev.map((c) => (c.id === coupon.id ? coupon : c)));
      setCouponToEdit(null);
    } else if (coupon.affiliate_id === affiliateId) {
      // If it was created linked to this affiliate, just add to the parent
      onCouponLinked(coupon);
    } else {
      // If it was created without link, add to the unlinked list
      setUnlinkedCoupons((prev) => [coupon, ...prev]);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Vincular Cupom"
        size="lg"
        id="coupon-link-modal"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-[220px] flex-1 [&_.input-field-container]:mb-0">
              <Input
                label="Filtrar cupom por nome/código"
                placeholder="Digite para filtrar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              className="w-auto px-5"
              onClick={() => {
                setCouponToEdit(null);
                setShowCreateModal(true);
              }}
              type="button"
            >
              <FontAwesomeIcon icon={faPlus} />
              Cadastrar Novo Cupom
            </Button>
          </div>

          {!loading && unlinkedCoupons.length === 0 ? (
            <div className="empty-dashed">Nenhum cupom disponível para vinculação.</div>
          ) : (
            <Table
              key={searchTerm}
              data={filteredCoupons}
              loading={loading}
              compact
              emptyMessage="Nenhum cupom encontrado para o filtro informado."
              columns={[
                {
                  key: "code",
                  header: "Code",
                  render: (coupon) => <span className="font-semibold tracking-wide">{coupon.code}</span>,
                },
                {
                  key: "discount_percentage",
                  header: "Percentual",
                  render: (coupon) => (coupon.discount_percentage != null ? `${coupon.discount_percentage}%` : "—"),
                },
                {
                  key: "active",
                  header: "Ativo",
                  render: (coupon) => coupon.active
                    ? <FontAwesomeIcon icon={faCheck} className="text-base text-success" />
                    : <FontAwesomeIcon icon={faXmark} className="text-base text-danger" />,
                },
                {
                  key: "actions",
                  header: "Ações",
                  style: { width: "1%" },
                  render: (coupon) => (
                    <div className="flex justify-center gap-2">
                      <Button
                        outline
                        size="sm"
                        className="w-auto"
                        onClick={() => handleLink(coupon.id)}
                        loading={linkingId === coupon.id}
                        disabled={linkingId !== null}
                        type="button"
                      >
                        Vincular
                      </Button>
                      <Button variant="info" outline size="sm" className="w-auto" onClick={() => handleEdit(coupon)} type="button">
                        Editar
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Modal>

      {/* Secondary modal for creating a new coupon — opens on top */}
      <CouponCreateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCouponToEdit(null);
        }}
        onCouponCreated={handleCouponCreated}
        couponToEdit={couponToEdit}
      />
    </>
  );
}
