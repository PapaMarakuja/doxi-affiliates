import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faTimes, faCheck } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: IconDefinition;
}

export type SelectValue = string | number | (string | number)[] | null;

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number | (string | number)[] | null;
  onChange?: (value: SelectValue) => void;
  icon?: React.ReactNode;
  error?: string;
  className?: string;
  style?: React.CSSProperties;
  clearable?: boolean;
  multiple?: boolean;
  closeOnClick?: boolean;
  placeholder?: string;
  appendTo?: "body" | null;
}

export function Select({
  label,
  options,
  value,
  onChange,
  icon,
  error,
  className = "",
  style,
  clearable = true,
  multiple = false,
  closeOnClick,
  placeholder = "Selecione...",
  appendTo = null,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const closeDropdown = () => {
    setIsOpen(false);
    setSearchTerm("");
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  // Determina se fecha ao clicar (por padrão, single fecha e multiple não fecha)
  const shouldCloseOnClick = closeOnClick !== undefined ? closeOnClick : !multiple;

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideContainer && !isInsideDropdown) {
        closeDropdown();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && containerRef.current) {
      setDropdownRect(containerRef.current.getBoundingClientRect());
    }
    if (isOpen) closeDropdown();
    else setIsOpen(true);
  };

  const handleSelect = (option: SelectOption, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.includes(option.value);

      let newValues;
      if (isSelected) {
        newValues = currentValues.filter((v) => v !== option.value);
      } else {
        newValues = [...currentValues, option.value];
      }
      onChange?.(newValues);
    } else {
      onChange?.(option.value);
    }

    if (shouldCloseOnClick) closeDropdown();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : null);
    if (shouldCloseOnClick) closeDropdown();
  };

  // Determinar o texto a ser exibido
  let displayLabel = placeholder;
  let hasSelection = false;

  if (multiple && Array.isArray(value)) {
    if (value.length > 0) {
      hasSelection = true;
      const selectedLabels = options
        .filter((opt) => value.includes(opt.value))
        .map((opt) => opt.label);
      displayLabel = selectedLabels.length > 2
        ? `${selectedLabels.length} selecionados`
        : selectedLabels.join(", ");
    }
  } else if (!multiple && value !== undefined && value !== null && value !== "") {
    const selectedOpt = options.find((opt) => opt.value === value);
    if (selectedOpt) {
      hasSelection = true;
      displayLabel = selectedOpt.label;
    }
  }

  const selectedOption = !multiple ? options.find((opt) => opt.value === value) : undefined;
  const isPortal = appendTo === "body";
  // Portal dropdowns are positioned from the trigger's measured rect; open upward when there is no room below.
  const DROPDOWN_MAX_HEIGHT = 300;
  const opensUp = !!dropdownRect && typeof window !== "undefined" &&
    dropdownRect.bottom + DROPDOWN_MAX_HEIGHT + 16 > window.innerHeight && dropdownRect.top > DROPDOWN_MAX_HEIGHT + 16;
  const portalStyle: React.CSSProperties | undefined = isPortal && dropdownRect
    ? {
      left: dropdownRect.left,
      width: dropdownRect.width,
      ...(opensUp ? { top: "auto", bottom: window.innerHeight - dropdownRect.top + 8 } : { top: dropdownRect.bottom + 8 }),
    }
    : undefined;

  const DropdownMenu = (
    <div
      ref={dropdownRef}
      className={`select-dropdown ${isPortal ? "select-dropdown--portal" : ""}`}
      style={portalStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="select-search">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {filteredOptions.length === 0 ? (
        <div className="select-empty">Nenhuma opção encontrada</div>
      ) : (
        filteredOptions.map((opt) => {
          const isSelected = multiple
            ? Array.isArray(value) && value.includes(opt.value)
            : value === opt.value;

          return (
            <div
              key={opt.value}
              onClick={(e) => handleSelect(opt, e)}
              className={`select-option ${isSelected ? "select-option--selected" : ""}`}
            >
              {opt.icon && <FontAwesomeIcon icon={opt.icon} className="select-option-icon" />}
              <span className="select-option-label">{opt.label}</span>
              {isSelected && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className={`input-field-container ${className}`} style={style} ref={containerRef}>
      {label && (
        <div className="input-label-row">
          <label className="input-label">{label}</label>
        </div>
      )}

      <div className="input-wrapper select-trigger" onClick={handleToggle}>
        {icon && <span className="input-icon">{icon}</span>}

        <div
          className={`input-field ${icon ? "input-has-icon" : ""} ${clearable ? "input-has-suffix" : ""} ${error ? "input-error-state" : ""} ${hasSelection ? "select-has-value" : ""}`}
        >
          {selectedOption?.icon && <FontAwesomeIcon icon={selectedOption.icon} className="select-option-icon" />}
          <span className="select-value">{displayLabel}</span>
        </div>

        <div className="input-suffix select-suffix">
          {clearable && hasSelection && (
            <div onClick={handleClear} className="select-clear-btn">
              <FontAwesomeIcon icon={faTimes} />
            </div>
          )}
          <FontAwesomeIcon icon={faChevronDown} className={`select-chevron ${isOpen ? "select-chevron--open" : ""}`} />
        </div>

        {isOpen && (
          isPortal && typeof document !== "undefined"
            ? createPortal(DropdownMenu, document.body)
            : DropdownMenu
        )}
      </div>

      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
