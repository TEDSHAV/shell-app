"use server";

import { require_objetivos_read_context } from "./assert-ted";
import { average_avance } from "../lib/task-progress";
import { GIT_VERSIONES, fetch_planned_versions } from "../lib/versiones-db";
import {
  build_version_tree,
  type PlanVersionApp,
  type PlanVersionObjetivo,
  type PlannedVersion,
} from "../lib/versiones";

export async function load_versiones_tree(): Promise<
  | { ok: true; apps: PlanVersionApp[]; generated_at: string; planned_error: boolean }
  | { ok: false; error: string }
> {
  const gate = await require_objetivos_read_context();
  if (!gate.ok) return gate;
  const { supabase } = gate.ctx;
  const [{ rows, apps }, obj_res] = await Promise.all([
    fetch_planned_versions(supabase),
    supabase
      .from("ted_plan_objetivos" as never)
      .select("id, titulo, estado, fecha_inicio, version_id")
      .not("version_id", "is", null)
      .order("fecha_inicio"),
  ]);
  if (obj_res.error) console.error("[planificacion] objetivos por versión:", obj_res.error);
  const obj_rows = (obj_res.data ?? []) as Array<{
    id: number;
    titulo: string;
    estado: PlanVersionObjetivo["estado"];
    fecha_inicio: string;
    version_id: number;
  }>;

  // Avance igual que en Cubrir/Informe: promedio de las tareas del objetivo en planificación.
  const tareas_by_obj = new Map<number, Array<{ avance: number | null; completada: boolean; no_solicitada: boolean | null }>>();
  if (obj_rows.length > 0) {
    const { data: tareas, error } = await supabase
      .from("ted_plan_tareas" as never)
      .select("objetivo_id, avance, completada, no_solicitada, en_planificacion")
      .in("objetivo_id", obj_rows.map((row) => row.id));
    if (error) console.error("[planificacion] tareas por versión:", error);
    for (const tarea of (tareas ?? []) as Array<{
      objetivo_id: number;
      avance: number | null;
      completada: boolean;
      no_solicitada: boolean | null;
      en_planificacion: boolean | null;
    }>) {
      if (tarea.en_planificacion === false) continue;
      const list = tareas_by_obj.get(tarea.objetivo_id) ?? [];
      list.push(tarea);
      tareas_by_obj.set(tarea.objetivo_id, list);
    }
  }

  const objetivos_by_version = new Map<number, PlanVersionObjetivo[]>();
  for (const row of obj_rows) {
    const list = objetivos_by_version.get(row.version_id) ?? [];
    list.push({
      id: row.id,
      titulo: row.titulo,
      estado: row.estado,
      mes: row.fecha_inicio.slice(0, 7),
      avance: average_avance(tareas_by_obj.get(row.id) ?? []),
    });
    objetivos_by_version.set(row.version_id, list);
  }

  const slug_by_id = new Map(apps.map((app) => [app.id, app.slug]));
  const planned: PlannedVersion[] = (rows ?? []).flatMap((row) => {
    const app_slug = slug_by_id.get(row.app_id);
    if (!app_slug) return [];
    return [{
      id: row.id,
      app_slug,
      version: row.version,
      mes_plan: row.mes_plan,
      notas: row.notas,
      objetivos: objetivos_by_version.get(row.id) ?? [],
    }];
  });
  const app_names = new Map(apps.map((app) => [app.slug, app.nombre]));

  return {
    ok: true,
    apps: build_version_tree(GIT_VERSIONES, planned, app_names),
    generated_at: GIT_VERSIONES.generated_at,
    planned_error: rows === null,
  };
}
