import { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  path: string;
  icon: LucideIcon;
  allowedRoles?: string[];
}

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  basePath: string;
  upstreamUrl: string;
  icon: LucideIcon;
  color: string;
  navLinks: NavLink[];
}
