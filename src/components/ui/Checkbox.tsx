"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

export interface CheckboxProps {
  label?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
  className = "",
}: CheckboxProps) {
  return (
    <label
      className={`checkbox-container ${disabled ? "disabled" : ""} ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "4px",
          border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
          background: checked ? "var(--primary)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          flexShrink: 0
        }}
      >
        {checked && <FontAwesomeIcon icon={faCheck} style={{ color: "#fff", fontSize: "12px" }} />}
      </div>
      {label && <span style={{ fontSize: "14px", color: "var(--text-main)", userSelect: "none" }}>{label}</span>}
    </label>
  );
}
