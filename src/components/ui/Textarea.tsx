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
  ...props
}: TextareaProps) {
  return (
    <div className="input-field-container">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className="input-wrapper input-wrapper--textarea">
        {icon && <span className="input-icon">{icon}</span>}
        <textarea
          id={id}
          className={`input-field ${icon ? "input-has-icon" : ""} ${error ? "input-error-state" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
