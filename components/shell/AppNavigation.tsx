"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { apps } from "@/config/apps";
import { AppConfig } from "@/types";
import {
  get_app_icon_style,
  get_header_nav_active_style,
  get_header_nav_link_vars,
  opens_in_new_tab,
} from "@/lib/app-theme";
import { cn } from "@/lib/utils";

interface AppNavigationProps {
  userRolesByApp?: Record<string, string>;
  globalRole?: string;
}

export const AppNavigation = ({ userRolesByApp = {}, globalRole }: AppNavigationProps) => {
  const pathname = usePathname();

  const canAccessApp = (app: AppConfig): boolean => {
    const userRole = userRolesByApp[app.dbSlug ?? app.id];
    const lowerRole = userRole?.toLowerCase() || globalRole?.toLowerCase();
    
    // Always allow admin/superadmin
    if (lowerRole === "admin" || lowerRole === "superadmin") return true;

    // Check app-level roles if defined
    if (app.requiredRoles && app.requiredRoles.length > 0) {
      if (!lowerRole || !app.requiredRoles.some(r => r.toLowerCase() === lowerRole)) {
        return false;
      }
    }

    return true;
  };

  const allowedApps = apps.filter(canAccessApp);

  return (
    <nav className="hidden md:flex items-center gap-1 mr-2">
      {allowedApps.map((app) => {
        const external = opens_in_new_tab(app);
        const is_active = pathname.startsWith(app.basePath);
        const icon_style = get_app_icon_style(app.brandColor);
        const link_vars = get_header_nav_link_vars(app.brandColor);

        return external ? (
          <a
            key={app.id}
            href={app.upstreamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors text-slate-600 hover:text-black hover:bg-slate-100"
          >
            <app.icon className="h-3.5 w-3.5" style={icon_style} />
            {app.name}
          </a>
        ) : (
          <Link
            key={app.id}
            href={app.basePath}
            style={{
              ...link_vars,
              ...(is_active
                ? get_header_nav_active_style(app.brandColor)
                : {}),
            }}
            className={cn(
              "header-app-nav-link inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border",
              is_active
                ? "is-active font-medium"
                : "border-transparent text-slate-600",
            )}
          >
            <app.icon className="h-3.5 w-3.5" style={icon_style} />
            {app.name}
          </Link>
        );
      })}
    </nav>
  );
};
