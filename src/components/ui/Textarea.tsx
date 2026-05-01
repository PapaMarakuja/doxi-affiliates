import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export function Textarea({
  label,
  icon,
  error,
  id,
  className = "",
  style,
  ...props
}: TextareaProps) {
  return (
    <div className="input-field-container">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper" style={{ alignItems: "flex-start" }}>
        {icon && <span className="input-icon" style={{ top: "16px" }}>{icon}</span>}
        <textarea
          id={id}
          className={`input-field ${icon ? "input-has-icon" : ""} ${error ? "input-error-state" : ""} ${className}`}
          style={{ minHeight: "120px", resize: "vertical", paddingTop: "14px", ...style }}
          {...props}
        />
      </div>
      {error && <span className="input-error" style={{ color: "var(--error-text)", fontSize: "12px" }}>{error}</span>}
    </div>
  );
}
