export type SidebarPosition = "top" | "bottom";
export type SidebarRole = "admin" | "affiliate";

export interface SidebarItem {
  id: string;
  label: string;
  route: string;
  icon: string; // FontAwesome icon name string, e.g. 'faChartLine'
  required_role: SidebarRole;
  position: SidebarPosition;
  sort_order: number;
  hidden: boolean;
}
