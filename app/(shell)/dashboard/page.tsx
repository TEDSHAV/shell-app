import Link from "next/link";
import { apps, appGroups } from "@/config/apps";
import { AppConfig, AppGroupConfig } from "@/types";
import { ArrowRight } from "lucide-react";
import {
  get_app_icon_style,
  get_app_strip_style,
  hex_to_rgba,
  opens_in_new_tab,
} from "@/lib/app-theme";
import { cn } from "@/lib/utils";
import { getUserRolesByApp, getUserRole } from "@/actions/apps";
import { can_access_shell_app } from "@/lib/shell-app-access";

function getProgress(app: AppConfig): number {
  // Placeholder apps (basePath "#") show 0% progress; active apps show a
  // deterministic percentage so the progress bar renders in the layout.
  if (app.basePath === "#") return 0;
  if (app.dashboardOrder) return Math.min(95, 50 + app.dashboardOrder * 5);
  return 75;
}

export default async function DashboardPage() {
  const [userRolesByApp, globalRole] = await Promise.all([
    getUserRolesByApp(),
    getUserRole(),
  ]);

  const canAccessApp = (app: AppConfig) =>
    can_access_shell_app(app, userRolesByApp, globalRole);

  const allowedApps = apps.filter(
    (app) => !app.hiddenFromDashboard && canAccessApp(app),
  );

  // Group allowed apps by their groupId. Unmatched apps don't appear in the
  // new sectioned layout; the existing top nav (HOME_NAV_*) is unaffected.
  const activeGroups = appGroups
    .map((group) => ({
      ...group,
      apps: allowedApps.filter((app) => app.groupId === group.id),
    }))
    .filter((group) => group.apps.length > 0)
    .sort((a, b) => (a.dashboardOrder ?? 999) - (b.dashboardOrder ?? 999));

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-foreground">Bienvenido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecciona un proceso para comenzar
        </p>
      </div>

      <div className="space-y-12">
        {activeGroups.map((group) => (
          <section key={group.id}>
            <div className="w-full rounded-xl bg-slate-900 px-6 py-4 mb-2 text-center">
              <h2 className="text-sm font-bold text-white tracking-[0.15em] uppercase">
                {group.label}
              </h2>
            </div>
            {group.description && (
              <p className="text-center text-sm text-muted-foreground mb-6">
                {group.description}
              </p>
            )}
            <div
              className={cn(
                "grid gap-4",
                group.id === "procesos-de-apoyo"
                  ? "sm:grid-cols-[repeat(auto-fit,260px)] sm:justify-center"
                  : "sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] justify-items-stretch",
              )}
            >
              {group.apps.map((app, index) => {
                const number = (index + 1).toString().padStart(2, "0");
                const isPlaceholder = app.basePath === "#";
                const external = opens_in_new_tab(app);
                const iconStyle = get_app_icon_style(app.brandColor);
                const stripStyle = get_app_strip_style(app.brandColor);
                const badgeBg = {
                  backgroundColor: hex_to_rgba(app.brandColor, 0.14),
                };
                const progress = getProgress(app);
                const isAccessible = !isPlaceholder;

                const cardContent = (
                  <>
                    <div
                      className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                      style={stripStyle}
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg" style={badgeBg}>
                          <app.icon
                            className="h-5 w-5"
                            style={iconStyle}
                          />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground/70">
                          {number}
                        </span>
                      </div>
                      {isAccessible && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all translate-x-1 group-hover:translate-x-0 duration-150" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                        {app.name}
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            isPlaceholder ? "bg-amber-500" : "bg-green-500",
                          )}
                        />
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {app.description}
                      </p>
                    </div>
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Avance</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: app.brandColor,
                          }}
                        />
                      </div>
                    </div>
                  </>
                );

                const cardClassName =
                  "group relative flex flex-col gap-4 p-6 pt-7 rounded-xl border border-border bg-white hover:bg-accent/40 hover:border-border/80 transition-all duration-150 overflow-hidden min-h-[180px]";

                if (isPlaceholder) {
                  return (
                    <div
                      key={app.id}
                      className={cn(cardClassName, "opacity-75")}
                    >
                      {cardContent}
                    </div>
                  );
                }

                if (external) {
                  return (
                    <a
                      key={app.id}
                      href={app.upstreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cardClassName}
                    >
                      {cardContent}
                    </a>
                  );
                }

                return (
                  <Link key={app.id} href={app.basePath} className={cardClassName}>
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
