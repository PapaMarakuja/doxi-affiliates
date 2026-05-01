"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

export default function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Initial check on mount
    const stored = localStorage.getItem("theme");
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && preferDark);
    
    setDark(isDark);
    
    if (!stored) {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    if (dark === null) return; // Prevent effect on first render

    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  if (dark === null) {
    // render placeholder button to avoid hydration mismatch while loading theme
    return (
      <button className={`theme-toggle-btn ${collapsed ? "theme-toggle-btn--collapsed" : ""}`}>
        <span className="sidebar-link-icon">
          <FontAwesomeIcon icon={faMoon} />
        </span>
        {!collapsed && <span>Tema</span>}
      </button>
    );
  }

  return (
    <button
      onClick={() => setDark(!dark)}
      className={`theme-toggle-btn ${collapsed ? "theme-toggle-btn--collapsed" : ""}`}
    >
      <span className="sidebar-link-icon">
        <FontAwesomeIcon icon={dark ? faSun : faMoon} />
      </span>
      {!collapsed && <span>{dark ? "Modo Claro" : "Modo Escuro"}</span>}
    </button>
  );
}
