"use client";

import React from "react";
import { cn } from "@/src/lib/utils";

export interface CheckboxProps {
  label?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({ label, checked, onChange, disabled = false, className, id }: CheckboxProps) {
  return (
    <label className={cn("custom-checkbox-wrapper mb-0", disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        id={id}
        type="checkbox"
        className="custom-checkbox shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {label && <span className="custom-checkbox-label text-main">{label}</span>}
    </label>
  );
}
