"use client";

import React, { createContext, useContext, useCallback, useState, useRef } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: React.ReactNode;
  type: ToastType;
  duration: number;
  exiting: boolean;
}

export interface ToastOptions {
  message: React.ReactNode;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));

    // Remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    }, 300);
  }, []);

  const addToast = useCallback(
    (options: ToastOptions): string => {
      const id = `toast-${++toastCounter}`;
      const duration = options.duration ?? 3500;

      const toast: ToastItem = {
        id,
        message: options.message,
        type: options.type ?? "info",
        duration,
        exiting: false,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss
      const timer = setTimeout(() => removeToast(id), duration);
      timersRef.current.set(id, timer);

      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
