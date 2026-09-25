import { apps } from "@/config/apps";
import type { AppConfig, NavGroup, NavLink } from "@/types";
import { uses_iframe_in_shell } from "@/lib/app-theme";

export type PrismaViewRoute = {
  /** Valor guardado en entregable_ruta (ruta Shell o legacy upstream). */
  path: string;
  /** Nombre del ítem en el sidebar. */
  label: string;
  /** App Prisma / Shell. */
  app_id: string;
  app_name: string;
  /** Grupo del sidebar, si aplica. */
  group_label: string | null;
  /** Path relativo al iframe upstream (solo apps embed). */
  frame_path: string | null;
  upstream_url: string | null;
};

function strip_query(href: string): string {
  const cut = href.indexOf("?");
  return cut >= 0 ? href.slice(0, cut) : href;
}

function is_nav_group(item: NavLink | NavGroup): item is NavGroup {
  return "groupLabel" in item;
}

function shell_path_for_link(app: AppConfig, link: NavLink): string {
  if (link.href) return strip_query(link.href);
  if (link.path === "/") return app.basePath;
  return `${app.basePath}${link.path}`;
}

function collect_app_routes(app: AppConfig): PrismaViewRoute[] {
  const out: PrismaViewRoute[] = [];
  const iframe = uses_iframe_in_shell(app);
  const upstream = app.upstreamUrl?.replace(/\/$/, "") || null;

  for (const item of app.navLinks) {
    const links = is_nav_group(item) ? item.links : [item];
    const group_label = is_nav_group(item) ? item.groupLabel : null;
    for (const link of links) {
      const path = shell_path_for_link(app, link);
      if (!path) continue;
      out.push({
        path,
        label: link.label,
        app_id: app.id,
        app_name: app.name,
        group_label,
        frame_path: iframe && !link.href ? link.path : null,
        upstream_url: iframe ? upstream : null,
      });
    }
  }
  return out;
}

let cached_routes: PrismaViewRoute[] | null = null;

/** Todas las rutas del sidebar Shell (todas las apps), sin duplicar path. */
export function list_prisma_view_routes(): PrismaViewRoute[] {
  if (cached_routes) return cached_routes;
  const by_path = new Map<string, PrismaViewRoute>();
  for (const app of apps) {
    if (app.hiddenFromDashboard && app.id === "manual") continue;
    for (const route of collect_app_routes(app)) {
      const existing = by_path.get(route.path);
      if (!existing) {
        by_path.set(route.path, route);
        continue;
      }
      // Preferir la entrada con más contexto (grupo / frame).
      if (!existing.group_label && route.group_label) {
        by_path.set(route.path, route);
      }
    }
  }
  cached_routes = [...by_path.values()].sort((a, b) => {
    const by_app = a.app_name.localeCompare(b.app_name, "es");
    if (by_app !== 0) return by_app;
    const by_group = (a.group_label ?? "").localeCompare(
      b.group_label ?? "",
      "es",
    );
    if (by_group !== 0) return by_group;
    return a.label.localeCompare(b.label, "es");
  });
  return cached_routes;
}

/** Atajos legacy (solo Negocios) — se mantiene el nombre por imports existentes. */
export const PRISMA_VIEW_SHORTCUTS: Array<{ label: string; path: string }> =
  list_prisma_view_routes()
    .filter((route) => route.app_id === "negocios")
    .map((route) => ({
      label: route.label,
      path: route.frame_path ?? (route.path.replace(/^\/negocios/, "") || "/"),
    }));

export function find_prisma_view_route(
  raw: string,
): PrismaViewRoute | undefined {
  const path = normalize_prisma_path(raw);
  if (!path) return undefined;
  const routes = list_prisma_view_routes();
  const exact = routes.find((route) => route.path === path);
  if (exact) return exact;
  // Legacy: se guardaba el path upstream de Negocios (/crm/leads).
  return routes.find(
    (route) =>
      route.frame_path === path ||
      route.path === `/negocios${path}` ||
      (route.app_id === "negocios" &&
        route.path.replace(/^\/negocios/, "") === path),
  );
}

export function normalize_prisma_path(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.pathname || "/";
  } catch {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
}

export function build_negocios_view_url(path: string): string {
  return build_prisma_view_url(path);
}

/** URL abierta desde el plan: iframe upstream o ruta Shell nativa. */
export function build_prisma_view_url(path: string): string {
  const normalized = normalize_prisma_path(path);
  if (!normalized) return "/";

  const route = find_prisma_view_route(normalized);
  if (route?.upstream_url && route.frame_path) {
    return `${route.upstream_url}${route.frame_path}?shell=1`;
  }

  const negocios_base = (
    process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
    "https://gestion.shadevenezuela.com.ve"
  ).replace(/\/$/, "");

  // Legacy sin prefijo de app → Negocios.
  if (
    !normalized.startsWith("/negocios") &&
    !normalized.startsWith("/ted") &&
    !normalized.startsWith("/capacitacion") &&
    !normalized.startsWith("/administracion") &&
    !normalized.startsWith("/calidad") &&
    !normalized.startsWith("/recursos-humanos") &&
    !normalized.startsWith("/servicios-tecnicos") &&
    !normalized.startsWith("/inventario") &&
    !normalized.startsWith("/drive") &&
    !normalized.startsWith("/tareas") &&
    !normalized.startsWith("/comentarios") &&
    !normalized.startsWith("/reportes") &&
    !normalized.startsWith("/marketing") &&
    !normalized.startsWith("/requisiciones") &&
    !normalized.startsWith("/consulta-osi") &&
    !normalized.startsWith("/tickets") &&
    !normalized.startsWith("/manual")
  ) {
    return `${negocios_base}${normalized}?shell=1`;
  }

  if (normalized.startsWith("/negocios/") || normalized === "/negocios") {
    const frame = normalized.replace(/^\/negocios/, "") || "/";
    return `${negocios_base}${frame}?shell=1`;
  }

  return normalized;
}
