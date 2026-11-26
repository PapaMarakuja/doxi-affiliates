"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Select, SelectOption } from "@/src/components/ui/Select";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { copyToClipboard, formatCurrency, formatDate } from "@/src/lib/utils";
import type { Affiliate } from "@/src/types";
import type { AffiliateOwedCalculation } from "@/src/types/payout";
import { faWallet, faMoneyBillTransfer, faClock, faShoppingBag, faCopy, faListAlt, faTag } from "@fortawesome/free-solid-svg-icons";
import { AffiliateOrdersModal } from "@/src/components/ui/AffiliateOrdersModal";

interface PayoutCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayoutCreateModal({ isOpen, onClose, onSuccess }: PayoutCreateModalProps) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [calculationData, setCalculationData] = useState<AffiliateOwedCalculation | null>(null);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
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
    } catch (err) {
      console.error("[PayoutCreateModal] fetchAffiliates error:", err);
      addToast({ message: err instanceof Error ? err.message : "Erro ao carregar afiliados", type: "error" });
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
    } catch (err) {
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
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : "Erro de conexão", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const affiliateOptions: SelectOption[] = affiliates.map(a => ({
    value: a.id,
    label: a.name
  }));

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gerar Pagamento" size="md">
        <div className="flex flex-col gap-6">
          <Select
            label="Selecionar Afiliado"
            placeholder="Busque por nome..."
            options={affiliateOptions}
            value={selectedAffiliateId}
            onChange={(val) => setSelectedAffiliateId(val as string | null)}
            icon={<FontAwesomeIcon icon={faWallet} className="text-brand" />}
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
              {calculationData.payoutMethod === "cupom" ? (
                <div className="callout items-center">
                  <div className="icon-tile icon-tile--sm rounded-full bg-brand text-white">
                    <FontAwesomeIcon icon={faTag} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase text-brand">Opção de Retirada: Cupom na Loja</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      Este afiliado prefere receber em Cupom. Todo dia 10, emita e encaminhe o cupom no valor calculado.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="callout callout--info items-center">
                  <div className="icon-tile icon-tile--sm rounded-full bg-info text-white">
                    <FontAwesomeIcon icon={faWallet} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">Chave PIX para Transferência</p>
                    <p className="break-all text-base font-bold text-info">{calculationData.pixKey}</p>
                  </div>
                  {calculationData.pixKey && calculationData.pixKey !== "Não cadastrada" && (
                    <Button
                      variant="info"
                      size="sm"
                      className="w-auto"
                      title="Copiar chave PIX"
                      onClick={() => copyToClipboard(calculationData.pixKey, () => addToast({ message: "Chave PIX copiada!", type: "success" }))}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                      Copiar
                    </Button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="soft-panel">
                  <p className="metric-label mb-1 text-xs">Comissão Vendas</p>
                  <p className="text-lg font-semibold text-main">{formatCurrency(calculationData.baseCommission)}</p>
                </div>
                <div className="soft-panel">
                  <p className="metric-label mb-1 text-xs">Conquistas</p>
                  <p className="text-lg font-semibold text-main">{formatCurrency(calculationData.achievementsCommission)}</p>
                </div>
                <div className="callout callout--warning block p-4">
                  <p className="mb-1 text-xs text-warning">Já pago/pendente</p>
                  <p className="text-lg font-semibold text-warning">{formatCurrency(calculationData.alreadyPaid)}</p>
                  {calculationData.lastPayoutDate && (
                    <p className="mt-1 text-[10px] text-warning opacity-75">
                      Último: {formatDate(calculationData.lastPayoutDate)}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border-2 border-dashed border-[var(--pink-light)] bg-card p-5 text-center">
                <p className="metric-label mb-2 text-sm">Total Geral a Pagar</p>
                <h3 className="text-[32px] font-extrabold text-brand">{formatCurrency(calculationData.owed)}</h3>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5 text-[13px] text-muted">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faShoppingBag} className="w-3.5" />
                    <span>{calculationData.orderCount} pedidos realizados no período</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faClock} className="w-3.5" />
                    <span>Último pagamento: {calculationData.lastPayoutDate ? formatDate(calculationData.lastPayoutDate) : "Nenhum"}</span>
                  </div>
                </div>
                <Button variant="info" outline size="sm" className="w-auto" onClick={() => setShowOrdersModal(true)}>
                  <FontAwesomeIcon icon={faListAlt} />
                  Ver Vendas
                </Button>
              </div>

              <Button
                size="lg"
                className="mt-2"
                onClick={handleCreatePayout}
                loading={saving}
                disabled={calculationData.owed <= 0}
              >
                <FontAwesomeIcon icon={faMoneyBillTransfer} />
                Gerar Pagamento
              </Button>
            </div>
          )}

          {!selectedAffiliateId && !loadingAffiliates && (
            <div className="empty-dashed p-10">
              Selecione um afiliado para calcular os valores pendentes.
            </div>
          )}
        </div>
      </Modal>

      {selectedAffiliateId && (
        <AffiliateOrdersModal
          isOpen={showOrdersModal}
          onClose={() => setShowOrdersModal(false)}
          affiliateId={selectedAffiliateId}
          affiliateName={affiliates.find(a => a.id === selectedAffiliateId)?.name}
          periodStart={calculationData?.lastPayoutDate ?? null}
        />
      )}
    </>
  );
}
