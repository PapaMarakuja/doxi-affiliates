"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "@/src/components/ui/Modal";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import { Checkbox } from "@/src/components/ui/Checkbox";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/contexts/ToastContext";
import { iconMap } from "@/src/lib/achievements/iconMap";
import { 
  ACHIEVEMENT_TYPE_OPTIONS, 
  ACHIEVEMENT_METRIC_OPTIONS, 
  REWARD_TYPE_OPTIONS, 
  RESET_PERIOD_OPTIONS 
} from "@/src/lib/achievements/achievementMappings";
import type { AchievementDefinition } from "@/src/types/achievements";

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: Partial<AchievementDefinition> | null;
  onSaveSuccess: (savedAchievement: AchievementDefinition) => void;
}

export function AchievementModal({ isOpen, onClose, achievement, onSaveSuccess }: AchievementModalProps) {
  const [formData, setFormData] = useState<Partial<AchievementDefinition>>({});
  const [loading, setLoading] = useState(false);
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);
  const [iconDropdownRect, setIconDropdownRect] = useState<DOMRect | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (achievement) {
      setFormData(achievement);
    } else {
      setFormData({
        type: "commission",
        metric: "total_commission",
        reward_type: "coupon",
        color_hex: "#2196f3",
        reset_period: "never",
        sort_order: 1
      });
    }
  }, [achievement, isOpen]);

  const handleSave = async () => {
    if (!formData.title || !formData.goal || !formData.metric) {
      addToast({ message: "Preencha os campos obrigatórios.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const method = formData.id ? "PUT" : "POST";
      const url = formData.id ? `/api/achievements/${formData.id}` : "/api/achievements";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (res.ok) {
        addToast({ message: `Conquista ${formData.id ? "atualizada" : "criada"} com sucesso!`, type: "success" });
        onSaveSuccess(result.data);
        onClose();
      } else {
        throw new Error(result.error || "Erro ao salvar");
      }
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={formData.id ? "Editar Conquista" : "Nova Conquista"} 
      size="md"
    >
      <div className="flex flex-col gap-4">
        <Input 
          label="Título" 
          value={formData.title || ""} 
          onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
          placeholder="Ex: Super Vendedor"
        />
        <Input 
          label="Descrição" 
          value={formData.description || ""} 
          onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
          placeholder="Descrição da conquista..."
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Select
            label="Tipo"
            options={ACHIEVEMENT_TYPE_OPTIONS}
            value={formData.type}
            onChange={(val) => setFormData({ ...formData, type: val as any })}
            appendTo="body"
          />
          <Select
            label="Métrica"
            options={ACHIEVEMENT_METRIC_OPTIONS}
            value={formData.metric}
            onChange={(val) => setFormData({ ...formData, metric: val as any })}
            appendTo="body"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Input 
            label="Meta (Valor)" 
            type="number" 
            value={formData.goal || 0} 
            onChange={(e) => setFormData({ ...formData, goal: Number(e.target.value) })} 
          />
          <Input 
            label="Valor do Prêmio" 
            type="number" 
            value={formData.reward_value || 0} 
            onChange={(e) => setFormData({ ...formData, reward_value: Number(e.target.value) })} 
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Select
            label="Tipo de Prêmio"
            options={REWARD_TYPE_OPTIONS}
            value={formData.reward_type}
            onChange={(val) => setFormData({ ...formData, reward_type: val as any })}
            appendTo="body"
          />
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <Select
                label="Período de Reset"
                options={RESET_PERIOD_OPTIONS}
                value={formData.reset_period}
                onChange={(val) => setFormData({ ...formData, reset_period: val as any })}
                appendTo="body"
              />
            </div>
            {(formData.reset_period === "monthly" || formData.reset_period === "weekly") && (
              <div style={{ width: "80px" }}>
                <Input
                  label="Dia"
                  type="number"
                  value={formData.reset_day || 1}
                  onChange={(e) => setFormData({ ...formData, reset_day: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <label className="input-label" style={{ display: "block", marginBottom: "8px" }}>Ícone</label>
            <div
              onClick={(e) => {
                setIconDropdownRect(e.currentTarget.getBoundingClientRect());
                setIconDropdownOpen(!iconDropdownOpen);
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px", border: "1px solid var(--border)", borderRadius: "8px",
                background: "var(--card-bg)", cursor: "pointer", height: "48px"
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {formData.icon_key && iconMap[formData.icon_key] ? (
                  <>
                    <FontAwesomeIcon icon={iconMap[formData.icon_key]} style={{ width: "20px", color: formData.color_hex || "var(--text-main)" }} />
                    <span style={{ color: "var(--text-main)" }}>{formData.icon_key}</span>
                  </>
                ) : (
                  <span style={{ color: "var(--input-placeholder)" }}>Selecione um ícone...</span>
                )}
              </div>
              <FontAwesomeIcon icon={faChevronDown} style={{ color: "var(--input-icon)", fontSize: "12px" }} />
            </div>
            {iconDropdownOpen && iconDropdownRect && typeof document !== "undefined" && createPortal(
              <>
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }} onClick={() => setIconDropdownOpen(false)} />
                <div style={{
                  position: "absolute", 
                  top: iconDropdownRect.bottom + 4, 
                  left: iconDropdownRect.left, 
                  width: iconDropdownRect.width, 
                  zIndex: 100000,
                  background: "var(--dropdown-bg)", 
                  border: "1px solid var(--border)",
                  borderRadius: "8px", 
                  maxHeight: "200px", 
                  overflowY: "auto",
                  boxShadow: "var(--dropdown-shadow)"
                }}>
                  {Object.keys(iconMap).map(key => (
                    <div
                      key={key}
                      onClick={() => { setFormData({ ...formData, icon_key: key }); setIconDropdownOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
                        cursor: "pointer", transition: "background 0.2s",
                        color: "var(--text-main)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <FontAwesomeIcon icon={iconMap[key]} style={{ width: "20px" }} />
                      <span>{key}</span>
                    </div>
                  ))}
                </div>
              </>,
              document.body
            )}
          </div>

          <div style={{ width: "120px" }}>
            <label className="input-label" style={{ display: "block", marginBottom: "8px" }}>Cor</label>
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "6px", border: "1px solid var(--border)", borderRadius: "8px",
              background: "var(--card-bg)", height: "48px"
            }}>
              <input
                type="color"
                value={formData.color_hex || "#2196f3"}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                style={{
                  width: "32px", height: "32px", padding: 0, border: "none",
                  borderRadius: "6px", cursor: "pointer", background: "transparent"
                }}
              />
              <span style={{ fontSize: "14px", color: "var(--text-main)", fontFamily: "monospace" }}>
                {formData.color_hex || "#2196f3"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBlock: '20px' }}>
          <Checkbox
            label="Conquista Repetível (Pode ser ganha mais de uma vez?)"
            checked={formData.is_repeatable || false}
            onChange={(checked) => setFormData({ ...formData, is_repeatable: checked })}
          />
        </div>

        <Button onClick={handleSave} loading={loading} style={{ marginTop: "16px" }}>
          {formData.id ? "Salvar Alterações" : "Criar Conquista"}
        </Button>
      </div>
    </Modal>
  );
}
