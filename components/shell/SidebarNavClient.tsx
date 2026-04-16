"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { apps, getAppByPath } from "@/config/apps";
import { cn } from "@/lib/utils";
import { useMobileSidebar } from "./MobileSidebarContext";
import { NavLink, NavGroup } from "@/types";

function isNavGroup(item: NavLink | NavGroup): item is NavGroup {
  return "groupLabel" in item;
}

interface SidebarNavClientProps {
  userPermsByApp: Record<string, string[]>;
}

export function SidebarNavClient({ userPermsByApp }: SidebarNavClientProps) {
  const pathname = usePathname();
  const currentApp = getAppByPath(pathname);
  const { onClose } = useMobileSidebar();

  const homeLink = (
    <Link
      href="/dashboard"
      onClick={onClose}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        pathname === "/dashboard"
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Home className="h-4 w-4 shrink-0" />
      Inicio
    </Link>
  );

  if (!currentApp) {
    return (
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {homeLink}
        <div className="pt-2 pb-1 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Aplicaciones
          </span>
        </div>
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.basePath}
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <app.icon className={cn("h-4 w-4 shrink-0", app.color)} />
            {app.name}
          </Link>
        ))}
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

    return (
      <Link
        key={link.path}
        href={fullPath || currentApp!.basePath}
        onClick={onClose}
        prefetch={false}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
          isActive
            ? "text-foreground bg-accent"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <link.icon className="h-3.5 w-3.5 shrink-0" />
        {link.label}
      </Link>
    );
  };

  const userPerms = userPermsByApp[currentApp.id] ?? [];

  const canAccess = (link: NavLink): boolean => {
    if (!link.requiredPermissions || link.requiredPermissions.length === 0) return true;
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
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      {homeLink}
      <div className="pt-2 pb-1 px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {currentApp.name}
        </span>
      </div>
      {filteredItems.map((item) => {
        if (isNavGroup(item)) {
          return (
            <div key={item.groupLabel}>
              <div className="pt-3 pb-1 px-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {item.groupLabel}
                </span>
              </div>
              {item.links.map((link) => renderNavLink(link))}
            </div>
          );
        }
        return renderNavLink(item);
      })}
    </nav>
  );
}
