"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type ConfirmDialogType = "question" | "success" | "warning" | "danger";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  allowClickOutside?: boolean;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
}

interface ConfirmDialogContextValue {
  dialogState: ConfirmDialogState;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

const DEFAULT_STATE: ConfirmDialogState = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Confirmar",
  cancelText: "Cancelar",
  type: "question",
  allowClickOutside: true,
};

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(DEFAULT_STATE);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialogState({
        isOpen: true,
        title: options.title ?? "",
        message: options.message,
        confirmText: options.confirmText ?? "Confirmar",
        cancelText: options.cancelText ?? "Cancelar",
        type: options.type ?? "question",
        allowClickOutside: options.allowClickOutside ?? true,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ dialogState, confirm, handleConfirm, handleCancel }}>
      {children}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  }
  return ctx.confirm;
}

export function useConfirmDialogInternal() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialogInternal must be used within a ConfirmDialogProvider");
  }
  return ctx;
}
