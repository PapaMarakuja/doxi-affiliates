import React from "react";

export type ButtonVariant = "primary" | "success" | "info" | "warning" | "danger" | "transparent";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: ButtonVariant;
  outline?: boolean;
}

export function Button({
  loading = false,
  variant = "primary",
  outline = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const variantClass = variant !== "primary" ? `ui-button--${variant}` : "";
  const outlineClass = outline ? "ui-button--outline" : "";

  return (
    <button
      className={`ui-button ${variantClass} ${outlineClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span style={{
          display: "inline-block",
          width: "18px",
          height: "18px",
          border: "2px solid rgba(32, 68, 87, 0.2)",
          borderTopColor: "currentColor",
          borderRadius: "50%",
          animation: "spin 1s infinite linear",
          marginRight: "8px"
        }} />
      ) : null}
      {children}
    </button>
  );
}
