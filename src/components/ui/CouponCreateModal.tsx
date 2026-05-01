"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/contexts/ToastContext";
import type { Coupon } from "@/src/types";

interface CouponCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateId?: string | null;
  onCouponCreated: (coupon: Coupon) => void;
  couponToEdit?: Coupon | null;
}

export function CouponCreateModal({
  isOpen,
  onClose,
  affiliateId,
  onCouponCreated,
  couponToEdit,
}: CouponCreateModalProps) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [active, setActive] = useState(true);

  const isEdit = !!couponToEdit;

  useEffect(() => {
    if (isOpen && couponToEdit) {
      setCode(couponToEdit.code);
      setDiscountPercentage(couponToEdit.discount_percentage?.toString() || "");
      setActive(couponToEdit.active);
    } else if (isOpen && !couponToEdit) {
      resetForm();
    }
  }, [isOpen, couponToEdit]);

  const resetForm = () => {
    setCode("");
    setDiscountPercentage("");
    setActive(true);
  };

  const handleSave = async () => {
    if (!code.trim()) {
      addToast({ message: "O código do cupom é obrigatório.", type: "error" });
      document.getElementById("form_codigo")?.focus();
      return;
    }

    const percentage = discountPercentage ? parseFloat(discountPercentage) : null;
    if (percentage !== null && (isNaN(percentage) || percentage < 0 || percentage > 100)) {
      addToast({ message: "Percentual deve ser entre 0 e 100.", type: "error" });
      document.getElementById("form_desconto")?.focus();
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: code.trim(),
        discount_percentage: percentage,
        active,
      };

      if (couponToEdit?.id) {
        payload.id = couponToEdit.id;
      }

      if (affiliateId) {
        payload.affiliate_id = affiliateId;
      }

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Erro ao ${isEdit ? "atualizar" : "criar"} cupom`);
      }

      const result = await res.json();
      const updatedCoupon: Coupon = result.data;

      addToast({ message: `Cupom ${isEdit ? "atualizado" : "criado"} com sucesso!`, type: "success" });
      onCouponCreated(updatedCoupon);
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : `Erro ao ${isEdit ? "atualizar" : "criar"} cupom.`;
      addToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? "Editar Cupom" : "Cadastrar Novo Cupom"}
      size="sm"
      id="coupon-create-modal"
      zIndex={150}
      closeOnOverlayClick={!saving}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Input
          id="form_codigo"
          label="Código do Cupom"
          placeholder="Ex: DESCONTO10"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={saving}
        />

        <Input
          id="form_desconto"
          label="Percentual de Desconto"
          placeholder="Ex: 10"
          type="number"
          value={discountPercentage}
          onChange={(e) => setDiscountPercentage(e.target.value)}
          disabled={saving}
          suffix={<span style={{ fontSize: "14px", color: "var(--text-muted)" }}>%</span>}
        />

        <label className="custom-checkbox-wrapper" style={{ marginTop: "4px" }}>
          <input
            type="checkbox"
            className="custom-checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={saving}
          />
          <span className="custom-checkbox-label">Cupom Ativo</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <Button
          variant="primary"
          outline
          style={{ width: "auto", flex: 1 }}
          onClick={handleClose}
          disabled={saving}
          type="button"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          style={{ width: "auto", flex: 1 }}
          onClick={handleSave}
          loading={saving}
          type="button"
        >
          {isEdit ? "Salvar Alterações" : "Cadastrar"}
        </Button>
      </div>
    </Modal>
  );
}
