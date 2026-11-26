"use client";

import { useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

export interface ThemeToggleProps {
  collapsed?: boolean;
  variant?: "sidebar" | "floating";
  className?: string;
}

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "class") {
        callback();
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    window.removeEventListener("storage", callback);
    mediaQuery.removeEventListener("change", callback);
    observer.disconnect();
  };
}

function getThemeSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

const subscribeNothing = () => () => {};

function getServerThemeSnapshot(): boolean {
  return false;
}

export default function ThemeToggle({
  collapsed = false,
  variant = "sidebar",
  className = "",
}: ThemeToggleProps) {
  // true only on the client, after hydration (avoids theme icon mismatch).
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    if (isCurrentlyDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  if (variant === "floating") {
    if (!mounted) {
      return (
        <button
          type="button"
          className={`theme-toggle-floating ${className}`}
          aria-label="Alternar tema"
          suppressHydrationWarning
        >
          <span className="theme-toggle-floating-icon">
            <FontAwesomeIcon icon={faMoon} />
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-toggle-floating ${className}`}
        aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        suppressHydrationWarning
      >
        <span className="theme-toggle-floating-icon">
          <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
        </span>
      </button>
    );
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className={`theme-toggle-btn ${collapsed ? "theme-toggle-btn--collapsed" : ""} ${className}`}
        aria-label="Alternar tema"
        suppressHydrationWarning
      >
        <span className="sidebar-link-icon">
          <FontAwesomeIcon icon={faMoon} />
        </span>
        {!collapsed && <span>Tema</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${collapsed ? "theme-toggle-btn--collapsed" : ""} ${className}`}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      suppressHydrationWarning
    >
      <span className="sidebar-link-icon">
        <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
      </span>
      {!collapsed && <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>}
    </button>
  );
}
