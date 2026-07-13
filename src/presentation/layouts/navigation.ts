import {
  Columns2,
  FlaskConical,
  LayoutDashboard,
  Package,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** Route path. */
  to: string;
  /** Short, jargon-free label shown in the sidebar. */
  label: string;
  icon: LucideIcon;
  /** Match the route exactly (used for the home route). */
  end?: boolean;
}

/**
 * Primary navigation. Ordered by how a researcher moves through their work:
 * start at Home, work inside Studies, adjust Settings when needed.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/studies", label: "Studies", icon: FlaskConical },
  { to: "/compare", label: "MRI Compare", icon: Columns2 },
  { to: "/publish", label: "Publish", icon: Package },
  { to: "/settings", label: "Settings", icon: Settings },
];
