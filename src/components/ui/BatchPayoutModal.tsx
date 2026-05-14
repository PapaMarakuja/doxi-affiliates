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
import { formatCurrency } from "@/src/lib/utils";

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

  const copyPix = (key: string, name: string) => {
    navigator.clipboard.writeText(key);
    addToast({ message: `PIX de ${name} copiado!`, type: "success" });
  };

  const withOwed = affiliates.filter((a) => a.owed > 0);
  const withoutOwed = affiliates.filter((a) => a.owed <= 0);
  const totalToPay = withOwed.reduce((s, a) => s + a.owed, 0);

  const AffiliateRow = ({ a }: { a: AffiliateOwed }) => {
    const isPaid = paidIds.has(a.affiliateId);
    const isProcessing = processingId === a.affiliateId;

    return (
      <div style={{
        padding: "14px 16px",
        background: "var(--card-bg)",
        borderRadius: "12px",
        border: isPaid ? "1px solid var(--success)" : "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        transition: "border-color 0.2s",
      }}>
        {/* Top row: name + badges + amount + action */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
            background: isPaid ? "rgba(34,197,94,0.15)" : "var(--hover)",
            border: `1px solid ${isPaid ? "var(--success)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: 700, color: isPaid ? "var(--success)" : "var(--pink-dark)",
          }}>
            {isPaid
              ? <FontAwesomeIcon icon={faCheckCircle} />
              : a.name.charAt(0).toUpperCase()}
          </div>

          {/* Name + order count */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {a.name}
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
              <FontAwesomeIcon icon={faShoppingBag} style={{ marginRight: "4px" }} />
              {a.orderCount} pedidos · ganhou {formatCurrency(a.totalEarned)} · já pago {formatCurrency(a.alreadyPaid)}
            </p>
          </div>

          {/* Amount */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>A pagar</p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: isPaid ? "var(--success)" : "var(--pink-dark)" }}>
              {formatCurrency(a.owed > 0 ? a.owed : 0)}
            </p>
          </div>

          {/* Action button */}
          {a.owed > 0 && !isPaid && (
            <Button
              variant="success"
              loading={isProcessing}
              onClick={() => handlePay(a)}
              style={{ width: "auto", padding: "8px 16px", fontSize: "13px", minHeight: "unset", flexShrink: 0 }}
            >
              {!isProcessing && <FontAwesomeIcon icon={faMoneyBillTransfer} style={{ marginRight: "6px" }} />}
              Lançar
            </Button>
          )}

          {isPaid && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "4px 10px", borderRadius: "20px",
              background: "rgba(34,197,94,0.12)", border: "1px solid var(--success)",
              fontSize: "12px", fontWeight: 700, color: "var(--success)", flexShrink: 0,
            }}>
              <FontAwesomeIcon icon={faCheckCircle} /> Lançado
            </span>
          )}
        </div>

        {/* PIX key row */}
        {a.pixKey && a.pixKey !== "Não cadastrada" && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 12px", borderRadius: "8px",
            background: "rgba(59,130,246,0.06)", border: "1px solid var(--info)",
          }}>
            <FontAwesomeIcon icon={faWallet} style={{ color: "var(--info)", fontSize: "12px", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "12px", color: "var(--info)", fontWeight: 600, wordBreak: "break-all" }}>
              {a.pixKey}
            </span>
            <button
              onClick={() => copyPix(a.pixKey!, a.name)}
              style={{
                background: "var(--info)", border: "none", borderRadius: "6px",
                color: "#fff", cursor: "pointer", padding: "4px 8px",
                fontSize: "11px", fontWeight: 600, flexShrink: 0,
                display: "flex", alignItems: "center", gap: "4px",
              }}
            >
              <FontAwesomeIcon icon={faCopy} /> Copiar
            </button>
          </div>
        )}

        {!a.pixKey || a.pixKey === "Não cadastrada" ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 10px", borderRadius: "6px",
            background: "rgba(245,158,11,0.08)", border: "1px solid var(--warning)",
            fontSize: "11px", color: "var(--warning)", fontWeight: 600,
          }}>
            <FontAwesomeIcon icon={faExclamationCircle} />
            Chave PIX não cadastrada
          </div>
        ) : null}
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
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Summary header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}>
          <div style={{ padding: "14px 16px", background: "var(--card-bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Afiliados com saldo</p>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-main)" }}>
              {loading ? <Skeleton width="32px" height="28px" /> : withOwed.length}
            </div>
          </div>
          <div style={{ padding: "14px 16px", background: "var(--card-bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Já lançados agora</p>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--success)" }}>
              {loading ? <Skeleton width="32px" height="28px" /> : paidIds.size}
            </div>
          </div>
          <div style={{ padding: "14px 16px", background: "rgba(34,197,94,0.10)", borderRadius: "10px", border: "1px solid var(--success)" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--success)", marginBottom: "4px" }}>Total a pagar</p>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--success)" }}>
              {loading ? <Skeleton width="80px" height="28px" /> : formatCurrency(totalToPay)}
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Skeleton height="80px" />
            <Skeleton height="80px" />
            <Skeleton height="80px" />
          </div>
        ) : withOwed.length === 0 && withoutOwed.length === 0 ? (
          <div style={{
            padding: "40px", textAlign: "center",
            color: "var(--text-muted)", background: "var(--card-bg)",
            borderRadius: "12px", border: "1px dashed var(--border)",
          }}>
            <FontAwesomeIcon icon={faMoneyBillWave} style={{ fontSize: "32px", opacity: 0.3, marginBottom: "12px" }} />
            <p style={{ margin: 0 }}>Nenhum afiliado ativo encontrado.</p>
          </div>
        ) : (
          <div style={{ overflowY: "auto", maxHeight: "520px", paddingRight: "2px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

              {/* Affiliates with owed > 0 */}
              {withOwed.length > 0 && (
                <>
                  <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                    Com saldo a receber — {withOwed.length}
                  </p>
                  {withOwed.map((a) => (
                    <AffiliateRow key={a.affiliateId} a={a} />
                  ))}
                </>
              )}

              {/* Accordion for zeroes */}
              {withoutOwed.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <button
                    onClick={() => setShowZeroAccordion((v) => !v)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: "10px",
                      background: "var(--hover)", border: "1px solid var(--border)",
                      cursor: "pointer", color: "var(--text-muted)",
                      fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                    }}
                  >
                    <span>
                      <FontAwesomeIcon icon={showZeroAccordion ? faChevronDown : faChevronRight} style={{ marginRight: "8px" }} />
                      Sem saldo a receber — {withoutOwed.length}
                    </span>
                  </button>

                  {showZeroAccordion && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                      {withoutOwed.map((a) => (
                        <AffiliateRow key={a.affiliateId} a={a} />
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
