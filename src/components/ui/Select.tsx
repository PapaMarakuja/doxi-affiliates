import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faTimes, faCheck } from "@fortawesome/free-solid-svg-icons";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number | (string | number)[] | null;
  onChange?: (value: any) => void;
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
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) setSearchTerm("");
    if (isOpen && containerRef.current) {
      setDropdownRect(containerRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && containerRef.current) {
      setDropdownRect(containerRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
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

    if (shouldCloseOnClick) {
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : null);
    if (shouldCloseOnClick) {
      setIsOpen(false);
    }
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

  const DropdownMenu = (
    <div
      ref={dropdownRef}
      className="select-dropdown"
      style={{
        position: appendTo === "body" ? "fixed" : "absolute",
        top: appendTo === "body"
          ? (dropdownRect ? dropdownRect.bottom + 8 : 0)
          : "calc(100% + 8px)",
        left: appendTo === "body"
          ? (dropdownRect ? dropdownRect.left : 0)
          : 0,
        width: appendTo === "body"
          ? (dropdownRect ? dropdownRect.width : "100%")
          : "100%",
        background: "var(--dropdown-bg)",
        boxShadow: "var(--dropdown-shadow)",
        borderRadius: "var(--border-radius)",
        border: "1px solid var(--border)",
        zIndex: appendTo === "body" ? 100000 : 50,
        maxHeight: "300px",
        overflowY: "auto",
        padding: "8px",
        animation: "slideDown 0.2s ease",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }}
      onClick={(e) => e.stopPropagation()} // Previne fechar se clicar no fundo do menu
    >
      {/* Campo de Busca */}
      <div style={{ padding: "4px 4px 8px 4px", position: "sticky", top: 0, background: "var(--dropdown-bg)", zIndex: 1 }}>
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            background: "var(--input-bg)",
            color: "var(--text-main)",
            fontSize: "13px",
            outline: "none"
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {filteredOptions.length === 0 ? (
        <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
          Nenhuma opção encontrada
        </div>
      ) : (
        filteredOptions.map((opt) => {
          const isSelected = multiple
            ? Array.isArray(value) && value.includes(opt.value)
            : value === opt.value;

          return (
            <div
              key={opt.value}
              onClick={(e) => handleSelect(opt, e)}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: isSelected ? "var(--sidebar-active-bg)" : "transparent",
                color: isSelected ? "var(--sidebar-active-text)" : "var(--text-main)",
                fontWeight: isSelected ? 600 : 400,
                fontSize: "14px",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = "var(--dropdown-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{opt.label}</span>
              {isSelected && (
                <FontAwesomeIcon icon={faCheck} style={{ fontSize: "12px" }} />
              )}
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

      <div
        className="input-wrapper"
        style={{ cursor: "pointer", position: "relative" }}
        onClick={handleToggle}
      >
        {icon && <span className="input-icon">{icon}</span>}

        <div
          className={`input-field ${icon ? "input-has-icon" : ""} ${clearable ? "input-has-suffix" : ""
            } ${error ? "input-error-state" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            userSelect: "none",
            minHeight: "48px", // Padrão de altura do input
            color: hasSelection ? "var(--text-main)" : "var(--input-placeholder)"
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {displayLabel}
          </span>
        </div>

        {/* Sufixo: Limpar e Ícone da Seta */}
        <div className="input-suffix" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {clearable && hasSelection && (
            <div
              onClick={handleClear}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "rgba(224, 81, 81, 0.15)",
                color: "var(--error-text)",
                fontSize: "10px",
                transition: "all 0.2s",
                zIndex: 2
              }}
              className="select-clear-btn"
            >
              <FontAwesomeIcon icon={faTimes} />
            </div>
          )}
          <FontAwesomeIcon
            icon={faChevronDown}
            style={{
              transition: "transform 0.3s ease",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              color: "var(--input-icon)",
              fontSize: "12px",
              pointerEvents: "none"
            }}
          />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          appendTo === "body" && typeof document !== "undefined"
            ? createPortal(DropdownMenu, document.body)
            : DropdownMenu
        )}
      </div>

      {error && <span className="input-error" style={{ color: "var(--error-text)", fontSize: "12px" }}>{error}</span>}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .select-clear-btn:hover {
          background: rgba(224, 81, 81, 0.3) !important;
        }
      `}} />
    </div>
  );
}
