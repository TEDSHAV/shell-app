"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { apps, appGroups, getAppByPath, HOME_NAV_APP_IDS, HOME_NAV_GROUP_IDS } from "@/config/apps";
import { prefetchFramePath } from "@/lib/frame-url";
import {
  get_app_icon_style,
  get_sidebar_nav_style,
  opens_in_new_tab,
  uses_iframe_in_shell,
} from "@/lib/app-theme";
import { cn } from "@/lib/utils";
import { useMobileSidebar } from "./MobileSidebarContext";
import { useSidebarCollapse } from "./Sidebar";
import { NavLink, NavGroup, AppConfig, AppGroupConfig } from "@/types";

function isNavGroup(item: NavLink | NavGroup): item is NavGroup {
  return "groupLabel" in item;
}

interface SidebarNavClientProps {
  userPermsByApp: Record<string, string[]>;
  userRolesByApp: Record<string, string>;
  globalRole?: string;
}

const default_link_class =
  "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all sidebar-link text-slate-600 hover:text-slate-900 hover:bg-slate-100";

export function SidebarNavClient({
  userPermsByApp,
  userRolesByApp,
  globalRole,
}: SidebarNavClientProps) {
  const pathname = usePathname();
  const currentApp = getAppByPath(pathname);
  const { onClose } = useMobileSidebar();
  const { isCollapsed } = useSidebarCollapse();

  const homeLink = (
    <Link
      href="/dashboard"
      onClick={onClose}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all sidebar-link",
        pathname === "/dashboard"
          ? "bg-blue-50 text-blue-700 font-semibold"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
        isCollapsed ? "justify-center" : "",
      )}
      title={isCollapsed ? "Inicio" : undefined}
    >
      <Home className="h-4 w-4 shrink-0" />
      {!isCollapsed && "Inicio"}
    </Link>
  );

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

  if (!currentApp) {
    const homeNavApps = HOME_NAV_APP_IDS.map((id) =>
      apps.find((app) => app.id === id),
    ).filter((app): app is AppConfig => !!app && canAccessApp(app));
    const groupMap = new Map<string, AppConfig[]>();
    for (const app of apps.filter((a) => a.groupId && canAccessApp(a))) {
      const existing = groupMap.get(app.groupId!) ?? [];
      existing.push(app);
      groupMap.set(app.groupId!, existing);
    }

    return (
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 sidebar-scrollbar">
        {homeLink}
        {isCollapsed ? (
          <div className="my-2 border-t border-slate-200" />
        ) : (
          <div className="pt-2 pb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Aplicaciones
            </span>
          </div>
        )}
        {homeNavApps.map((app) => {
          const external = opens_in_new_tab(app);
          const icon_style = get_app_icon_style(app.brandColor);

          return external ? (
            <a
              key={app.id}
              href={app.upstreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                default_link_class,
                isCollapsed ? "justify-center" : "",
              )}
              title={isCollapsed ? app.name : undefined}
            >
              <app.icon className="h-4 w-4 shrink-0" style={icon_style} />
              {!isCollapsed && app.name}
            </a>
          ) : (
            <Link
              key={app.id}
              href={app.basePath}
              onClick={onClose}
              className={cn(
                default_link_class,
                isCollapsed ? "justify-center" : "",
              )}
              title={isCollapsed ? app.name : undefined}
            >
              <app.icon className="h-4 w-4 shrink-0" style={icon_style} />
              {!isCollapsed && app.name}
            </Link>
          );
        })}
        {HOME_NAV_GROUP_IDS.map((groupId) => {
          const group = appGroups.find((g) => g.id === groupId);
          const groupApps = groupMap.get(groupId);
          if (!group || !groupApps?.length) return null;
          return (
            <GroupedSidebarItem
              key={group.id}
              group={group}
              apps={groupApps}
              isCollapsed={isCollapsed}
              pathname={pathname}
              onClose={onClose}
            />
          );
        })}
      </nav>
    );
  }

  const sidebar_theme_style = get_sidebar_nav_style(currentApp.brandColor);

  const renderNavLink = (link: NavLink) => {
    const fullPath =
      link.href ??
      `${currentApp.basePath}${link.path === "/" ? "" : link.path}`;
    const isActive = link.href
      ? pathname === link.href || pathname.startsWith(`${link.href}/`)
      : link.path === "/"
        ? pathname === currentApp.basePath ||
          pathname === currentApp.basePath + "/"
        : pathname.startsWith(fullPath);

    const external = opens_in_new_tab(currentApp);
    const externalHref = external
      ? `${currentApp.upstreamUrl}${link.path === "/" ? "" : link.path}`
      : null;

    const frameSubPath =
      link.path === "/" ? undefined : link.path.replace(/^\//, "");

    const prefetchFrame = () => {
      if (link.href || external || !uses_iframe_in_shell(currentApp)) {
        return;
      }
      prefetchFramePath(currentApp.id, frameSubPath);
    };

    const link_class = cn(
      "sidebar-link-item relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all sidebar-link",
      isActive && "is-active",
      isCollapsed ? "justify-center" : "",
    );

    return external ? (
      <a
        key={link.path}
        href={externalHref!}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(link_class, !isActive && default_link_class)}
        title={isCollapsed ? link.label : undefined}
      >
        <link.icon className="h-3.5 w-3.5 shrink-0" />
        {!isCollapsed && link.label}
      </a>
    ) : (
      <Link
        key={link.path}
        href={fullPath || currentApp.basePath}
        onClick={onClose}
        onMouseEnter={prefetchFrame}
        onFocus={prefetchFrame}
        className={link_class}
        title={isCollapsed ? link.label : undefined}
      >
        <link.icon className="h-3.5 w-3.5 shrink-0" />
        {!isCollapsed && link.label}
      </Link>
    );
  };

  const userPerms = userPermsByApp[currentApp.id] ?? [];
  const userRole = userRolesByApp[currentApp.dbSlug ?? currentApp.id];

  const canAccess = (link: NavLink): boolean => {
    const lowerRole = userRole?.toLowerCase() || globalRole?.toLowerCase();
    if (
      link.excludeRoles?.some(
        (r) =>
          r.toLowerCase() === lowerRole ||
          r.toLowerCase() === globalRole?.toLowerCase(),
      )
    ) {
      return false;
    }
    if (lowerRole === "admin" || lowerRole === "superadmin") return true;

    // Check roles first if defined
    if (link.requiredRoles && link.requiredRoles.length > 0) {
      if (!lowerRole || !link.requiredRoles.some(r => r.toLowerCase() === lowerRole)) {
        return false;
      }
    }

    if (!link.requiredPermissions || link.requiredPermissions.length === 0) {
      return true;
    }
    return link.requiredPermissions.some((p) => userPerms.includes(p));
  };

  const filteredItems = currentApp.navLinks
    .map((item) => {
      if (isNavGroup(item)) {
        const filteredGroupLinks = item.links.filter(canAccess);
        return { ...item, links: filteredGroupLinks };
      }
      return item;
    })
    .filter((item) => {
      if (isNavGroup(item)) return item.links.length > 0;
      return canAccess(item);
    });

  return (
    <nav
      className="sidebar-app-themed flex-1 overflow-y-auto py-4 px-3 space-y-1 sidebar-scrollbar"
      style={sidebar_theme_style}
    >
      {homeLink}
      {isCollapsed ? (
        <div className="my-2 border-t border-slate-200" />
      ) : (
        <div className="pt-2 pb-1 px-3">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: currentApp.brandColor }}
          >
            {currentApp.name}
          </span>
        </div>
      )}
      {filteredItems.map((item, index) => {
        if (isNavGroup(item)) {
          const isFirstGroup = index === 0;
          return (
            <div key={item.groupLabel}>
              {isCollapsed ? (
                !isFirstGroup && (
                  <div className="my-2 border-t border-slate-200" />
                )
              ) : (
                <div className="pt-3 pb-1 px-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {item.groupLabel}
                  </span>
                </div>
              )}
              {item.links.map((link) => renderNavLink(link))}
            </div>
          );
        }
        return renderNavLink(item);
      })}
    </nav>
  );
}

function GroupedSidebarItem({
  group,
  apps: groupApps,
  isCollapsed,
  pathname,
  onClose,
}: {
  group: AppGroupConfig;
  apps: AppConfig[];
  isCollapsed: boolean;
  pathname: string;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const icon_style = get_app_icon_style(group.brandColor);
  const anyChildActive = groupApps.some((app) =>
    pathname.startsWith(app.basePath),
  );

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {groupApps.map((app) => {
          const external = opens_in_new_tab(app);
          const appIconStyle = get_app_icon_style(app.brandColor);
          return external ? (
            <a
              key={app.id}
              href={app.upstreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(default_link_class, "justify-center")}
              title={isCollapsed ? app.name : undefined}
            >
              <app.icon className="h-4 w-4 shrink-0" style={appIconStyle} />
            </a>
          ) : (
            <Link
              key={app.id}
              href={app.basePath}
              onClick={onClose}
              className={cn(default_link_class, "justify-center")}
              title={app.name}
            >
              <app.icon className="h-4 w-4 shrink-0" style={appIconStyle} />
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all sidebar-link text-slate-600 hover:text-slate-900 hover:bg-slate-100",
          anyChildActive && "text-slate-900 font-medium",
        )}
      >
        <group.icon className="h-4 w-4 shrink-0" style={icon_style} />
        <span className="flex-1 text-left">{group.label}</span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="ml-4 space-y-0.5">
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
                className={cn(
                  default_link_class,
                  isActive && "text-slate-900 font-medium",
                )}
              >
                <app.icon className="h-3.5 w-3.5 shrink-0" style={appIconStyle} />
                {app.name}
              </a>
            ) : (
              <Link
                key={app.id}
                href={app.basePath}
                onClick={onClose}
                className={cn(
                  default_link_class,
                  isActive && "text-slate-900 font-medium",
                )}
              >
                <app.icon className="h-3.5 w-3.5 shrink-0" style={appIconStyle} />
                {app.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
