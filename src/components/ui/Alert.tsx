import React from "react";

export interface AlertProps {
  type: "error" | "success" | "info";
  message: string;
}

export function Alert({ type, message }: AlertProps) {
  return (
    <div className={`alert alert--${type}`} role="alert">
      <span className="alert-icon">
        {type === "error" ? "✕" : type === "success" ? "✓" : "ℹ"}
      </span>
      <span>{message}</span>
    </div>
  );
}
