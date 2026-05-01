import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { SidebarItem, SidebarRole } from "@/src/types/sidebarItem";

const CACHE_KEY = "doxi_sidebar_items";
const CACHE_VERSION = 1;

interface SidebarCache {
  version: number;
  role: SidebarRole;
  items: SidebarItem[];
}

/**
 * Reads the sidebar cache from localStorage.
 * Returns null if the cache is absent, stale, or belongs to a different role.
 */
function readCache(role: SidebarRole): SidebarItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cache: SidebarCache = JSON.parse(raw);

    // Invalidate if version bumped or if role changed (e.g. different user)
    if (cache.version !== CACHE_VERSION || cache.role !== role) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return cache.items;
  } catch {
    return null;
  }
}

/**
 * Persists sidebar items to localStorage together with metadata that
 * allows future reads to detect stale / mismatched caches.
 */
function writeCache(role: SidebarRole, items: SidebarItem[]): void {
  try {
    const cache: SidebarCache = { version: CACHE_VERSION, role, items };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage might be full or unavailable — fail silently.
  }
}

/**
 * Clears the sidebar cache.  Call this on logout so the next user
 * starts fresh.
 */
export function clearSidebarCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Fetches sidebar items for the currently authenticated user.
 *
 * Strategy:
 *  1. If a valid cache entry exists for this role, return it immediately.
 *  2. Otherwise, query Supabase.  RLS ensures the DB only returns rows the
 *     user is actually allowed to see, so no client-side role filtering is
 *     needed at this layer.
 *  3. Persist the result to localStorage so subsequent page navigations
 *     within the same session avoid a round-trip.
 */
export async function fetchSidebarItems(role: SidebarRole): Promise<SidebarItem[]> {
  const cached = readCache(role);
  if (cached) return cached;

  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sidebar_items")
    .select("id, label, route, icon, required_role, position, sort_order")
    .eq("hidden", false)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[SidebarService] Failed to fetch sidebar items:", error?.message);
    return [];
  }

  const items = data as SidebarItem[];
  writeCache(role, items);

  return items;
}
