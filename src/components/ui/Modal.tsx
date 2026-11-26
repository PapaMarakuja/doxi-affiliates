"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  id?: string;
  zIndex?: number;
}

const MODAL_SIZES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "modal--sm",
  md: "modal--md",
  lg: "modal--lg",
  xl: "modal--xl",
};

const CLOSE_ANIMATION_MS = 200;

export function Modal({
  isOpen,
  onClose,
  title,
  footer,
  children,
  size = "md",
  closeOnOverlayClick = true,
  id,
  zIndex,
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const closeRequestedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Sync with `isOpen` during render (React's recommended alternative to setState inside an effect).
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
    } else if (isMounted) {
      setIsClosing(true);
    }
  }

  // Unmount after the closing animation; notify the parent only when the modal closed itself.
  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      setIsClosing(false);
      setIsMounted(false);
      if (closeRequestedRef.current) {
        closeRequestedRef.current = false;
        onCloseRef.current();
      }
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [isClosing]);

  const triggerClose = useCallback(() => {
    if (isClosing) return;
    closeRequestedRef.current = true;
    setIsClosing(true);
  }, [isClosing]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    },
    [triggerClose]
  );

  useEffect(() => {
    if (!isMounted) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMounted, handleKeyDown]);

  if (!isMounted && !isOpen) return null;
  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`modal-overlay ${isClosing ? "modal-overlay--closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title && id ? `${id}-title` : undefined}
      onClick={closeOnOverlayClick ? triggerClose : undefined}
      style={zIndex ? { zIndex } : undefined}
    >
      <div
        className={`modal-panel ${MODAL_SIZES[size]} ${isClosing ? "modal-panel--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        id={id}
      >
        {title !== undefined && (
          <div className="modal-header">
            <span
              id={id ? `${id}-title` : undefined}
              className="modal-title"
            >
              {title}
            </span>
            <button
              className="modal-close-btn"
              onClick={triggerClose}
              aria-label="Fechar modal"
              type="button"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer !== undefined && (
          <div className="modal-footer">{footer}</div>
        )}
      </div>
    </div>
  );
}
