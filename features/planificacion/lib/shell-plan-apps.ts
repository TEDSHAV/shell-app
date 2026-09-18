import {
  apps,
  appGroups,
  HOME_NAV_APP_IDS,
  UTILIDADES_HEADER_APP_IDS,
} from "@/config/apps";
import type { PlanAppSection } from "./types";

export type ShellPlanAppSeed = {
  slug: string;
  nombre: string;
  subtitulo: string;
};

/** Plan-only: Shell / transversal, not a Prisma product app. */
export const GENERAL_PLAN_APP: ShellPlanAppSeed = {
  slug: "general",
  nombre: "General",
  subtitulo: "Shell y transversal, fuera de Prisma",
};

export function list_shell_plan_apps(): ShellPlanAppSeed[] {
  const from_config = apps.map((app) => ({
    slug: app.id,
    nombre: app.name,
    subtitulo: app.description,
  }));
  return [
    GENERAL_PLAN_APP,
    ...from_config.filter((app) => app.slug !== GENERAL_PLAN_APP.slug),
  ];
}

export function list_home_plan_app_slugs(): string[] {
  const home_apps = apps.filter((app) => !app.hiddenFromDashboard);
  const from_groups = appGroups
    .filter((group) => group.id !== "utilidades")
    .sort(
      (a, b) => (a.dashboardOrder ?? 999) - (b.dashboardOrder ?? 999),
    )
    .flatMap((group) =>
      home_apps
        .filter((app) => app.groupId === group.id)
        .map((app) => app.id),
    );
  return [GENERAL_PLAN_APP.slug, ...from_groups.filter((id) => id !== GENERAL_PLAN_APP.slug)];
}

export function list_utilidades_plan_app_slugs(): string[] {
  const home = new Set(list_home_plan_app_slugs());
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const id of [...HOME_NAV_APP_IDS, ...UTILIDADES_HEADER_APP_IDS]) {
    if (home.has(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }

  for (const app of apps) {
    if (home.has(app.id) || seen.has(app.id)) continue;
    seen.add(app.id);
    ordered.push(app.id);
  }

  return ordered;
}

export function resolve_plan_app_section(
  slug: string,
  origen: "shell" | "custom",
): PlanAppSection {
  if (origen === "custom") return "custom";
  if (list_home_plan_app_slugs().includes(slug)) return "home";
  return "utilidades";
}

export function plan_app_sort_index(
  slug: string,
  section: PlanAppSection,
): number {
  if (section === "home") {
    const idx = list_home_plan_app_slugs().indexOf(slug);
    return idx === -1 ? 500 : idx;
  }
  if (section === "custom") return 800;
  const idx = list_utilidades_plan_app_slugs().indexOf(slug);
  return 1000 + (idx === -1 ? 500 : idx);
}

export function catalog_nombre_of_slug(slug: string): string | null {
  return list_shell_plan_apps().find((app) => app.slug === slug)?.nombre ?? null;
}

export function slug_from_app_name(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base.length > 0 ? base : `app-${Date.now()}`;
}
