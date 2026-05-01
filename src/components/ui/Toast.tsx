"use client";

import React from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
  faCircleInfo,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useToast, type ToastItem, type ToastType } from "@/src/contexts/ToastContext";

export type { ToastType } from "@/src/contexts/ToastContext";

const TOAST_CONFIG: Record<ToastType, { icon: typeof faCircleCheck; className: string }> = {
  success: { icon: faCircleCheck, className: "toast--success" },
  error: { icon: faCircleXmark, className: "toast--error" },
  info: { icon: faCircleInfo, className: "toast--info" },
};

function ToastItemComponent({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToast();
  const config = TOAST_CONFIG[toast.type];

  return (
    <div
      className={`toast ${config.className} ${toast.exiting ? "toast--exiting" : "toast--entering"}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">
        <FontAwesomeIcon icon={config.icon} />
      </span>
      <div className="toast-message">{toast.message}</div>
      <button
        className="toast-close"
        onClick={() => removeToast(toast.id)}
        aria-label="Fechar notificação"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}
