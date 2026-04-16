import { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  path: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
}

export interface NavGroup {
  groupLabel: string;
  links: NavLink[];
}

export interface AppBadge {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export interface AppConfig {
  id: string;
  dbSlug?: string;
  name: string;
  description: string;
  basePath: string;
  upstreamUrl: string;
  icon: LucideIcon;
  color: string;
  badge: AppBadge;
  navLinks: (NavLink | NavGroup)[];
}
