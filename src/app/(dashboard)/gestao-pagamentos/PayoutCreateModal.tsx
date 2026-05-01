"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Select, SelectOption } from "@/src/components/ui/Select";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatCurrency, formatDate } from "@/src/lib/utils";
import { faWallet, faMoneyBillTransfer, faClock, faShoppingBag } from "@fortawesome/free-solid-svg-icons";

interface PayoutCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayoutCreateModal({ isOpen, onClose, onSuccess }: PayoutCreateModalProps) {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [calculationData, setCalculationData] = useState<any>(null);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAffiliates();
    } else {
      setSelectedAffiliateId(null);
      setCalculationData(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedAffiliateId) {
      fetchCalculation(selectedAffiliateId);
    } else {
      setCalculationData(null);
    }
  }, [selectedAffiliateId]);

  const fetchAffiliates = async () => {
    setLoadingAffiliates(true);
    try {
      const res = await fetch("/api/affiliates");
      if (!res.ok) {
        throw new Error(`Erro ${res.status}: Não foi possível carregar a lista de afiliados.`);
      }
      const result = await res.json();
      setAffiliates(result.data || []);
    } catch (err: any) {
      console.error("[PayoutCreateModal] fetchAffiliates error:", err);
      addToast({ message: err.message || "Erro ao carregar afiliados", type: "error" });
    } finally {
      setLoadingAffiliates(false);
    }
  };

  const fetchCalculation = async (id: string) => {
    setLoadingCalculation(true);
    try {
      const res = await fetch(`/api/admin/payouts/calculate/${id}`);
      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);
      
      if (res.ok) {
        setCalculationData(result?.data);
      } else {
        addToast({ message: result?.error || `Erro ${res.status} ao calcular valores`, type: "error" });
      }
    } catch (err: any) {
      console.error("[PayoutCreateModal] fetchCalculation error:", err);
      addToast({ message: "Erro de conexão ao calcular valores", type: "error" });
    } finally {
      setLoadingCalculation(false);
    }
  };

  const handleCreatePayout = async () => {
    if (!calculationData || calculationData.owed <= 0) {
      addToast({ message: "Não há valor pendente para este afiliado", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliate_id: selectedAffiliateId,
          amount: calculationData.owed,
          pix_key: calculationData.pixKey,
          status: "pending"
        })
      });

      const result = await (res.headers.get("content-type")?.includes("application/json") ? res.json() : null);

      if (res.ok) {
        addToast({ message: "Pagamento gerado com sucesso!", type: "success" });
        onSuccess();
        onClose();
      } else {
        throw new Error(result?.error || `Erro ${res.status} ao gerar pagamento`);
      }
    } catch (err: any) {
      addToast({ message: err.message || "Erro de conexão", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const affiliateOptions: SelectOption[] = affiliates.map(a => ({
    value: a.id,
    label: a.name
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerar Pagamento" size="md">
      <div className="flex flex-col gap-6">
        <Select
          label="Selecionar Afiliado"
          placeholder="Busque por nome..."
          options={affiliateOptions}
          value={selectedAffiliateId}
          onChange={(val) => setSelectedAffiliateId(val)}
          icon={<FontAwesomeIcon icon={faWallet} style={{ color: "var(--pink-dark)" }} />}
          appendTo="body"
        />

        {loadingCalculation && (
          <div className="flex flex-col gap-4">
            <Skeleton height="80px" />
            <Skeleton height="150px" />
          </div>
        )}

        {calculationData && !loadingCalculation && (
          <div className="flex flex-col gap-6">
            {/* Pix Key Card */}
            <div style={{ padding: "16px", background: "var(--info-bg)", borderRadius: "12px", border: "1px solid var(--info-border)", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--info)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FontAwesomeIcon icon={faWallet} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--info-text)", opacity: 0.8 }}>Chave PIX para Transferência</p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--info-text)" }}>{calculationData.pixKey}</p>
              </div>
            </div>

            {/* Financial Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ padding: "16px", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>Comissão Vendas</p>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "var(--text-main)" }}>{formatCurrency(calculationData.baseCommission)}</p>
              </div>
              <div style={{ padding: "16px", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>Conquistas</p>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "var(--text-main)" }}>{formatCurrency(calculationData.achievementsCommission)}</p>
              </div>
            </div>

            {/* Total Row */}
            <div style={{ padding: "20px", background: "var(--card-bg)", borderRadius: "12px", border: "2px dashed var(--pink-light)", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Total Geral a Pagar</p>
              <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "800", color: "var(--pink-dark)" }}>{formatCurrency(calculationData.owed)}</h3>
            </div>

            {/* Extra Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
                <FontAwesomeIcon icon={faShoppingBag} style={{ width: "14px" }} />
                <span>{calculationData.orderCount} pedidos realizados no período</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
                <FontAwesomeIcon icon={faClock} style={{ width: "14px" }} />
                <span>Último pagamento: {formatDate(calculationData.lastPayoutDate)}</span>
              </div>
            </div>

            <div style={{ marginTop: "8px" }}>
              <Button 
                onClick={handleCreatePayout} 
                loading={saving}
                disabled={calculationData.owed <= 0}
                style={{ height: "54px", fontSize: "16px" }}
              >
                <FontAwesomeIcon icon={faMoneyBillTransfer} style={{ marginRight: "10px" }} />
                Gerar Pagamento
              </Button>
            </div>
          </div>
        )}

        {!selectedAffiliateId && !loadingAffiliates && (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", background: "var(--card-bg)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
            Selecione um afiliado para calcular os valores pendentes.
          </div>
        )}
      </div>
    </Modal>
  );
}
