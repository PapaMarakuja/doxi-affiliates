import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/src/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconDefinition;
}

interface SegmentedControlProps<T extends string> {
  label?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange, disabled }: SegmentedControlProps<T>) {
  return (
    <div className="input-field-container">
      {label && <span className="input-label">{label}</span>}
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={cn("segmented-option", option.value === value && "segmented-option--active")}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.icon && <FontAwesomeIcon icon={option.icon} />}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
