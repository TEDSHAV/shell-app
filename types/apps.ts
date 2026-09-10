import { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  excludeRoles?: string[];
  /** Ruta absoluta en Shell (p. ej. /requisiciones) sin prefijo de la app actual */
  href?: string;
}

export type NavGroupCollapsible = "always" | "when-peer";

export interface NavGroup {
  groupLabel: string;
  links: NavLink[];
  /** When set, sidebar shows this group only for that reportes department. */
  department?: "negocios" | "marketing";
  /** Optional icon for the group header (used by collapsible rendering). */
  icon?: LucideIcon;
  /**
   * `always`: dropdown like Capacitación.
   * `when-peer`: dropdown only if another listed peer group is also visible.
   * Omit for a flat category header.
   */
  collapsible?: NavGroupCollapsible;
  /** Peer group labels used with `collapsible: "when-peer"`. */
  peerGroupLabels?: string[];
}

/** CSS color values derived from brandColor (not Tailwind class names). */
export interface AppBadge {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export type AppEmbedMode = "shell" | "raw" | "external" | "native";

export interface AppGroupConfig {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  brandColor: string;
  dashboardOrder?: number;
}

export interface AppConfig {
  id: string;
  dbSlug?: string;
  name: string;
  description: string;
  basePath: string;
  upstreamUrl?: string;
  icon: LucideIcon;
  /** @deprecated Use brandColor + get_app_icon_style */
  color: string;
  brandColor: string;
  embedMode: AppEmbedMode;
  badge: AppBadge;
  navLinks: (NavLink | NavGroup)[];
  requiredRoles?: string[];
  groupId?: string;
  /** Header/home utilidades grouping; defaults to `groupId`. */
  headerGroupId?: string;
  /** Label in the header dropdown; defaults to `name`. */
  headerLabel?: string;
  hiddenFromDashboard?: boolean;
  dashboardOrder?: number;
  /**
   * Sub-path to load when the shell navigates to the app's basePath with no
   * explicit sub-path (e.g. clicking "Capacitación" in the sidebar). Avoids
   * a client-side redirect inside the iframe that causes a double-load flicker.
   */
  defaultSubPath?: string;
}
