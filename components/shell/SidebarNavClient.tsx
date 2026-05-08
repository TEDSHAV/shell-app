"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { apps, getAppByPath } from "@/config/apps";
import { cn } from "@/lib/utils";
import { useMobileSidebar } from "./MobileSidebarContext";
import { useSidebarCollapse } from "./Sidebar";
import { NavLink, NavGroup } from "@/types";

function isNavGroup(item: NavLink | NavGroup): item is NavGroup {
  return "groupLabel" in item;
}

interface SidebarNavClientProps {
  userPermsByApp: Record<string, string[]>;
  userRolesByApp: Record<string, string>;
}

export function SidebarNavClient({
  userPermsByApp,
  userRolesByApp,
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

  if (!currentApp) {
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
        {apps.map((app) =>
          app.id === "drive" ? (
            <a
              key={app.id}
              href="https://drive.shadevenezuela.com.ve"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all sidebar-link text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                isCollapsed ? "justify-center" : "",
              )}
              title={isCollapsed ? app.name : undefined}
            >
              <app.icon className={cn("h-4 w-4 shrink-0", app.color)} />
              {!isCollapsed && app.name}
            </a>
          ) : (
            <Link
              key={app.id}
              href={app.basePath}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all sidebar-link text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                isCollapsed ? "justify-center" : "",
              )}
              title={isCollapsed ? app.name : undefined}
            >
              <app.icon className={cn("h-4 w-4 shrink-0", app.color)} />
              {!isCollapsed && app.name}
            </Link>
          ),
        )}
      </nav>
    );
  }

  const renderNavLink = (link: NavLink) => {
    const fullPath = `${currentApp!.basePath}${link.path === "/" ? "" : link.path}`;
    const isActive =
      link.path === "/"
        ? pathname === currentApp!.basePath ||
          pathname === currentApp!.basePath + "/"
        : pathname.startsWith(fullPath);

    const isDrive = currentApp!.id === "drive";
    const externalHref = isDrive
      ? `${currentApp!.upstreamUrl}${link.path === "/" ? "" : link.path}`
      : null;

    return isDrive ? (
      <a
        key={link.path}
        href={externalHref!}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all sidebar-link text-slate-600 hover:text-slate-900 hover:bg-slate-100",
          isCollapsed ? "justify-center" : "",
        )}
        title={isCollapsed ? link.label : undefined}
      >
        <link.icon className="h-3.5 w-3.5 shrink-0" />
        {!isCollapsed && link.label}
      </a>
    ) : (
      <Link
        key={link.path}
        href={fullPath || currentApp!.basePath}
        onClick={onClose}
        prefetch={false}
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all sidebar-link",
          isActive
            ? "bg-blue-50 text-blue-700 font-semibold"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
          isCollapsed ? "justify-center" : "",
        )}
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
    // Admins and superadmins can see all links (app-specific role)
    const lowerRole = userRole?.toLowerCase();
    if (lowerRole === "admin" || lowerRole === "superadmin") return true;

    if (!link.requiredPermissions || link.requiredPermissions.length === 0)
      return true;
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
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 sidebar-scrollbar">
      {homeLink}
      {isCollapsed ? (
        <div className="my-2 border-t border-slate-200" />
      ) : (
        <div className="pt-2 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
