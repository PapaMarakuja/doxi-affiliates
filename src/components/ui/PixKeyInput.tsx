"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faEnvelope, faIdCard, faPhone, faRandom } from "@fortawesome/free-solid-svg-icons";
import { Input, InputProps } from "@/src/components/ui/Input";
import { applyPixMask, guessPixType } from "@/src/lib/masks";

const PIX_TYPES = [
  { value: "cpf_cnpj", label: "CPF/CNPJ", icon: faIdCard },
  { value: "phone", label: "Celular", icon: faPhone },
  { value: "email", label: "E-mail", icon: faEnvelope },
  { value: "random", label: "Aleatória", icon: faRandom },
] as const;

export type PixType = (typeof PIX_TYPES)[number]["value"];

interface PixKeyInputProps extends Omit<InputProps, "value" | "onChange" | "suffix"> {
  value: string;
  onChange: (maskedValue: string) => void;
}

/** PIX key field with a key-type picker; masks the value according to the selected/guessed type. */
export function PixKeyInput({ value, onChange, className = "", ...props }: PixKeyInputProps) {
  const [manualType, setManualType] = useState<PixType | null>(null);
  const currentType = manualType || guessPixType(value || "");
  const currentConfig = PIX_TYPES.find((t) => t.value === currentType) || PIX_TYPES[3];

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as PixType;
    setManualType(type);
    const rawValue = type === "phone" || type === "cpf_cnpj" ? value.replace(/\D/g, "") : value;
    onChange(applyPixMask(rawValue, type));
  };

  const typePicker = (
    <div className="pix-type-picker">
      <FontAwesomeIcon icon={currentConfig.icon} className="text-brand" />
      <span>{currentConfig.label}</span>
      <FontAwesomeIcon icon={faChevronDown} className="text-[10px] opacity-50" />
      <select value={currentType} onChange={handleTypeChange} title="Tipo de Chave Pix" disabled={props.disabled}>
        {PIX_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => onChange(applyPixMask(e.target.value, manualType || guessPixType(e.target.value)))}
      suffix={typePicker}
      className={`pix-input-override ${className}`}
    />
  );
}
