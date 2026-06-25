import { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export interface NavGroup {
  groupLabel: string;
  links: NavLink[];
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
  icon: LucideIcon;
  brandColor: string;
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
}
