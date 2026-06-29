"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { apps, appGroups, HOME_NAV_APP_IDS, HOME_NAV_GROUP_IDS } from "@/config/apps";
import { AppConfig, AppGroupConfig } from "@/types";
import {
  get_app_icon_style,
  get_header_nav_active_style,
  get_header_nav_link_vars,
  opens_in_new_tab,
} from "@/lib/app-theme";
import { cn } from "@/lib/utils";
import { can_access_shell_app } from "@/lib/shell-app-access";

interface AppNavigationProps {
  userRolesByApp?: Record<string, string>;
  globalRole?: string;
}

export const AppNavigation = ({ userRolesByApp = {}, globalRole }: AppNavigationProps) => {
  const pathname = usePathname();

  const canAccessApp = (app: AppConfig) =>
    can_access_shell_app(app, userRolesByApp, globalRole);

  const groupMap = new Map<string, AppConfig[]>();
  for (const app of apps.filter((a) => a.groupId && canAccessApp(a))) {
    const existing = groupMap.get(app.groupId!) ?? [];
    existing.push(app);
    groupMap.set(app.groupId!, existing);
  }

  const homeNavApps = HOME_NAV_APP_IDS.map((id) =>
    apps.find((app) => app.id === id),
  ).filter((app): app is AppConfig => !!app && canAccessApp(app));

  return (
    <nav className="hidden md:flex items-center gap-1 mr-2">
      {homeNavApps.map((app) => {
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
      {HOME_NAV_GROUP_IDS.map((groupId) => {
        const group = appGroups.find((g) => g.id === groupId);
        const groupApps = groupMap.get(groupId);
        if (!group || !groupApps?.length) return null;
        return (
          <GroupedNavDropdown
            key={group.id}
            group={group}
            apps={groupApps}
            pathname={pathname}
          />
        );
      })}
    </nav>
  );
};

function GroupedNavDropdown({
  group,
  apps: groupApps,
  pathname,
}: {
  group: AppGroupConfig;
  apps: AppConfig[];
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const icon_style = get_app_icon_style(group.brandColor);
  const anyChildActive = groupApps.some((app) =>
    pathname.startsWith(app.basePath),
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        onMouseEnter={() => setIsOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border",
          anyChildActive
            ? "font-medium text-slate-900 bg-slate-100 border-slate-200"
            : "border-transparent text-slate-600 hover:text-black hover:bg-slate-100",
        )}
      >
        <group.icon className="h-3.5 w-3.5" style={icon_style} />
        {group.label}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 min-w-[180px] rounded-md border border-slate-200 bg-white shadow-lg z-50 py-1"
          onMouseLeave={() => setIsOpen(false)}
        >
          {groupApps.map((app) => {
            const external = opens_in_new_tab(app);
            const appIconStyle = get_app_icon_style(app.brandColor);
            const isActive = pathname.startsWith(app.basePath);

            return external ? (
              <a
                key={app.id}
                href={app.upstreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <app.icon className="h-3.5 w-3.5" style={appIconStyle} />
                {app.name}
              </a>
            ) : (
              <Link
                key={app.id}
                href={app.basePath}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "text-slate-900 font-medium bg-slate-100"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                )}
              >
                <app.icon className="h-3.5 w-3.5" style={appIconStyle} />
                {app.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
