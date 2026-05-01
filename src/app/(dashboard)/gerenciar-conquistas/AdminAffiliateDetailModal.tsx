"use client";

import React from "react";
import { Modal } from "@/src/components/ui/Modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faCheckCircle, faClock } from "@fortawesome/free-solid-svg-icons";
import { iconMap } from "@/src/lib/achievements/iconMap";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Card } from "@/src/components/ui/Card";

interface AdminAffiliateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliate: any;
}

export function AdminAffiliateDetailModal({ isOpen, onClose, affiliate }: AdminAffiliateDetailModalProps) {
  // Removing early return to allow skeleton rendering

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(d);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Afiliado" size="lg">
      <div className="flex flex-col gap-6">
        
        {/* Header with affiliate info */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%", background: "var(--pink-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--navy)", fontSize: "18px", fontWeight: "bold"
          }}>
            {affiliate ? affiliate.name.substring(0, 2).toUpperCase() : "?"}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-main)" }}>
              {!affiliate ? <Skeleton width="150px" height="22px" /> : affiliate.name}
            </h3>
            <div style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
              {!affiliate ? (
                <Skeleton width="180px" height="16px" />
              ) : (
                `${affiliate.commission_rate}% comissão · ativo desde ${formatDate(affiliate.created_at)}`
              )}
            </div>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card style={{ padding: "20px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Comissão do mês</p>
            <h4 style={{ margin: 0, fontSize: "24px", color: "var(--success)" }}>
              {!affiliate ? <Skeleton width="100px" height="28px" /> : formatCurrency(affiliate.total_month)}
            </h4>
            <div style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              {!affiliate ? (
                <Skeleton width="100%" height="14px" />
              ) : (
                `Base ${formatCurrency(affiliate.base_month)} · conquistas ${formatCurrency(affiliate.achievements_month)}`
              )}
            </div>
          </Card>
          
          <Card style={{ padding: "20px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Comissão total</p>
            <h4 style={{ margin: 0, fontSize: "24px", color: "var(--text-main)" }}>
              {!affiliate ? <Skeleton width="100px" height="28px" /> : formatCurrency(affiliate.total_all_time)}
            </h4>
            <div style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
              {!affiliate ? (
                <Skeleton width="100%" height="14px" />
              ) : (
                `Base ${formatCurrency(affiliate.base_total)} · conquistas ${formatCurrency(affiliate.achievements_total)}`
              )}
            </div>
          </Card>

          <Card style={{ padding: "20px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Saldo a pagar</p>
            <h4 style={{ margin: 0, fontSize: "24px", color: "var(--warning)" }}>
              {!affiliate ? <Skeleton width="100px" height="28px" /> : formatCurrency(affiliate.to_pay)}
            </h4>
          </Card>
        </div>

        {/* Unlocked Achievements List */}
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>
            Conquistas Desbloqueadas
          </h4>
          
          <div className="flex flex-col gap-3">
            {affiliate && affiliate.unlocked_achievements?.length > 0 ? (
              affiliate.unlocked_achievements.map((ach: any, idx: number) => {
                const iconDef = ach.icon_key ? iconMap[ach.icon_key] : faTrophy;
                return (
                  <div key={`${ach.id}-${idx}`} style={{ 
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "8px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ 
                        width: "40px", height: "40px", borderRadius: "8px", 
                        background: `${ach.color_hex || '#ccc'}20`,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <FontAwesomeIcon icon={iconDef} style={{ color: ach.color_hex || '#ccc', fontSize: "18px" }} />
                      </div>
                      <div>
                        <h5 style={{ margin: 0, fontSize: "15px", color: "var(--text-main)", fontWeight: 600 }}>
                          {ach.title}
                        </h5>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                          {ach.is_repeatable ? "Repetível" : "Vitalícia"} · desbloqueada em {formatDate(ach.unlocked_at)}
                        </p>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--success)", fontSize: "15px" }}>
                      + {formatCurrency(ach.reward_value)}
                    </div>
                  </div>
                );
              })
            ) : affiliate ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", background: "var(--card-bg)", borderRadius: "8px", border: "1px dashed var(--border)" }}>
                Nenhuma conquista desbloqueada ainda.
              </div>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ 
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "8px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <Skeleton circle width="40px" height="40px" />
                    <div>
                      <Skeleton width="120px" height="18px" className="mb-1" />
                      <Skeleton width="180px" height="14px" />
                    </div>
                  </div>
                  <Skeleton width="60px" height="20px" />
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
}
