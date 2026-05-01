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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Button to create a new coupon */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Filtrar cupom por nome/código"
                placeholder="Digite para filtrar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              style={{ width: "auto" }}
              onClick={() => {
                setCouponToEdit(null);
                setShowCreateModal(true);
              }}
              type="button"
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: "6px" }} />
              Cadastrar Novo Cupom
            </Button>
          </div>

          {/* Table listing unlinked coupons */}
          {loading ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Carregando cupons...
            </div>
          ) : unlinkedCoupons.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-secondary, var(--text-muted))",
                border: "1px dashed var(--border)",
                borderRadius: "8px",
              }}
            >
              Nenhum cupom disponível para vinculação.
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-secondary, var(--text-muted))",
                border: "1px dashed var(--border)",
                borderRadius: "8px",
              }}
            >
              Nenhum cupom encontrado para o filtro informado.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card-bg)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: "var(--hover)",
                    }}
                  >
                    <th className="table-th-text" style={thStyle}>
                      Code
                    </th>
                    <th className="table-th-text" style={thStyle}>
                      Percentual
                    </th>
                    <th className="table-th-text" style={thStyle}>
                      Ativo
                    </th>
                    <th className="table-th-text" style={{ ...thStyle, textAlign: "center" }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoupons.map((coupon) => (
                    <tr
                      key={coupon.id}
                      className="table-row-hover"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.2s",
                      }}
                    >
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                          }}
                        >
                          {coupon.code}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {coupon.discount_percentage != null
                          ? `${coupon.discount_percentage}%`
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        {coupon.active ? (
                          <FontAwesomeIcon
                            icon={faCheck}
                            style={{ color: "var(--success)", fontSize: "16px" }}
                          />
                        ) : (
                          <FontAwesomeIcon
                            icon={faXmark}
                            style={{ color: "var(--error)", fontSize: "16px" }}
                          />
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
                        <Button
                          variant="primary"
                          outline
                          style={{
                            width: "auto",
                            padding: "8px 16px",
                            fontSize: "13px",
                            minHeight: "unset",
                          }}
                          onClick={() => handleLink(coupon.id)}
                          loading={linkingId === coupon.id}
                          disabled={linkingId !== null}
                          type="button"
                        >
                          Vincular
                        </Button>
                        <Button
                          variant="info"
                          outline
                          style={{
                            width: "auto",
                            padding: "8px 16px",
                            fontSize: "13px",
                            minHeight: "unset",
                          }}
                          onClick={() => handleEdit(coupon)}
                          type="button"
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

const thStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontWeight: 600,
  color: "var(--text-muted)",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  color: "var(--text-main)",
  fontSize: "14px",
};
