"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faChevronDown,
  faChevronRight,
  faWallet,
  faCheckCircle,
  faShoppingBag,
  faCopy,
  faMoneyBillTransfer,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import { cn, copyToClipboard, formatCurrency } from "@/src/lib/utils";
import { Badge } from "@/src/components/ui/Badge";

interface AffiliateOwed {
  affiliateId: string;
  name: string;
  pixKey: string | null;
  baseCommission: number;
  achievementsCommission: number;
  totalEarned: number;
  alreadyPaid: number;
  owed: number;
  orderCount: number;
  lastPayoutDate: string | null;
  error: string | null;
}

interface BatchPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BatchPayoutModal({ isOpen, onClose, onSuccess }: BatchPayoutModalProps) {
  const [affiliates, setAffiliates] = useState<AffiliateOwed[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [showZeroAccordion, setShowZeroAccordion] = useState(false);
  const { addToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payouts/batch-calculate");
      const result = await res.json();
      if (res.ok) {
        setAffiliates(result.data || []);
        setPaidIds(new Set());
      } else {
        addToast({ message: result.error || "Erro ao carregar", type: "error" });
      }
    } catch {
      addToast({ message: "Erro de conexão", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isOpen) {
      setShowZeroAccordion(false);
      fetchAll();
    }
  }, [isOpen, fetchAll]);

  const handlePay = async (affiliate: AffiliateOwed) => {
    if (processingId || affiliate.owed <= 0) return;
    setProcessingId(affiliate.affiliateId);
    try {
      const res = await fetch("/api/admin/payouts/batch-calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId: affiliate.affiliateId,
          amount: parseFloat(affiliate.owed.toFixed(2)),
          pixKey: affiliate.pixKey || "",
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setPaidIds((prev) => new Set(prev).add(affiliate.affiliateId));
        // Update local owed to 0
        setAffiliates((prev) =>
          prev.map((a) =>
            a.affiliateId === affiliate.affiliateId
              ? { ...a, owed: 0, alreadyPaid: a.alreadyPaid + a.owed }
              : a
          )
        );
        addToast({ message: `Pagamento de ${affiliate.name} lançado!`, type: "success" });
        onSuccess();
      } else {
        addToast({ message: result.error || "Falha ao lançar pagamento", type: "error" });
      }
    } catch {
      addToast({ message: "Erro de conexão", type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const copyPix = (key: string, name: string) =>
    copyToClipboard(key, () => addToast({ message: `PIX de ${name} copiado!`, type: "success" }));

  const withOwed = affiliates.filter((a) => a.owed > 0);
  const withoutOwed = affiliates.filter((a) => a.owed <= 0);
  const totalToPay = withOwed.reduce((s, a) => s + a.owed, 0);

  // Render function (not a nested component) so rows are not remounted on every render.
  const renderAffiliateRow = (a: AffiliateOwed) => {
    const isPaid = paidIds.has(a.affiliateId);
    const isProcessing = processingId === a.affiliateId;
    const hasPixKey = !!a.pixKey && a.pixKey !== "Não cadastrada";

    return (
      <div key={a.affiliateId} className={cn("soft-panel flex flex-col gap-2.5 bg-card", isPaid && "border-success")}>
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
            isPaid ? "border-success bg-success/15 text-success" : "border-line bg-soft text-brand")}>
            {isPaid ? <FontAwesomeIcon icon={faCheckCircle} /> : a.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-main">{a.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted">
              <FontAwesomeIcon icon={faShoppingBag} />
              {a.orderCount} pedidos · ganhou {formatCurrency(a.totalEarned)} · já pago {formatCurrency(a.alreadyPaid)}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] text-muted">A pagar</p>
            <p className={cn("text-lg font-extrabold", isPaid ? "text-success" : "text-brand")}>
              {formatCurrency(a.owed > 0 ? a.owed : 0)}
            </p>
          </div>

          {a.owed > 0 && !isPaid && (
            <Button variant="success" size="sm" className="w-auto shrink-0" loading={isProcessing} onClick={() => handlePay(a)}>
              {!isProcessing && <FontAwesomeIcon icon={faMoneyBillTransfer} />}
              Lançar
            </Button>
          )}

          {isPaid && (
            <Badge tone="success" className="shrink-0">
              <FontAwesomeIcon icon={faCheckCircle} /> Lançado
            </Badge>
          )}
        </div>

        {hasPixKey ? (
          <div className="callout callout--info items-center px-3 py-2 text-xs">
            <FontAwesomeIcon icon={faWallet} className="text-xs" />
            <span className="flex-1 break-all font-semibold text-info">{a.pixKey}</span>
            <Button variant="info" size="sm" className="min-h-0 w-auto px-2 py-1 text-[11px]" onClick={() => copyPix(a.pixKey!, a.name)}>
              <FontAwesomeIcon icon={faCopy} /> Copiar
            </Button>
          </div>
        ) : (
          <div className="callout callout--warning items-center px-2.5 py-1.5 text-[11px] font-semibold text-warning">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-xs" />
            Chave PIX não cadastrada
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerar Pagamentos do Mês"
      size="lg"
      id="batch-payout-modal"
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="stat-tile">
            <p className="stat-tile-label">Afiliados com saldo</p>
            <div className="stat-tile-value">{loading ? <Skeleton width="32px" height="28px" /> : withOwed.length}</div>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-label">Já lançados agora</p>
            <div className="stat-tile-value text-success">{loading ? <Skeleton width="32px" height="28px" /> : paidIds.size}</div>
          </div>
          <div className="stat-tile stat-tile--success">
            <p className="stat-tile-label">Total a pagar</p>
            <div className="stat-tile-value">{loading ? <Skeleton width="80px" height="28px" /> : formatCurrency(totalToPay)}</div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2.5">
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </div>
        ) : affiliates.length === 0 ? (
          <div className="empty-dashed empty-state">
            <FontAwesomeIcon icon={faMoneyBillWave} />
            <p>Nenhum afiliado ativo encontrado.</p>
          </div>
        ) : (
          <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-0.5">
            {withOwed.length > 0 && (
              <>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                  Com saldo a receber — {withOwed.length}
                </p>
                {withOwed.map(renderAffiliateRow)}
              </>
            )}

            {withoutOwed.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowZeroAccordion((v) => !v)}
                  className="expand-row-header rounded-[10px] border border-line bg-soft px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
                  aria-expanded={showZeroAccordion}
                >
                  <FontAwesomeIcon icon={showZeroAccordion ? faChevronDown : faChevronRight} />
                  Sem saldo a receber — {withoutOwed.length}
                </button>

                {showZeroAccordion && (
                  <div className="mt-2 flex flex-col gap-2">
                    {withoutOwed.map(renderAffiliateRow)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
