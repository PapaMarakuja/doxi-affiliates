"use client";

import React, { useState, useEffect } from "react";
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
import type { AchievementDefinition, AchievementMetric, AchievementType, ResetPeriod, RewardType } from "@/src/types/achievements";
import type { SelectOption } from "@/src/components/ui/Select";

const DEFAULT_COLOR = "#2196f3";
const ICON_OPTIONS: SelectOption[] = Object.entries(iconMap).map(([key, icon]) => ({ value: key, label: key, icon }));

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: Partial<AchievementDefinition> | null;
  onSaveSuccess: (savedAchievement: AchievementDefinition) => void;
}

export function AchievementModal({ isOpen, onClose, achievement, onSaveSuccess }: AchievementModalProps) {
  const [formData, setFormData] = useState<Partial<AchievementDefinition>>({});
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (achievement) {
      setFormData(achievement);
    } else {
      setFormData({
        type: "commission",
        metric: "total_commission",
        reward_type: "coupon",
        color_hex: DEFAULT_COLOR,
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
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : "Erro ao salvar", type: "error" });
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Tipo"
            options={ACHIEVEMENT_TYPE_OPTIONS}
            value={formData.type}
            onChange={(val) => setFormData({ ...formData, type: val as AchievementType })}
            appendTo="body"
          />
          <Select
            label="Métrica"
            options={ACHIEVEMENT_METRIC_OPTIONS}
            value={formData.metric}
            onChange={(val) => setFormData({ ...formData, metric: val as AchievementMetric })}
            appendTo="body"
          />
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
          <Select
            label="Tipo de Prêmio"
            options={REWARD_TYPE_OPTIONS}
            value={formData.reward_type}
            onChange={(val) => setFormData({ ...formData, reward_type: val as RewardType })}
            appendTo="body"
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <Select
                label="Período de Reset"
                options={RESET_PERIOD_OPTIONS}
                value={formData.reset_period}
                onChange={(val) => setFormData({ ...formData, reset_period: val as ResetPeriod })}
                appendTo="body"
              />
            </div>
            {(formData.reset_period === "monthly" || formData.reset_period === "weekly") && (
              <div className="w-20">
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

        <div className="flex gap-4">
          <div className="flex-1">
            <Select
              label="Ícone"
              placeholder="Selecione um ícone..."
              options={ICON_OPTIONS}
              value={formData.icon_key}
              onChange={(val) => setFormData({ ...formData, icon_key: (val as string | null) ?? null })}
              appendTo="body"
            />
          </div>

          <div className="input-field-container w-[130px]">
            <span className="input-label">Cor</span>
            <label className="input-field flex min-h-[48px] cursor-pointer items-center gap-3 px-2 py-1.5">
              <input
                type="color"
                className="h-8 w-8 cursor-pointer rounded-md border-0 bg-transparent p-0"
                value={formData.color_hex || DEFAULT_COLOR}
                onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
              />
              <span className="font-mono text-sm">{formData.color_hex || DEFAULT_COLOR}</span>
            </label>
          </div>
        </div>

        <div className="my-2">
          <Checkbox
            label="Conquista Repetível (Pode ser ganha mais de uma vez?)"
            checked={formData.is_repeatable || false}
            onChange={(checked) => setFormData({ ...formData, is_repeatable: checked })}
          />
        </div>

        <Button onClick={handleSave} loading={loading}>
          {formData.id ? "Salvar Alterações" : "Criar Conquista"}
        </Button>
      </div>
    </Modal>
  );
}
