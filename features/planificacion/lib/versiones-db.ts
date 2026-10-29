import type { TedPlanContext } from "../actions/assert-ted";
import git_versiones from "../data/versiones-git.json";
import versiones_historial from "../data/versiones-historial.json";
import {
  planned_estado,
  type GitVersionesFile,
  type VersionHistorialFile,
  type PlanVersionRef,
} from "./versiones";

export const GIT_VERSIONES = git_versiones as GitVersionesFile;
export const VERSIONES_HISTORIAL = versiones_historial as VersionHistorialFile;

type Admin = TedPlanContext["supabase"];

export type PlannedVersionRow = {
  id: number;
  app_id: number;
  version: string;
  mes_plan: string | null;
  notas: string | null;
};

/** Versiones planificadas (BD) + nombre y slug de cada app. null si la tabla falla. */
export async function fetch_planned_versions(supabase: Admin) {
  const [ver_res, apps_res] = await Promise.all([
    supabase
      .from("ted_plan_versiones" as never)
      .select("id, app_id, version, mes_plan, notas"),
    supabase.from("ted_plan_apps" as never).select("id, slug, nombre"),
  ]);
  const apps = (apps_res.data ?? []) as Array<{ id: number; slug: string; nombre: string }>;
  if (ver_res.error) {
    console.error("[planificacion] versiones:", ver_res.error);
    return { rows: null, apps };
  }
  return { rows: (ver_res.data ?? []) as PlannedVersionRow[], apps };
}

/** Versión ligada a cada objetivo. Si la tabla aún no existe, devuelve un mapa vacío. */
export async function fetch_objetivo_versions(
  supabase: Admin,
  objetivo_ids: number[],
): Promise<Map<number, PlanVersionRef>> {
  const out = new Map<number, PlanVersionRef>();
  if (objetivo_ids.length === 0) return out;
  const [{ rows, apps }, links] = await Promise.all([
    fetch_planned_versions(supabase),
    supabase
      .from("ted_plan_objetivos" as never)
      .select("id, version_id")
      .in("id", objetivo_ids),
  ]);
  if (!rows || links.error) return out;
  const by_id = new Map(rows.map((row) => [row.id, row]));
  const app_by_id = new Map(apps.map((app) => [app.id, app]));
  for (const link of (links.data ?? []) as Array<{ id: number; version_id: number | null }>) {
    const row = link.version_id ? by_id.get(link.version_id) : undefined;
    const app = row ? app_by_id.get(row.app_id) : undefined;
    if (!row || !app) continue;
    out.set(link.id, {
      version: row.version,
      app_nombre: app.nombre,
      estado: planned_estado(GIT_VERSIONES, app.slug, row.version),
    });
  }
  return out;
}
