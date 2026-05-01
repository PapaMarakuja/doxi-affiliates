"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaw, faAnglesLeft, faAnglesRight } from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "./ThemeToggle";
import { useSidebarMenu } from "@/src/contexts/SidebarMenuContext";
import { iconMap } from "@/src/lib/sidebar/iconMap";
import type { SidebarItem } from "@/src/types/sidebarItem";
import { Skeleton } from "./ui/Skeleton";
import Logo from "@/src/assets/images/doxi-club.png";
import Image from "next/image";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/** Renders a single nav item, resolving the icon string from the iconMap. */
function NavItem({
  item,
  collapsed,
  isActive,
  onMobileClose,
}: {
  item: SidebarItem;
  collapsed: boolean;
  isActive: boolean;
  onMobileClose: () => void;
}) {
  const icon = iconMap[item.icon];

  // Silently skip items whose icon string is not in the map to avoid crashes.
  if (!icon) return null;

  return (
    <Link
      key={item.id}
      href={item.route}
      onClick={onMobileClose}
      className={`sidebar-link ${isActive ? "sidebar-link--active" : ""} ${collapsed ? "sidebar-link--collapsed" : ""
        }`}
    >
      <span className="sidebar-link-icon">
        <FontAwesomeIcon icon={icon} />
      </span>
      {!collapsed && <span className="sidebar-link-text">{item.label}</span>}
    </Link>
  );
}

export default function DashboardSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: Props) {
  const { topItems, bottomItems, isLoading } = useSidebarMenu();
  const pathname = usePathname();

  const isActive = (route: string) => {
    if (route === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(route);
  };

  const renderGroupedItems = (items: SidebarItem[]) => {
    const roles = Array.from(new Set(items.map(i => i.required_role)));
    const hasMultipleRoles = roles.length > 1;

    if (!hasMultipleRoles) {
      return items.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          collapsed={collapsed}
          isActive={isActive(item.route)}
          onMobileClose={onMobileClose}
        />
      ));
    }

    const affiliateItems = items.filter(i => i.required_role === 'affiliate');
    const adminItems = items.filter(i => i.required_role === 'admin');

    return (
      <>
        {affiliateItems.length > 0 && (
          <>
            <div className="sidebar-section-header">Afiliados</div>
            {affiliateItems.map(item => (
              <NavItem
                key={item.id}
                item={item}
                collapsed={collapsed}
                isActive={isActive(item.route)}
                onMobileClose={onMobileClose}
              />
            ))}
          </>
        )}
        {adminItems.length > 0 && (
          <>
            {affiliateItems.length > 0 && <div className="sidebar-section-divider" />}
            <div className="sidebar-section-header">Administrativo</div>
            {adminItems.map(item => (
              <NavItem
                key={item.id}
                item={item}
                collapsed={collapsed}
                isActive={isActive(item.route)}
                onMobileClose={onMobileClose}
              />
            ))}
          </>
        )}
      </>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={onMobileClose} />
      )}
      <aside
        className={`sidebar ${collapsed ? "sidebar--collapsed" : "sidebar--expanded"} ${mobileOpen ? "sidebar--mobile-open" : ""
          }`}
      >
        <div className={`sidebar-logo ${collapsed ? "sidebar-logo--collapsed" : ""}`}>
          <div className="sidebar-logo-container" style={{ gap: '10px' }}>
            <Image
              src={Logo}
              alt="Doxi Club"
              className="sidebar-logo-image"
              priority
            />
            {!collapsed && (
              <span className="sidebar-logo-badge">Partner & <br />Creator <br />Platform</span>
            )}
          </div>
          <button onClick={onToggle} className="sidebar-toggle">
            <FontAwesomeIcon icon={collapsed ? faAnglesRight : faAnglesLeft} />
          </button>
        </div>

        {/* Top navigation items */}
        <nav className="sidebar-nav">
          {isLoading
            ? // Skeleton placeholders while items load
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                height="44px"
                borderRadius="10px"
                className="mb-1"
              />
            ))
            : renderGroupedItems(topItems)}
        </nav>

        {/* Bottom navigation items */}
        <nav className="sidebar-bottom">
          {!isLoading && renderGroupedItems(bottomItems)}
          <ThemeToggle collapsed={collapsed} />
        </nav>
      </aside>
    </>
  );
}
