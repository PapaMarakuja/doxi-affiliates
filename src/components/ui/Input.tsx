import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rightLabel?: React.ReactNode;
  icon?: React.ReactNode;
  error?: string;
  suffix?: React.ReactNode;
}

export function Input({
  label,
  rightLabel,
  icon,
  error,
  suffix,
  id,
  type,
  className = "",
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword ? (showPassword ? "text" : "password") : type;

  let inputModeParams = {};
  if (type === "number") {
    inputModeParams = { inputMode: "numeric", pattern: "[0-9]*" };
  }

  return (
    <div className="input-field-container">
      {(label || rightLabel) && (
        <div className="input-label-row">
          {label && (
            <label htmlFor={id} className="input-label">
              {label}
            </label>
          )}
          {rightLabel && <div className="input-right-label">{rightLabel}</div>}
        </div>
      )}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={id}
          type={currentType}
          className={`input-field ${icon ? "input-has-icon" : ""} ${
            suffix || isPassword ? "input-has-suffix" : ""
          } ${error ? "input-error-state" : ""} ${className}`}
          {...inputModeParams}
          {...props}
        />
        {suffix && (
          <div className="input-suffix">
            {suffix}
          </div>
        )}
        {isPassword && (
          <button
            type="button"
            className="input-password-toggle input-suffix"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--input-icon)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </button>
        )}
      </div>
      {error && <span className="input-error" style={{ color: "var(--error-text)", fontSize: "12px" }}>{error}</span>}
    </div>
  );
}
