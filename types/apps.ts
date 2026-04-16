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

export interface AppConfig {
  id: string;
  dbSlug?: string;
  name: string;
  description: string;
  basePath: string;
  upstreamUrl: string;
  icon: LucideIcon;
  color: string;
  navLinks: (NavLink | NavGroup)[];
}
