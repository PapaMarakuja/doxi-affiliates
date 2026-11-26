"use client";

import React from "react";
import { Modal } from "@/src/components/ui/Modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";
import { getAchievementIcon } from "@/src/lib/achievements/iconMap";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Card } from "@/src/components/ui/Card";
import { formatCurrency } from "@/src/lib/utils";
import type { AffiliateDashboardRow } from "@/src/types/achievements";

interface AdminAffiliateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliate: AffiliateDashboardRow | null;
}

const formatMonthYear = (dateStr: string | undefined) => {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(dateStr));
};

export function AdminAffiliateDetailModal({ isOpen, onClose, affiliate }: AdminAffiliateDetailModalProps) {
  const summaryCards = [
    {
      label: "Comissão do mês",
      valueClassName: "text-success",
      value: affiliate && formatCurrency(affiliate.total_month),
      hint: affiliate && `Base ${formatCurrency(affiliate.base_month)} · conquistas ${formatCurrency(affiliate.achievements_month)}`,
    },
    {
      label: "Comissão total",
      value: affiliate && formatCurrency(affiliate.total_all_time),
      hint: affiliate && `Base ${formatCurrency(affiliate.base_total)} · conquistas ${formatCurrency(affiliate.achievements_total)}`,
    },
    {
      label: "Saldo a pagar",
      valueClassName: "text-warning",
      value: affiliate && formatCurrency(affiliate.to_pay),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Afiliado" size="lg">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="profile-avatar-circle h-12 w-12 text-lg font-bold">
            {affiliate ? affiliate.name.substring(0, 2).toUpperCase() : "?"}
          </div>
          <div>
            <h3 className="section-title">
              {!affiliate ? <Skeleton width="150px" height="22px" /> : affiliate.name}
            </h3>
            <div className="text-[13px] text-muted">
              {!affiliate ? (
                <Skeleton width="180px" height="16px" />
              ) : (
                `${affiliate.commission_rate}% comissão · ativo desde ${formatMonthYear(affiliate.created_at)}`
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.label} className="metric-card block p-5">
              <div className="metric-label">{card.label}</div>
              <div className={`metric-value text-2xl ${card.valueClassName ?? ""}`}>
                {!affiliate ? <Skeleton width="100px" height="28px" /> : card.value}
              </div>
              {card.hint !== undefined && (
                <div className="metric-hint mt-1.5">
                  {!affiliate ? <Skeleton width="100%" height="14px" /> : card.hint}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase text-muted">Conquistas Desbloqueadas</h4>

          <div className="flex flex-col gap-3">
            {affiliate && affiliate.unlocked_achievements?.length > 0 ? (
              affiliate.unlocked_achievements.map((ach, idx) => (
                <div
                  key={`${ach.id}-${idx}`}
                  className="soft-panel flex items-center justify-between gap-4"
                  style={{ "--reward-color": ach.color_hex || "#ccc" } as React.CSSProperties}
                >
                  <div className="flex items-center gap-4">
                    <div className="reward-icon reward-icon--active m-0 h-10 w-10 rounded-lg text-lg">
                      <FontAwesomeIcon icon={getAchievementIcon(ach.icon_key, faTrophy)} />
                    </div>
                    <div>
                      <h5 className="text-[15px] font-semibold text-main">{ach.title}</h5>
                      <p className="mt-1 text-xs text-muted">
                        {ach.is_repeatable ? "Repetível" : "Vitalícia"} · desbloqueada em {formatMonthYear(ach.unlocked_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-[15px] font-semibold text-success">
                    + {formatCurrency(ach.reward_value ?? 0)}
                  </div>
                </div>
              ))
            ) : affiliate ? (
              <div className="empty-dashed">Nenhuma conquista desbloqueada ainda.</div>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="soft-panel flex items-center justify-between">
                  <div className="flex items-center gap-4">
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
