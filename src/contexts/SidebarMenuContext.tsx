"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { fetchSidebarItems } from "@/src/lib/sidebar/sidebarService";
import type { SidebarItem, SidebarRole } from "@/src/types/sidebarItem";

interface SidebarMenuContextValue {
  /** All items the current user is allowed to see, already filtered by role. */
  topItems: SidebarItem[];
  bottomItems: SidebarItem[];
  isLoading: boolean;
}

const SidebarMenuContext = createContext<SidebarMenuContextValue | null>(null);

interface Props {
  children: React.ReactNode;
  /**
   * The role of the currently authenticated user, passed from the server
   * component so the context is initialized with the correct scope.
   */
  role: SidebarRole;
}

/**
 * Loads sidebar items once per session (with localStorage caching) and
 * provides them to all consumer components via context.
 *
 * The fetch is triggered only when the context first mounts, which happens
 * once per login session inside the dashboard layout.
 *
 * Security note: even though we apply a client-side role filter here for
 * UI consistency, the primary enforcement is Supabase RLS — the database
 * will never return rows the user is not authorised to see.
 */
export function SidebarMenuProvider({ children, role }: Props) {
  const [allItems, setAllItems] = useState<SidebarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const items = await fetchSidebarItems(role);

      if (!cancelled) {
        // Secondary client-side guard: discard any items whose required_role
        // is "admin" when the current user is an affiliate, even if somehow
        // the cache was tampered with.
        const safeItems =
          role === "admin"
            ? items
            : items.filter((item) => item.required_role !== "admin");

        setAllItems(safeItems);
        setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [role]);

  const value = useMemo<SidebarMenuContextValue>(
    () => ({
      topItems: allItems.filter((i) => i.position === "top"),
      bottomItems: allItems.filter((i) => i.position === "bottom"),
      isLoading,
    }),
    [allItems, isLoading]
  );

  return (
    <SidebarMenuContext.Provider value={value}>
      {children}
    </SidebarMenuContext.Provider>
  );
}

export function useSidebarMenu(): SidebarMenuContextValue {
  const ctx = useContext(SidebarMenuContext);
  if (!ctx) {
    throw new Error("useSidebarMenu must be used within a SidebarMenuProvider");
  }
  return ctx;
}
