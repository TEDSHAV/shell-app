import Link from "next/link";
import { apps, appGroups } from "@/config/apps";
import { NavLink, NavGroup, AppConfig, AppGroupConfig } from "@/types";import { ArrowRight } from "lucide-react";
import {
  get_app_icon_style,
  get_app_strip_style,
  hex_to_rgba,
  opens_in_new_tab,
} from "@/lib/app-theme";
import { cn } from "@/lib/utils";
import { getUserRolesByApp, getUserRole } from "@/actions/apps";

function flattenNavLinks(navLinks: (NavLink | NavGroup)[]): NavLink[] {
  return navLinks.flatMap((item) =>
    "groupLabel" in item ? item.links : [item],
  );
}

export default async function DashboardPage() {
  const [userRolesByApp, globalRole] = await Promise.all([
    getUserRolesByApp(),
    getUserRole()
  ]);

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

  const allowedApps = apps.filter(
    (app) => !app.hiddenFromDashboard && canAccessApp(app),
  );
  const groupedApps = allowedApps.filter((app) => app.groupId);
  const groupMap = new Map<string, AppConfig[]>();
  for (const app of groupedApps) {
    const existing = groupMap.get(app.groupId!) ?? [];
    existing.push(app);
    groupMap.set(app.groupId!, existing);
  }

  const visibleGroups = appGroups.filter(
    (g) => groupMap.has(g.id) && groupMap.get(g.id)!.length > 0,
  );

  type DashboardEntry =
    | { type: "app"; order: number; app: AppConfig }
    | { type: "group"; order: number; group: AppGroupConfig; apps: AppConfig[] };

  const renderItems: DashboardEntry[] = [
    ...allowedApps
      .filter((app) => !app.groupId)
      .map((app) => ({
        type: "app" as const,
        order: app.dashboardOrder ?? 999,
        app,
      })),
    ...visibleGroups.map((group) => ({
      type: "group" as const,
      order: group.dashboardOrder ?? 999,
      group,
      apps: groupMap.get(group.id)!,
    })),
  ].sort((a, b) => a.order - b.order);

  const totalCards = renderItems.length;
  const has_lone_last_card = totalCards % 2 === 1;
  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-foreground">Bienvenido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecciona una aplicación para comenzar
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {renderItems.map((item, index) => {
          const is_lone_last =
            has_lone_last_card && index === renderItems.length - 1;

          const cardClassName = cn(
            "group relative flex flex-col gap-4 p-6 pt-7 rounded-xl border border-border bg-white hover:bg-accent/40 hover:border-border/80 transition-all duration-150 overflow-hidden",
            is_lone_last && "sm:col-span-2",
          );

          if (item.type === "app") {
            const app = item.app;
            const external = opens_in_new_tab(app);
            const icon_style = get_app_icon_style(app.brandColor);
            const strip_style = get_app_strip_style(app.brandColor);
            const badge_bg = {
              backgroundColor: hex_to_rgba(app.brandColor, 0.14),
            };

            const CardContent = () => (
              <>
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                  style={strip_style}
                />
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-lg" style={badge_bg}>
                    <app.icon className="h-5 w-5" style={icon_style} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all translate-x-1 group-hover:translate-x-0 duration-150" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-base">
                    {app.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {app.description}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {flattenNavLinks(app.navLinks)
                    .slice(0, 3)
                    .map((link) => (
                      <span
                        key={link.path}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        <link.icon className="h-2.5 w-2.5" />
                        {link.label}
                      </span>
                    ))}
                  {flattenNavLinks(app.navLinks).length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      +{flattenNavLinks(app.navLinks).length - 3} más
                    </span>
                  )}
                </div>
              </>
            );

            return external ? (
              <a
                key={app.id}
                href={app.upstreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClassName}
              >
                <CardContent />
              </a>
            ) : (
              <Link key={app.id} href={app.basePath} className={cardClassName}>
                <CardContent />
              </Link>
            );
          }

          // Group card
          const group = item.group;
          const groupApps = item.apps;
          const icon_style = get_app_icon_style(group.brandColor);
          const strip_style = get_app_strip_style(group.brandColor);
          const badge_bg = {
            backgroundColor: hex_to_rgba(group.brandColor, 0.14),
          };

          return (
            <div key={group.id} className={cardClassName}>
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                style={strip_style}
              />
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg" style={badge_bg}>
                  <group.icon className="h-5 w-5" style={icon_style} />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-base">
                  {group.label}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {groupApps.map((a) => a.name).join(" · ")}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {groupApps.map((app) => {
                  const external = opens_in_new_tab(app);
                  const appIconStyle = get_app_icon_style(app.brandColor);
                  const appBadgeBg = {
                    backgroundColor: hex_to_rgba(app.brandColor, 0.14),
                  };

                  return external ? (
                    <a
                      key={app.id}
                      href={app.upstreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-all hover:scale-105"
                      style={{ ...appBadgeBg, color: app.brandColor }}
                    >
                      <app.icon className="h-3 w-3" style={appIconStyle} />
                      {app.name}
                    </a>
                  ) : (
                    <Link
                      key={app.id}
                      href={app.basePath}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-all hover:scale-105"
                      style={{ ...appBadgeBg, color: app.brandColor }}
                    >
                      <app.icon className="h-3 w-3" style={appIconStyle} />
                      {app.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
