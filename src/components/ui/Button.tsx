import React from "react";

export type ButtonVariant = "primary" | "success" | "info" | "warning" | "danger" | "transparent";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: ButtonVariant;
  outline?: boolean;
  circle?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Button({
  loading = false,
  variant = "primary",
  outline = false,
  circle = false,
  size = "md",
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const variantClass = (variant !== "primary" || circle) ? `ui-button--${variant}` : "";
  const outlineClass = outline ? "ui-button--outline" : "";
  const circleClass = circle ? "ui-button--circle" : "";
  const sizeClass = circle
    ? `ui-button--${size}`
    : (size !== "md" ? `ui-button--${size}` : "");

  return (
    <button
      className={`ui-button ${variantClass} ${outlineClass} ${circleClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="ui-button-spinner" />
      ) : null}
      {(!loading || !circle) && children}
    </button>
  );
}
